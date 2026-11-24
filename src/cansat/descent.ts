/**
 * Going up, and coming back down.
 *
 * The descent is where a CanSat is won or lost. Too small a parachute and it
 * hits hard enough to destroy the electronics and the data with it. Too large
 * and it drifts for kilometres and you spend the afternoon in somebody's field.
 *
 * Both failures are common, both are avoidable with arithmetic a student can
 * do, and both are far cheaper to discover here.
 */

import { densityKgM3, GRAVITY } from './atmosphere';

/** How the CanSat gets up there in the first place. */
export type LaunchMethod = 'drop' | 'balloon' | 'rocket';

export interface Parachute {
  /** Canopy diameter in metres. */
  diameterM: number;
  /**
   * Drag coefficient. A flat sheet is about 0.75; a proper domed canopy with a
   * spill hole is nearer 1.5. Most student chutes land around 1.0-1.2.
   */
  dragCoefficient: number;
  /** Height above ground at which it opens. 0 means straight after release. */
  deployAltitudeM: number;
}

export interface Vehicle {
  /** Total mass including batteries, in grams - the unit students weigh in. */
  massG: number;
  /** Cross-section of the bare can, used before the chute opens (m^2). */
  bodyAreaM2: number;
  parachute: Parachute | null;
}

/** A standard 330 ml drinks can, which is the usual CanSat envelope. */
export const CAN_BODY_AREA_M2 = Math.PI * Math.pow(0.033, 2); // ~66 mm diameter

export interface FlightProfile {
  method: LaunchMethod;
  /** Height the flight starts descending from, in metres above the ground. */
  releaseAltitudeM: number;
  /** Climb rate for a balloon, in m/s. Ignored for other methods. */
  ascentRateMS?: number;
}

/**
 * Terminal velocity: the speed at which drag balances weight.
 *
 * v = sqrt( 2mg / (rho * Cd * A) )
 *
 * Note the air density term. The same parachute falls much faster high up,
 * which is why a balloon payload drops alarmingly fast for the first part of
 * its descent and only slows near the ground.
 */
export function terminalVelocity(v: Vehicle, altitudeM: number): number {
  const massKg = v.massG / 1000;
  const rho = densityKgM3(altitudeM);
  const chuteOpen = v.parachute && altitudeM <= v.parachute.deployAltitudeM;

  const area = chuteOpen
    ? (Math.PI * Math.pow(v.parachute!.diameterM, 2)) / 4
    : v.bodyAreaM2;
  const cd = chuteOpen ? v.parachute!.dragCoefficient : 0.8; // tumbling can

  return Math.sqrt((2 * massKg * GRAVITY) / (rho * cd * area));
}

/** Impact speed at ground level - the number that decides if it survives. */
export function landingSpeed(v: Vehicle): number {
  return terminalVelocity(v, 0);
}

/**
 * Landing verdicts, from what actually happens to student hardware.
 *
 * Competition rules commonly ask for something near 5-11 m/s. Below about
 * 4 m/s the thing becomes a kite and drifts; above roughly 12 m/s you start
 * losing boards and batteries on impact.
 */
export type LandingOutcome = 'drifts' | 'good' | 'hard' | 'destroyed';

export function landingOutcome(speedMS: number): LandingOutcome {
  if (speedMS < 4) return 'drifts';
  if (speedMS <= 11) return 'good';
  if (speedMS <= 16) return 'hard';
  return 'destroyed';
}

/** Parachute diameter needed to hit a target landing speed. */
export function requiredChuteDiameter(
  massG: number,
  targetSpeedMS: number,
  dragCoefficient = 1.1,
): number {
  const massKg = massG / 1000;
  const rho = densityKgM3(0);
  const area =
    (2 * massKg * GRAVITY) / (rho * dragCoefficient * targetSpeedMS * targetSpeedMS);
  return Math.sqrt((4 * area) / Math.PI);
}

export interface FlightSample {
  /** Seconds since release. */
  t: number;
  altitudeM: number;
  /** Positive is upward (m/s). */
  verticalSpeedMS: number;
  ascending: boolean;
  chuteOpen: boolean;
  /** Horizontal drift from the launch point, in metres. */
  driftM: number;
}

export interface FlightResult {
  samples: FlightSample[];
  apogeeM: number;
  /** Total time from release to touchdown, in seconds. */
  durationS: number;
  descentDurationS: number;
  landingSpeedMS: number;
  outcome: LandingOutcome;
  /** How far away it lands - the recovery problem, in metres. */
  landingDistanceM: number;
  chuteDeployed: boolean;
}

/**
 * Fly the whole mission, step by step.
 *
 * Deliberately a simple explicit integration rather than anything clever: a
 * student should be able to read this and recognise the physics, and at these
 * timescales the error is far smaller than the uncertainty in their drag
 * coefficient anyway.
 */
export function simulateFlight(
  vehicle: Vehicle,
  profile: FlightProfile,
  windMS = 3,
  dt = 0.1,
): FlightResult {
  const samples: FlightSample[] = [];

  let t = 0;
  let altitude = profile.method === 'balloon' ? 0 : profile.releaseAltitudeM;
  let velocity = 0; // positive up
  let drift = 0;
  let apogee = altitude;
  let ascending = profile.method === 'balloon';
  let descentStart: number | null = ascending ? null : 0;
  let everDeployed = false;

  const maxSteps = 200000; // ~5.5 hours at 0.1 s, far beyond any real flight

  for (let i = 0; i < maxSteps; i++) {
    const chuteOpen =
      !ascending &&
      !!vehicle.parachute &&
      altitude <= vehicle.parachute.deployAltitudeM;
    if (chuteOpen) everDeployed = true;

    samples.push({
      t, altitudeM: altitude, verticalSpeedMS: velocity, ascending, chuteOpen, driftM: drift,
    });

    if (ascending) {
      // A balloon climbs at a near-constant rate until it bursts.
      const rate = profile.ascentRateMS ?? 5;
      velocity = rate;
      altitude += rate * dt;
      if (altitude >= profile.releaseAltitudeM) {
        ascending = false;
        descentStart = t;
        velocity = 0;
      }
    } else {
      // Gravity pulls down; drag always opposes whichever way it is moving.
      //
      //   a = -g - g * (v/vt) * |v/vt|
      //
      // Falling (v < 0) the drag term turns positive and cancels gravity
      // exactly at v = -vt, which is the definition of terminal velocity.
      const vt = terminalVelocity(vehicle, Math.max(0, altitude));
      const ratio = velocity / vt;
      const accel = -GRAVITY - GRAVITY * ratio * Math.abs(ratio);
      // Clamp so a coarse step can never overshoot terminal velocity.
      velocity = Math.max(-vt, velocity + accel * dt);
      altitude += velocity * dt;
    }

    if (altitude > apogee) apogee = altitude;
    // Wind pushes it sideways the entire time it is in the air.
    drift += windMS * dt;
    t += dt;

    if (!ascending && altitude <= 0) break;
  }

  const landing = landingSpeed(vehicle);
  return {
    samples,
    apogeeM: apogee,
    durationS: t,
    descentDurationS: descentStart === null ? t : t - descentStart,
    landingSpeedMS: landing,
    outcome: landingOutcome(landing),
    landingDistanceM: drift,
    chuteDeployed: everDeployed,
  };
}
