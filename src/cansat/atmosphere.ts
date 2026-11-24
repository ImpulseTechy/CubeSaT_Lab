/**
 * The air a CanSat falls through.
 *
 * This is the International Standard Atmosphere, the same model aviation and
 * weather balloons use. It matters here for two reasons that a student will
 * meet directly:
 *
 *   - A pressure sensor does not measure altitude. It measures pressure, and
 *     you convert. Getting that conversion right is the first real piece of
 *     science in a CanSat.
 *   - Air thins as you climb, so a parachute that works at 500 m barely slows
 *     you at 20 km. Students size chutes for sea level and are surprised.
 *
 * Valid to roughly 20 km, which covers every balloon and rocket CanSat flight.
 */

export const SEA_LEVEL_PRESSURE_PA = 101325;
export const SEA_LEVEL_TEMP_K = 288.15;
/** Temperature drops this fast with height in the troposphere (K per metre). */
export const LAPSE_RATE = 0.0065;
export const GRAVITY = 9.80665;
/** Specific gas constant for dry air (J/kg/K). */
export const R_AIR = 287.0528;
/** The troposphere ends here; above it temperature holds steady for a while. */
export const TROPOPAUSE_M = 11000;

const TROPOPAUSE_TEMP_K = SEA_LEVEL_TEMP_K - LAPSE_RATE * TROPOPAUSE_M; // 216.65 K
const TROPOPAUSE_PRESSURE_PA =
  SEA_LEVEL_PRESSURE_PA *
  Math.pow(TROPOPAUSE_TEMP_K / SEA_LEVEL_TEMP_K, GRAVITY / (R_AIR * LAPSE_RATE));

/** Air temperature at a given height above sea level (kelvin). */
export function temperatureK(altitudeM: number): number {
  if (altitudeM <= TROPOPAUSE_M) {
    return SEA_LEVEL_TEMP_K - LAPSE_RATE * altitudeM;
  }
  // Above the tropopause the standard atmosphere holds temperature constant
  // until about 20 km. This is why high-altitude balloon payloads sit at a
  // steady and brutal -56 C for most of the flight.
  return TROPOPAUSE_TEMP_K;
}

/** Air temperature in degrees Celsius, which is what a sensor reports. */
export function temperatureC(altitudeM: number): number {
  return temperatureK(altitudeM) - 273.15;
}

/** Air pressure at a given height (pascals). */
export function pressurePa(altitudeM: number): number {
  if (altitudeM <= TROPOPAUSE_M) {
    const t = temperatureK(altitudeM);
    return (
      SEA_LEVEL_PRESSURE_PA *
      Math.pow(t / SEA_LEVEL_TEMP_K, GRAVITY / (R_AIR * LAPSE_RATE))
    );
  }
  // Isothermal layer: pressure falls off exponentially instead.
  return (
    TROPOPAUSE_PRESSURE_PA *
    Math.exp((-GRAVITY * (altitudeM - TROPOPAUSE_M)) / (R_AIR * TROPOPAUSE_TEMP_K))
  );
}

/** Air density (kg/m^3) — this is what decides how well a parachute works. */
export function densityKgM3(altitudeM: number): number {
  return pressurePa(altitudeM) / (R_AIR * temperatureK(altitudeM));
}

/**
 * Height from pressure — the conversion a student has to write themselves.
 *
 * This is the inverse of `pressurePa`, and it is the single most common piece
 * of CanSat code. Worth knowing: it gives height above *sea level* assuming a
 * standard day. If the weather gives a different ground pressure, every reading
 * is offset, which is why real flights calibrate against ground level first.
 */
export function altitudeFromPressure(
  pa: number,
  groundPressurePa = SEA_LEVEL_PRESSURE_PA,
): number {
  const ratio = pa / groundPressurePa;
  const exponent = (R_AIR * LAPSE_RATE) / GRAVITY;
  return (SEA_LEVEL_TEMP_K / LAPSE_RATE) * (1 - Math.pow(ratio, exponent));
}

/** Speed of sound (m/s), for anyone curious how fast their rocket CanSat went. */
export function speedOfSound(altitudeM: number): number {
  return Math.sqrt(1.4 * R_AIR * temperatureK(altitudeM));
}
