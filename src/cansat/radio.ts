/**
 * Getting the data down — the LoRa link.
 *
 * The numbers here come from the Semtech SX127x datasheet, the chip in almost
 * every cheap LoRa module a student will buy. The spreading factor is the knob
 * nobody understands at first and everybody gets wrong:
 *
 *   SF7  — about 5.5 kbit/s, but gives up early as range grows
 *   SF12 — about 0.3 kbit/s, and reaches roughly five times further
 *
 * That is the same trade as the orbital simulator's link budget, met on a
 * footpath instead of at 525 km. Walk away from your CanSat with SF7 and the
 * packets stop; switch to SF12 and they come back, far slower.
 */

export type SpreadingFactor = 7 | 8 | 9 | 10 | 11 | 12;

/**
 * Receiver sensitivity in dBm at 125 kHz bandwidth, from the datasheet.
 * A signal weaker than this cannot be decoded at all.
 */
export const SENSITIVITY_DBM: Record<SpreadingFactor, number> = {
  7: -123, 8: -126, 9: -129, 10: -132, 11: -134.5, 12: -137,
};

export interface RadioConfig {
  /** Carrier frequency in MHz. Check what is licence-free where you are. */
  frequencyMHz: number;
  spreadingFactor: SpreadingFactor;
  /** Channel bandwidth in Hz. 125 kHz is the usual default. */
  bandwidthHz: number;
  /** Coding rate denominator: 5 means 4/5. Higher is more robust, slower. */
  codingRate: 4 | 5 | 6 | 7 | 8;
  /** Transmit power in dBm. Cheap modules do 14; 20 needs a better supply. */
  txPowerDbm: number;
  /** Antenna gain each end, in dBi. A bare wire whip is roughly 2. */
  txAntennaGainDbi: number;
  rxAntennaGainDbi: number;
}

export const DEFAULT_RADIO: RadioConfig = {
  frequencyMHz: 865.5,
  spreadingFactor: 9,
  bandwidthHz: 125000,
  codingRate: 5,
  txPowerDbm: 14,
  txAntennaGainDbi: 2,
  rxAntennaGainDbi: 2,
};

/**
 * Bits per second actually delivered.
 *
 *   Rb = SF * (BW / 2^SF) * (4 / codingRate)
 *
 * Doubling the spreading factor roughly halves the rate, which is why a
 * long-range setting feels so painfully slow.
 */
export function bitrateBps(r: RadioConfig): number {
  return (
    r.spreadingFactor *
    (r.bandwidthHz / Math.pow(2, r.spreadingFactor)) *
    (4 / r.codingRate)
  );
}

/**
 * Free-space path loss in dB.
 *
 *   FSPL = 20*log10(d_km) + 20*log10(f_MHz) + 32.45
 *
 * This is the same equation as the orbital link budget. Only the distances
 * differ — hundreds of metres instead of hundreds of kilometres.
 */
export function pathLossDb(distanceM: number, frequencyMHz: number): number {
  const km = Math.max(distanceM, 1) / 1000;
  return 20 * Math.log10(km) + 20 * Math.log10(frequencyMHz) + 32.45;
}

/** Signal strength arriving at the receiver, in dBm. */
export function receivedPowerDbm(
  r: RadioConfig,
  distanceM: number,
  extraLossDb = 0,
): number {
  return (
    r.txPowerDbm +
    r.txAntennaGainDbi +
    r.rxAntennaGainDbi -
    pathLossDb(distanceM, r.frequencyMHz) -
    extraLossDb
  );
}

/** How much signal is to spare. Below zero, nothing gets through. */
export function linkMarginDb(
  r: RadioConfig,
  distanceM: number,
  extraLossDb = 0,
): number {
  return (
    receivedPowerDbm(r, distanceM, extraLossDb) -
    SENSITIVITY_DBM[r.spreadingFactor]
  );
}

/**
 * The furthest the link still works, in metres.
 *
 * Solved from the link budget rather than stepped, so it is exact for the
 * model. Real range is always worse: trees, buildings, a damp antenna, and
 * the ground itself all eat into it, which is what `extraLossDb` is for.
 */
export function maxRangeM(r: RadioConfig, extraLossDb = 0): number {
  const budget =
    r.txPowerDbm +
    r.txAntennaGainDbi +
    r.rxAntennaGainDbi -
    SENSITIVITY_DBM[r.spreadingFactor] -
    extraLossDb;
  // budget = 20*log10(km) + 20*log10(MHz) + 32.45, solved for km
  const logKm = (budget - 20 * Math.log10(r.frequencyMHz) - 32.45) / 20;
  return Math.pow(10, logKm) * 1000;
}

/** How long one packet takes to send, in seconds. */
export function airtimeS(r: RadioConfig, payloadBytes: number): number {
  return (payloadBytes * 8) / bitrateBps(r);
}

/**
 * Can this radio keep up with how often you are sending?
 *
 * The mistake every first-time student makes: a one-second loop sending a
 * 60-byte packet at SF12 needs 1.6 seconds of airtime. Packets queue up, the
 * buffer overflows, and telemetry arrives further and further behind reality.
 */
export function keepsUp(
  r: RadioConfig,
  payloadBytes: number,
  intervalS: number,
): { ok: boolean; airtimeS: number; dutyCycle: number } {
  const air = airtimeS(r, payloadBytes);
  return { ok: air < intervalS, airtimeS: air, dutyCycle: air / intervalS };
}

/**
 * Why the same radio reaches 600 km from a balloon and 3 km across a field.
 *
 * Free-space path loss assumes nothing is in the way. That is nearly true for
 * a CanSat hanging under a balloon with clear line of sight — LoRa records
 * from high-altitude balloons genuinely exceed 700 km.
 *
 * It is badly wrong at ground level. Trees, buildings, the curve of the Earth
 * and the ground itself absorbing part of the beam all add loss that free
 * space does not account for. A student who walks away from their CanSat with
 * it sitting on the grass will lose the link after a few hundred metres and
 * conclude the module is broken. It is not: the model they read about assumed
 * a clear path they do not have.
 *
 * These are typical excess losses over free space, for teaching the difference.
 */
export const EXCESS_LOSS_DB = {
  /** Flying, clear view of the ground station. Close to pure free space. */
  flying: 0,
  /** Antenna held up, open field, nothing between you and it. */
  openField: 15,
  /** Across a park with some trees. */
  trees: 30,
  /** Suburban, buildings in the way. */
  builtUp: 45,
} as const;

export type Environment = keyof typeof EXCESS_LOSS_DB;

/** Realistic range in a given setting, rather than the free-space ideal. */
export function rangeInEnvironment(r: RadioConfig, env: Environment): number {
  return maxRangeM(r, EXCESS_LOSS_DB[env]);
}

export interface LinkSample {
  distanceM: number;
  marginDb: number;
  received: boolean;
}

/** Work out which packets would actually arrive across a whole flight. */
export function linkOverFlight(
  r: RadioConfig,
  distances: number[],
  extraLossDb = 0,
): LinkSample[] {
  return distances.map((d) => {
    const marginDb = linkMarginDb(r, d, extraLossDb);
    return { distanceM: d, marginDb, received: marginDb >= 0 };
  });
}

/**
 * Where a CanSat actually is relative to the ground station.
 *
 * Students forget this: the radio does not care about altitude, it cares about
 * straight-line distance. A CanSat 1 km up and 800 m downwind is 1.28 km away,
 * not 1 km.
 */
export function slantDistanceM(altitudeM: number, groundDistanceM: number): number {
  return Math.sqrt(altitudeM * altitudeM + groundDistanceM * groundDistanceM);
}
