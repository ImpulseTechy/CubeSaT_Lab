/**
 * Physical and standards constants.
 *
 * Every value here is cited. If a number appears anywhere else in the engine
 * without passing through this file, that is a bug.
 */

// ---------------------------------------------------------------------------
// Astrodynamics
// ---------------------------------------------------------------------------

/** Earth gravitational parameter (km^3/s^2). WGS-84 / EGM-96. */
export const MU_EARTH = 398600.4418;

/** Earth equatorial radius (km). WGS-84. */
export const R_EARTH = 6378.137;

/** Earth mean radius (km). */
export const R_EARTH_MEAN = 6371.0088;

/** Earth rotation rate (rad/s). */
export const OMEGA_EARTH = 7.2921159e-5;

/** Second zonal harmonic. */
export const J2 = 1.08262668e-3;

/** Speed of light (m/s). Exact by definition. */
export const C_LIGHT = 299792458;

/** Boltzmann constant in dB (10*log10(k), k = 1.380649e-23 J/K). */
export const BOLTZMANN_DBW = -228.6;

// ---------------------------------------------------------------------------
// Space environment
// ---------------------------------------------------------------------------

/**
 * Solar constant at 1 AU (W/m^2). Mean total solar irradiance.
 * Seasonal range is roughly 1318-1422 W/m^2 (perihelion/aphelion).
 */
export const SOLAR_CONSTANT = 1361;

/** Solar irradiance bounds across the year (W/m^2), for hot/cold cases. */
export const SOLAR_CONSTANT_MIN = 1318;
export const SOLAR_CONSTANT_MAX = 1422;

// ---------------------------------------------------------------------------
// CubeSat Design Specification Rev. 14.1 (Cal Poly, February 2022)
// ---------------------------------------------------------------------------

/**
 * Maximum mass per form factor (kg), CDS Rev. 14.1.
 *
 * Rev. 14 raised the allowance to 2.00 kg/U. Much older literature still quotes
 * 1.33 kg for a 1U, which comes from Rev. 13 and earlier - we show both in the
 * UI so learners recognise the figure when they meet it elsewhere.
 *
 * A launch provider's dispenser ICD always supersedes these generic tables.
 */
export const CDS_MAX_MASS_KG: Record<FormFactor, number> = {
  '1U': 2.0,
  '1.5U': 3.0,
  '2U': 4.0,
  '3U': 6.0,
  '6U': 12.0,
};

/** Legacy pre-Rev.14 1U allowance (kg), shown for context only. */
export const CDS_LEGACY_1U_MASS_KG = 1.33;

export type FormFactor = '1U' | '1.5U' | '2U' | '3U' | '6U';

export const FORM_FACTORS: FormFactor[] = ['1U', '1.5U', '2U', '3U', '6U'];

/** Number of standard 1U units in each form factor. */
export const FORM_FACTOR_UNITS: Record<FormFactor, number> = {
  '1U': 1,
  '1.5U': 1.5,
  '2U': 2,
  '3U': 3,
  '6U': 6,
};

/**
 * External body dimensions (mm), CDS Rev. 14.1.
 * A 1U is 100.0 x 100.0 x 113.5 mm; the 113.5 mm axis is the rail direction.
 */
export const FORM_FACTOR_DIMS_MM: Record<
  FormFactor,
  { x: number; y: number; z: number }
> = {
  '1U': { x: 100, y: 100, z: 113.5 },
  '1.5U': { x: 100, y: 100, z: 170.2 },
  '2U': { x: 100, y: 100, z: 227.0 },
  '3U': { x: 100, y: 100, z: 340.5 },
  '6U': { x: 100, y: 226.3, z: 340.5 },
};

export const CDS_SOURCE =
  'Cal Poly CubeSat Design Specification Rev. 14.1 (2022-02-09)';

// ---------------------------------------------------------------------------
// Battery
// ---------------------------------------------------------------------------

/**
 * Depth-of-discharge guidance for multi-year LEO missions.
 * At ~5,500 charge/discharge cycles per year in LEO, keeping nominal DoD below
 * roughly 20-25% is the usual rule of thumb for a multi-year design life.
 */
export const DOD_WARN_FRACTION = 0.25;

/** Below this state of charge the bus is treated as browning out. */
export const SOC_CRITICAL_FRACTION = 0.2;

/** Li-ion charging is inhibited below 0 C to avoid lithium plating. */
export const BATTERY_CHARGE_MIN_C = 0;
export const BATTERY_CHARGE_MAX_C = 45;

// ---------------------------------------------------------------------------
// Links
// ---------------------------------------------------------------------------

/** Minimum link margin we treat as a pass (dB). */
export const LINK_MARGIN_GO_DB = 6;
/** Between this and GO is a warning band (dB). */
export const LINK_MARGIN_WARN_DB = 3;
