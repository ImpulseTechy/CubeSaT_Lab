/**
 * What the sensors actually report — which is not what is actually true.
 *
 * This is the module that teaches the hardest lesson in the whole project:
 * a sensor is not a window onto reality. It is a component with noise, limits,
 * a warm-up time and failure modes, and your code has to cope with all of it.
 *
 * Specifications come from the datasheets of the parts students actually buy:
 * the BMP280 pressure sensor, the MPU6050 motion sensor, and the NEO-6M GPS.
 */

import { pressurePa, temperatureC } from './atmosphere';

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

/**
 * A seeded generator, so every flight is repeatable.
 *
 * Noise has to look random but behave the same way twice: a student who gets
 * a confusing reading needs to be able to run the flight again and see it
 * happen in exactly the same place.
 */
export function makeRandom(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    // xorshift32 - small, fast, and good enough for sensor noise
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

/** Normally distributed noise, via Box-Muller. */
export function gaussian(rand: () => number, sigma: number): number {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}

// ---------------------------------------------------------------------------
// What can go wrong
// ---------------------------------------------------------------------------

/**
 * Faults a student can arm before a flight, each one a real thing that
 * happens on real hardware.
 */
export interface Faults {
  /** Wrong I2C address, so the sensor never responds. Reads stay at zero. */
  pressureSensorNotFound: boolean;
  /** Sensor read before it has settled, giving nonsense for the first seconds. */
  skipWarmUp: boolean;
  /**
   * GPS left in its default mode. It stops reporting above 18 km, because
   * export rules require receivers to refuse to work at missile-like
   * altitude and speed unless put into a flight dynamic model first.
   */
  gpsDefaultDynamicModel: boolean;
  /** Logging without ever flushing, so the file is empty after landing. */
  neverFlushSdCard: boolean;
  /** Battery not charged before flight. */
  batteryHalfCharged: boolean;
}

export const NO_FAULTS: Faults = {
  pressureSensorNotFound: false,
  skipWarmUp: false,
  gpsDefaultDynamicModel: false,
  neverFlushSdCard: false,
  batteryHalfCharged: false,
};

// ---------------------------------------------------------------------------
// Pressure and temperature: the BMP280
// ---------------------------------------------------------------------------

/** Datasheet figures for the BMP280. */
export const BMP280 = {
  /** Absolute pressure accuracy, in pascals (±1 hPa). */
  pressureNoisePa: 100,
  /** Temperature accuracy in degrees C (±0.5 at room temperature). */
  tempNoiseC: 0.5,
  /** Smallest change it can report. */
  pressureResolutionPa: 0.16,
  tempResolutionC: 0.01,
  /** Below this it stops being trustworthy - and balloons go far colder. */
  minOperatingC: -40,
  /** How long after power-on before readings settle, in seconds. */
  warmUpS: 2,
};

export interface PressureReading {
  pressurePa: number;
  temperatureC: number;
  /** False when the sensor did not respond at all. */
  valid: boolean;
  /** True when the reading is outside the sensor's rated range. */
  outOfRange: boolean;
}

export function readPressureSensor(
  trueAltitudeM: number,
  elapsedS: number,
  faults: Faults,
  rand: () => number,
): PressureReading {
  if (faults.pressureSensorNotFound) {
    // A sensor that never answered reads as zero, every single time. Students
    // see a flat line at 0 and assume the code is wrong.
    return { pressurePa: 0, temperatureC: 0, valid: false, outOfRange: false };
  }

  const settling = !faults.skipWarmUp ? false : elapsedS < BMP280.warmUpS;
  const truePa = pressurePa(trueAltitudeM);
  const trueC = temperatureC(trueAltitudeM);

  // During warm-up the readings are real but wildly off.
  const wobble = settling ? 4000 : 0;

  const quantise = (v: number, step: number) => Math.round(v / step) * step;

  return {
    pressurePa: quantise(
      truePa + gaussian(rand, BMP280.pressureNoisePa) + gaussian(rand, wobble),
      BMP280.pressureResolutionPa,
    ),
    temperatureC: quantise(
      trueC + gaussian(rand, BMP280.tempNoiseC),
      BMP280.tempResolutionC,
    ),
    valid: true,
    outOfRange: trueC < BMP280.minOperatingC,
  };
}

// ---------------------------------------------------------------------------
// Motion: the MPU6050
// ---------------------------------------------------------------------------

export const MPU6050 = {
  /** Acceleration noise in m/s^2. */
  accelNoise: 0.08,
  /** Rotation rate noise in degrees per second. */
  gyroNoise: 0.5,
  /** Gyros drift. This is why they cannot be trusted on their own. */
  gyroDriftPerS: 0.02,
  /** Saturates past this; a hard chute opening can exceed it. */
  maxAccelG: 16,
};

export interface MotionReading {
  /** Vertical acceleration in m/s^2, including gravity. */
  accelZ: number;
  /** Rotation rate about the vertical axis, degrees/s. */
  gyroZ: number;
  /** True when the real value exceeded what the sensor can measure. */
  clipped: boolean;
}

export function readMotionSensor(
  trueAccel: number,
  trueSpin: number,
  elapsedS: number,
  rand: () => number,
): MotionReading {
  const limit = MPU6050.maxAccelG * 9.80665;
  const clipped = Math.abs(trueAccel) > limit;
  const measured = Math.max(-limit, Math.min(limit, trueAccel));
  return {
    accelZ: measured + gaussian(rand, MPU6050.accelNoise),
    // Drift grows with time, which is the whole problem with gyros.
    gyroZ:
      trueSpin +
      gaussian(rand, MPU6050.gyroNoise) +
      MPU6050.gyroDriftPerS * elapsedS,
    clipped,
  };
}

// ---------------------------------------------------------------------------
// Position: the NEO-6M GPS
// ---------------------------------------------------------------------------

export const NEO6M = {
  /** Typical horizontal accuracy, in metres. */
  accuracyM: 2.5,
  /** Seconds to first fix from cold, with a clear sky. */
  coldStartS: 27,
  /**
   * Export rules require receivers to stop reporting above this altitude
   * unless configured for airborne use. Balloon teams discover this the hard
   * way, at exactly the moment the data gets interesting.
   */
  defaultCeilingM: 18000,
  /** With the airborne dynamic model set, it keeps working this high. */
  airborneCeilingM: 50000,
};

export interface GpsReading {
  hasFix: boolean;
  altitudeM: number;
  /** Metres from the launch point. */
  distanceM: number;
  /** Satellites in view. Fewer than four means no usable fix. */
  satellites: number;
}

export function readGps(
  trueAltitudeM: number,
  trueDistanceM: number,
  elapsedS: number,
  faults: Faults,
  rand: () => number,
): GpsReading {
  const ceiling = faults.gpsDefaultDynamicModel
    ? NEO6M.defaultCeilingM
    : NEO6M.airborneCeilingM;

  const acquired = elapsedS >= NEO6M.coldStartS;
  const withinCeiling = trueAltitudeM <= ceiling;
  const hasFix = acquired && withinCeiling;

  if (!hasFix) {
    return {
      hasFix: false, altitudeM: 0, distanceM: 0,
      satellites: acquired ? 0 : Math.floor(rand() * 4),
    };
  }

  return {
    hasFix: true,
    // GPS altitude is noticeably worse than its horizontal accuracy.
    altitudeM: trueAltitudeM + gaussian(rand, NEO6M.accuracyM * 1.6),
    distanceM: Math.max(0, trueDistanceM + gaussian(rand, NEO6M.accuracyM)),
    satellites: 5 + Math.floor(rand() * 7),
  };
}
