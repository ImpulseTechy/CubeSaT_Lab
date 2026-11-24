/**
 * The whole mission.
 *
 * These tests are really a specification of what the simulator must teach:
 * every one of them is a mistake a student makes, and the test asserts that
 * making it produces the consequence it produces in real life.
 */

import { describe, expect, it } from 'vitest';
import { defaultMission, flyMission, type MissionConfig } from './mission';
import { powerBudget, BATTERIES, electronicsMassG } from './power';
import { makeRandom, gaussian, NO_FAULTS } from './sensors';

const mission = (patch: Partial<MissionConfig> = {}): MissionConfig => ({
  ...defaultMission(), ...patch,
});

describe('a well-built CanSat gets its data home', () => {
  const r = flyMission(mission());

  it('flies, lands safely and reports no problems', () => {
    expect(r.outcome).toBe('good');
    expect(r.problems).toEqual([]);
  });

  it('sends packets the whole way down', () => {
    expect(r.sent.length).toBeGreaterThan(50);
    expect(r.deliveryRate).toBeGreaterThan(0.9);
  });

  it('keeps the battery alive to touchdown', () => {
    expect(r.batteryDiedAtS).toBeNull();
    expect(r.truth[r.truth.length - 1].batterySoC).toBeGreaterThan(0);
  });

  it('saves everything to the card as well as sending it', () => {
    expect(r.recoveredOnCard.length).toBe(r.sent.length);
  });

  it('computes altitude close to the truth, but not exactly', () => {
    const mid = r.received[Math.floor(r.received.length / 2)];
    const truth = r.truth.find((t) => t.t === mid.t)!;
    // Within a few tens of metres: sensor noise is real and visible.
    expect(Math.abs(mid.computedAltitudeM - truth.altitudeM)).toBeLessThan(60);
    expect(mid.computedAltitudeM).not.toBe(truth.altitudeM);
  });
});

describe('the mistakes, and what each one costs', () => {
  it('a sensor at the wrong address gives a flat line at zero', () => {
    const r = flyMission(mission({
      faults: { ...NO_FAULTS, pressureSensorNotFound: true },
    }));
    expect(r.sent.every((p) => p.pressure.pressurePa === 0)).toBe(true);
    expect(r.sent.every((p) => p.computedAltitudeM === 0)).toBe(true);
    expect(r.problems.join(' ')).toMatch(/never answered/);
  });

  it('never flushing the card loses everything, even though it flew perfectly', () => {
    const r = flyMission(mission({
      faults: { ...NO_FAULTS, neverFlushSdCard: true },
    }));
    expect(r.outcome).toBe('good');          // the flight was fine
    expect(r.recoveredOnCard).toHaveLength(0); // the data is gone
    expect(r.problems.join(' ')).toMatch(/Nothing was written/);
  });

  it('a half-charged battery dies partway down', () => {
    const r = flyMission(mission({
      battery: BATTERIES.lipo500,
      faults: { ...NO_FAULTS, batteryHalfCharged: true },
      usage: [
        { componentId: 'nano', dutyCycle: 1 },
        { componentId: 'lora', dutyCycle: 1 },
        { componentId: 'gps', dutyCycle: 1 },
        { componentId: 'sdcard', dutyCycle: 1 },
      ],
      profile: { method: 'balloon', releaseAltitudeM: 20000, ascentRateMS: 5 },
    }));
    expect(r.batteryDiedAtS).not.toBeNull();
    expect(r.problems.join(' ')).toMatch(/battery ran out/);
  });

  it('asking the radio to send faster than it can sends far less', () => {
    const slow = flyMission(mission({
      radio: { ...defaultMission().radio, spreadingFactor: 12 },
      packetBytes: 80,
      telemetryIntervalS: 0.5,
    }));
    expect(slow.problems.join(' ')).toMatch(/cannot keep up/);
    const fast = flyMission(mission({ telemetryIntervalS: 0.5 }));
    expect(slow.sent.length).toBeLessThan(fast.sent.length / 2);
  });

  it('no parachute destroys it, and takes the card with it', () => {
    const r = flyMission(mission({
      vehicle: { ...defaultMission().vehicle, parachute: null },
    }));
    expect(r.outcome).toBe('destroyed');
    expect(r.recoveredOnCard).toHaveLength(0);
    expect(r.problems.join(' ')).toMatch(/did not survive/);
  });

  it('too big a chute means a long walk', () => {
    const r = flyMission(mission({
      vehicle: {
        ...defaultMission().vehicle,
        parachute: { diameterM: 1.5, dragCoefficient: 1.1, deployAltitudeM: 10000 },
      },
      windMS: 8,
    }));
    expect(r.outcome).toBe('drifts');
    expect(r.landingDistanceM).toBeGreaterThan(1000);
  });

  it('the GPS quits above 18 km if its flight mode was never set', () => {
    const r = flyMission(mission({
      profile: { method: 'balloon', releaseAltitudeM: 25000, ascentRateMS: 5 },
      faults: { ...NO_FAULTS, gpsDefaultDynamicModel: true },
      battery: BATTERIES.lipo2000,
    }));
    const high = r.sent.filter((p) => p.computedAltitudeM > 18500);
    expect(high.length).toBeGreaterThan(0);
    expect(high.every((p) => !p.gps.hasFix)).toBe(true);
    expect(r.problems.join(' ')).toMatch(/18 km/);
  });

  it('the GPS keeps working all the way up once flight mode is set', () => {
    const r = flyMission(mission({
      profile: { method: 'balloon', releaseAltitudeM: 25000, ascentRateMS: 5 },
      battery: BATTERIES.lipo2000,
    }));
    const high = r.sent.filter((p) => p.computedAltitudeM > 20000);
    expect(high.some((p) => p.gps.hasFix)).toBe(true);
  });
});

describe('the link behaves like a real one', () => {
  it('drifting far downwind eventually breaks the link', () => {
    const r = flyMission(mission({
      profile: { method: 'balloon', releaseAltitudeM: 20000, ascentRateMS: 5 },
      radio: { ...defaultMission().radio, spreadingFactor: 7, txPowerDbm: 2 },
      battery: BATTERIES.lipo2000,
      windMS: 20,
    }));
    expect(r.deliveryRate).toBeLessThan(1);
    expect(r.sent.some((p) => !p.received)).toBe(true);
  });

  it('a slower spreading factor rescues a link that was failing', () => {
    const base = { ...defaultMission().radio, txPowerDbm: 2 };
    const common = {
      profile: { method: 'balloon' as const, releaseAltitudeM: 20000, ascentRateMS: 5 },
      battery: BATTERIES.lipo2000,
      windMS: 20,
      telemetryIntervalS: 3,
    };
    const fast = flyMission(mission({ ...common, radio: { ...base, spreadingFactor: 7 } }));
    const slow = flyMission(mission({ ...common, radio: { ...base, spreadingFactor: 12 } }));
    expect(slow.deliveryRate).toBeGreaterThan(fast.deliveryRate);
  });
});

describe('truth and data are kept apart', () => {
  it('records what really happened as well as what was measured', () => {
    const r = flyMission(mission());
    expect(r.truth.length).toBeGreaterThan(r.sent.length);
    // The truth has no noise in it; the packets do.
    expect(r.truth[0].altitudeM).toBe(1000);
  });

  it('what arrived is never more than what was sent', () => {
    const r = flyMission(mission({ windMS: 15 }));
    expect(r.received.length).toBeLessThanOrEqual(r.sent.length);
  });

  it('the same seed gives the same flight twice', () => {
    const a = flyMission(mission({ seed: 42 }));
    const b = flyMission(mission({ seed: 42 }));
    expect(a.sent.map((p) => p.pressure.pressurePa))
      .toEqual(b.sent.map((p) => p.pressure.pressurePa));
  });

  it('a different seed gives different noise but the same flight path', () => {
    const a = flyMission(mission({ seed: 1 }));
    const b = flyMission(mission({ seed: 2 }));
    expect(a.sent[5].pressure.pressurePa).not.toBe(b.sent[5].pressure.pressurePa);
    expect(a.apogeeM).toBe(b.apogeeM);
  });
});

describe('the power budget', () => {
  it('names the biggest draw, which is almost always the radio', () => {
    const b = powerBudget(
      [
        { componentId: 'nano', dutyCycle: 1 },
        { componentId: 'lora', dutyCycle: 0.5 },
        { componentId: 'bmp280', dutyCycle: 1 },
      ],
      BATTERIES.lipo1000, 600,
    );
    expect(b.breakdown[0].name).toMatch(/LoRa/);
    expect(b.lastsTheFlight).toBe(true);
  });

  it('only counts 80% of the printed capacity', () => {
    const b = powerBudget([{ componentId: 'nano', dutyCycle: 1 }], BATTERIES.lipo1000, 60);
    // 1000 mAh * 0.8 / 19 mA = 42 hours
    expect(b.enduranceMin).toBeCloseTo((1000 * 0.8 / 19) * 60, 0);
  });

  it('a small battery covers a short flight even transmitting constantly', () => {
    // 200 mA from 400 mAh usable is about two hours - plenty for a drop test.
    const b = powerBudget(
      [{ componentId: 'lora', dutyCycle: 1 }, { componentId: 'esp32', dutyCycle: 1 }],
      BATTERIES.lipo500, 3600,
    );
    expect(b.averageMA).toBeCloseTo(200, 0);
    expect(b.enduranceMin).toBeCloseTo(120, 0);
    expect(b.lastsTheFlight).toBe(true);
  });

  it('but the same setup dies on a long balloon flight', () => {
    // Balloons routinely stay up for three or four hours once drift is
    // counted, which is where constant transmission catches teams out.
    const b = powerBudget(
      [{ componentId: 'lora', dutyCycle: 1 }, { componentId: 'esp32', dutyCycle: 1 }],
      BATTERIES.lipo500, 4 * 3600,
    );
    expect(b.lastsTheFlight).toBe(false);
    expect(b.marginFraction).toBeLessThan(0);
  });

  it('sending less often is what fixes it', () => {
    const b = powerBudget(
      [{ componentId: 'lora', dutyCycle: 0.1 }, { componentId: 'esp32', dutyCycle: 1 }],
      BATTERIES.lipo500, 4 * 3600,
    );
    expect(b.lastsTheFlight).toBe(true);
  });

  it('adds up the mass, which then decides the parachute', () => {
    const m = electronicsMassG(
      [
        { componentId: 'nano', dutyCycle: 1 },
        { componentId: 'lora', dutyCycle: 1 },
        { componentId: 'gps', dutyCycle: 1 },
      ],
      BATTERIES.lipo1000,
    );
    expect(m).toBe(7 + 5 + 12 + 20);
  });
});

describe('noise is believable', () => {
  it('averages out to roughly nothing over many samples', () => {
    const rand = makeRandom(7);
    let sum = 0;
    for (let i = 0; i < 5000; i++) sum += gaussian(rand, 1);
    expect(Math.abs(sum / 5000)).toBeLessThan(0.1);
  });

  it('has roughly the spread it was asked for', () => {
    const rand = makeRandom(9);
    const xs = Array.from({ length: 5000 }, () => gaussian(rand, 2));
    const mean = xs.reduce((a, b) => a + b) / xs.length;
    const sd = Math.sqrt(
      xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length,
    );
    expect(sd).toBeGreaterThan(1.7);
    expect(sd).toBeLessThan(2.3);
  });
});
