/**
 * One complete CanSat flight.
 *
 * This is where everything meets: the CanSat falls, the sensors report what
 * they can, the radio delivers what fits, the battery drains, and at the end
 * you find out what you actually got back.
 *
 * The important design choice is that **the truth and the data are kept
 * separate**. Every step records both what really happened and what the
 * student would have on their laptop. The gap between those two is the entire
 * lesson — and it is the thing a real flight can never show you, because on a
 * real flight you only ever get the second one.
 */

import { simulateFlight, type FlightProfile, type Vehicle } from './descent';
import {
  linkMarginDb, slantDistanceM, airtimeS, type RadioConfig,
} from './radio';
import { powerBudget, stateOfCharge, type Battery, type Usage } from './power';
import {
  makeRandom, readGps, readMotionSensor, readPressureSensor,
  type Faults, type GpsReading, type MotionReading, type PressureReading,
} from './sensors';
import { altitudeFromPressure } from './atmosphere';

export interface MissionConfig {
  vehicle: Vehicle;
  profile: FlightProfile;
  radio: RadioConfig;
  battery: Battery;
  usage: Usage[];
  faults: Faults;
  /** How often the CanSat sends a packet, in seconds. */
  telemetryIntervalS: number;
  /** Size of each telemetry packet, in bytes. */
  packetBytes: number;
  windMS: number;
  /** Same seed means the same flight, every time. */
  seed: number;
}

/** What really happened, at one instant. */
export interface Truth {
  t: number;
  altitudeM: number;
  verticalSpeedMS: number;
  groundDistanceM: number;
  slantDistanceM: number;
  chuteOpen: boolean;
  batterySoC: number;
}

/** What the CanSat measured and tried to send. */
export interface Packet {
  t: number;
  pressure: PressureReading;
  motion: MotionReading;
  gps: GpsReading;
  /** Altitude as the student's own code would compute it from pressure. */
  computedAltitudeM: number;
  /** Did this packet reach the ground station? */
  received: boolean;
  linkMarginDb: number;
}

export interface MissionResult {
  truth: Truth[];
  /** Every packet the CanSat tried to send. */
  sent: Packet[];
  /** Only the ones that arrived - what the student actually has. */
  received: Packet[];
  /** What was written to the SD card and survived the landing. */
  recoveredOnCard: Packet[];

  apogeeM: number;
  durationS: number;
  landingSpeedMS: number;
  landingDistanceM: number;
  outcome: ReturnType<typeof import('./descent').landingOutcome>;

  /** Fraction of packets that made it home. */
  deliveryRate: number;
  /** Second at which the battery ran out, or null if it lasted. */
  batteryDiedAtS: number | null;
  /** Second the radio link was lost for good, or null. */
  linkLostAtS: number | null;

  problems: string[];
}

export function flyMission(cfg: MissionConfig): MissionResult {
  const rand = makeRandom(cfg.seed);
  const flight = simulateFlight(cfg.vehicle, cfg.profile, cfg.windMS);
  const budget = powerBudget(
    cfg.usage,
    cfg.battery,
    flight.durationS,
    cfg.faults.batteryHalfCharged ? 0.5 : 1,
  );

  const truth: Truth[] = [];
  const sent: Packet[] = [];
  let batteryDiedAtS: number | null = null;
  let linkLostAtS: number | null = null;
  let nextSendT = 0;

  const airtime = airtimeS(cfg.radio, cfg.packetBytes);
  const radioOverloaded = airtime >= cfg.telemetryIntervalS;

  for (const s of flight.samples) {
    const soc = stateOfCharge(
      budget, cfg.battery, s.t, cfg.faults.batteryHalfCharged ? 0.5 : 1,
    );
    if (soc <= 0 && batteryDiedAtS === null) batteryDiedAtS = s.t;

    const ground = s.driftM;
    const slant = slantDistanceM(Math.max(0, s.altitudeM), ground);

    truth.push({
      t: s.t,
      altitudeM: s.altitudeM,
      verticalSpeedMS: s.verticalSpeedMS,
      groundDistanceM: ground,
      slantDistanceM: slant,
      chuteOpen: s.chuteOpen,
      batterySoC: soc,
    });

    // Dead battery means no more packets, ever.
    if (soc <= 0) continue;
    if (s.t < nextSendT) continue;
    // A radio that cannot keep up simply sends less often than asked.
    nextSendT = s.t + Math.max(cfg.telemetryIntervalS, airtime);

    const pressure = readPressureSensor(
      Math.max(0, s.altitudeM), s.t, cfg.faults, rand,
    );
    const accel = -9.80665 + (s.chuteOpen ? 12 : 0);
    const motion = readMotionSensor(accel, s.chuteOpen ? 30 : 120, s.t, rand);
    const gps = readGps(Math.max(0, s.altitudeM), ground, s.t, cfg.faults, rand);

    const margin = linkMarginDb(cfg.radio, slant);
    const received = margin >= 0;
    if (!received && linkLostAtS === null && s.t > 5) linkLostAtS = s.t;
    if (received) linkLostAtS = null; // it came back

    sent.push({
      t: s.t,
      pressure,
      motion,
      gps,
      // The student's own conversion, applied to the noisy reading.
      computedAltitudeM: pressure.valid
        ? altitudeFromPressure(pressure.pressurePa)
        : 0,
      received,
      linkMarginDb: margin,
    });
  }

  const received = sent.filter((p) => p.received);
  // An unflushed file loses everything still sitting in the buffer, which in
  // practice means everything - the card is empty when you open it.
  const recoveredOnCard = cfg.faults.neverFlushSdCard
    ? []
    : flight.outcome === 'destroyed'
      ? []
      : sent;

  const problems: string[] = [];
  if (cfg.faults.pressureSensorNotFound) {
    problems.push(
      'The pressure sensor never answered. Every reading is zero, so there is no altitude data at all. Check the wiring and the I2C address.',
    );
  }
  if (radioOverloaded) {
    problems.push(
      `Each packet takes ${airtime.toFixed(2)} s to send but you asked for one every ${cfg.telemetryIntervalS} s. The radio cannot keep up, so packets go out far less often than you think.`,
    );
  }
  if (batteryDiedAtS !== null) {
    problems.push(
      `The battery ran out ${batteryDiedAtS.toFixed(0)} s into a ${flight.durationS.toFixed(0)} s flight. Everything after that is lost.`,
    );
  }
  if (cfg.faults.neverFlushSdCard) {
    problems.push(
      'Nothing was written to the card. Data sat in the buffer waiting to be flushed, and the power cut at landing took it with it.',
    );
  }
  if (flight.outcome === 'destroyed') {
    problems.push(
      `It hit the ground at ${flight.landingSpeedMS.toFixed(1)} m/s. The electronics did not survive, and neither did the card.`,
    );
  }
  if (flight.outcome === 'drifts') {
    problems.push(
      `The chute is too big. It came down at ${flight.landingSpeedMS.toFixed(1)} m/s and drifted ${(flight.landingDistanceM / 1000).toFixed(1)} km downwind.`,
    );
  }
  if (cfg.faults.gpsDefaultDynamicModel && flight.apogeeM > 18000) {
    problems.push(
      'The GPS stopped reporting above 18 km. It needs its airborne mode set before flight, or it refuses to work at altitude.',
    );
  }
  if (!flight.chuteDeployed && cfg.vehicle.parachute) {
    problems.push('The parachute never opened. Check the deployment height.');
  }

  return {
    truth, sent, received, recoveredOnCard,
    apogeeM: flight.apogeeM,
    durationS: flight.durationS,
    landingSpeedMS: flight.landingSpeedMS,
    landingDistanceM: flight.landingDistanceM,
    outcome: flight.outcome,
    deliveryRate: sent.length ? received.length / sent.length : 0,
    batteryDiedAtS,
    linkLostAtS,
    problems,
  };
}

/** A sensible starting mission, for the first level. */
export function defaultMission(): MissionConfig {
  return {
    vehicle: {
      massG: 330,
      bodyAreaM2: Math.PI * Math.pow(0.033, 2),
      parachute: { diameterM: 0.5, dragCoefficient: 1.1, deployAltitudeM: 10000 },
    },
    profile: { method: 'drop', releaseAltitudeM: 1000 },
    radio: {
      frequencyMHz: 865.5, spreadingFactor: 9, bandwidthHz: 125000,
      codingRate: 5, txPowerDbm: 14, txAntennaGainDbi: 2, rxAntennaGainDbi: 2,
    },
    battery: { name: '1000 mAh LiPo', capacityMAh: 1000, voltageV: 3.7, massG: 20 },
    usage: [
      { componentId: 'nano', dutyCycle: 1 },
      { componentId: 'bmp280', dutyCycle: 1 },
      { componentId: 'sdcard', dutyCycle: 0.1 },
      { componentId: 'lora', dutyCycle: 0.1 },
    ],
    faults: {
      pressureSensorNotFound: false,
      skipWarmUp: false,
      gpsDefaultDynamicModel: false,
      neverFlushSdCard: false,
      batteryHalfCharged: false,
    },
    telemetryIntervalS: 1,
    packetBytes: 40,
    windMS: 3,
    seed: 1,
  };
}
