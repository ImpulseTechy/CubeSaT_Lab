/**
 * Orbit geometry and eclipse.
 *
 * Fidelity statement (shown in-app):
 *   Circular orbits, spherical Earth, cylindrical-with-conical-correction
 *   shadow. J2 nodal regression is modelled because it drives beta-angle drift
 *   and therefore the power budget. Drag, SRP and third-body are NOT modelled;
 *   orbital decay and lifetime are out of scope for v1.
 *
 * This is enough to teach how orbit choice drives eclipse, power and contact
 * time, which is the point. It is not a flight-dynamics tool.
 */

import {
  J2,
  MU_EARTH,
  OMEGA_EARTH,
  R_EARTH,
} from './constants';
import { sub, traced, type Traced } from './trace';

export interface Orbit {
  /** Mean altitude above the equatorial radius (km). */
  altitudeKm: number;
  /** Inclination (degrees). */
  inclinationDeg: number;
  /**
   * Right ascension of the ascending node (degrees). Used with the solar
   * longitude to derive the beta angle. Defaults to 0.
   */
  raanDeg?: number;
  /** Solar ecliptic longitude (degrees), i.e. where Earth is in its year. */
  solarLongitudeDeg?: number;
}

export const DEG = Math.PI / 180;

/** Obliquity of the ecliptic (degrees). */
const OBLIQUITY_DEG = 23.4393;

/** Semi-major axis of a circular orbit at the given altitude (km). */
export function semiMajorAxis(o: Orbit): number {
  return R_EARTH + o.altitudeKm;
}

/** Orbital period (seconds) — Kepler's third law for a circular orbit. */
export function orbitalPeriod(o: Orbit): Traced<number> {
  const a = semiMajorAxis(o);
  const T = 2 * Math.PI * Math.sqrt((a * a * a) / MU_EARTH);
  return traced(T, 's', {
    label: 'Orbital period',
    formula: 'T = 2*pi*sqrt(a^3 / mu)',
    substitutions: [
      sub('a', a, 'km', 'Earth radius + altitude'),
      sub('mu', MU_EARTH, 'km^3/s^2', 'Earth gravitational parameter'),
    ],
    source: "Kepler's third law",
    assumptions: ['Circular orbit', 'Spherical Earth (two-body)'],
  });
}

/** Circular orbital velocity (km/s). */
export function orbitalVelocity(o: Orbit): Traced<number> {
  const a = semiMajorAxis(o);
  const v = Math.sqrt(MU_EARTH / a);
  return traced(v, 'km/s', {
    label: 'Orbital velocity',
    formula: 'v = sqrt(mu / a)',
    substitutions: [
      sub('mu', MU_EARTH, 'km^3/s^2'),
      sub('a', a, 'km'),
    ],
    source: 'Vis-viva equation for a circular orbit',
    assumptions: ['Circular orbit'],
  });
}

/**
 * J2 nodal regression rate (degrees/day).
 *
 * Negative for prograde orbits. This is what makes sun-synchronous orbits
 * possible, and it drives beta-angle drift over a mission.
 */
export function nodalRegression(o: Orbit): Traced<number> {
  const a = semiMajorAxis(o);
  const n = Math.sqrt(MU_EARTH / (a * a * a)); // rad/s
  const rate =
    -1.5 * J2 * n * Math.pow(R_EARTH / a, 2) * Math.cos(o.inclinationDeg * DEG);
  const degPerDay = rate * (180 / Math.PI) * 86400;
  return traced(degPerDay, 'deg/day', {
    label: 'Nodal regression (J2)',
    formula: 'dOmega/dt = -1.5 * J2 * n * (Re/a)^2 * cos(i)',
    substitutions: [
      sub('J2', J2, '-', 'Second zonal harmonic'),
      sub('n', n, 'rad/s', 'Mean motion'),
      sub('Re', R_EARTH, 'km'),
      sub('a', a, 'km'),
      sub('i', o.inclinationDeg, 'deg'),
    ],
    source: 'Secular J2 perturbation, first order',
    assumptions: ['Circular orbit', 'First-order secular term only'],
  });
}

/**
 * Sun-synchronous inclination for a given altitude (degrees), or null if no
 * solution exists at that altitude.
 *
 * An SSO precesses at 360 deg/year so the local solar time of the ascending
 * node stays fixed — which is why dawn-dusk SSOs can be nearly eclipse-free.
 */
export function sunSyncInclination(altitudeKm: number): number | null {
  const a = R_EARTH + altitudeKm;
  const n = Math.sqrt(MU_EARTH / (a * a * a));
  const target = (2 * Math.PI) / (365.2421897 * 86400); // rad/s
  const cosI = -target / (1.5 * J2 * n * Math.pow(R_EARTH / a, 2));
  if (cosI < -1 || cosI > 1) return null;
  return Math.acos(cosI) / DEG;
}

/**
 * Beta angle (degrees): the angle between the orbit plane and the Sun vector.
 *
 * This is the single most important number for a power budget. At beta = 0 the
 * orbit is edge-on to the Sun and eclipse is longest; above a critical beta the
 * orbit never enters shadow at all.
 */
export function betaAngle(o: Orbit): Traced<number> {
  const raan = (o.raanDeg ?? 0) * DEG;
  const inc = o.inclinationDeg * DEG;
  const lambdaSun = (o.solarLongitudeDeg ?? 0) * DEG;
  const eps = OBLIQUITY_DEG * DEG;

  // Sun unit vector in Earth-centred inertial coordinates.
  const sx = Math.cos(lambdaSun);
  const sy = Math.sin(lambdaSun) * Math.cos(eps);
  const sz = Math.sin(lambdaSun) * Math.sin(eps);

  // Orbit normal for a circular orbit with this inclination and RAAN.
  const nx = Math.sin(raan) * Math.sin(inc);
  const ny = -Math.cos(raan) * Math.sin(inc);
  const nz = Math.cos(inc);

  const dot = sx * nx + sy * ny + sz * nz;
  const beta = Math.asin(Math.max(-1, Math.min(1, dot))) / DEG;

  return traced(beta, 'deg', {
    label: 'Beta angle',
    formula: 'beta = asin( s_hat . n_hat )',
    substitutions: [
      sub('i', o.inclinationDeg, 'deg', 'Inclination'),
      sub('RAAN', o.raanDeg ?? 0, 'deg'),
      sub('lambda_sun', o.solarLongitudeDeg ?? 0, 'deg', 'Solar ecliptic longitude'),
      sub('epsilon', OBLIQUITY_DEG, 'deg', 'Obliquity of the ecliptic'),
    ],
    source: 'Angle between orbit normal and Sun vector',
    assumptions: ['Circular orbit', 'Sun treated as infinitely distant'],
  });
}

/**
 * Critical beta angle (degrees) above which the orbit is permanently sunlit.
 *
 * beta* = asin(Re / (Re + h))
 */
export function criticalBeta(o: Orbit): number {
  const a = semiMajorAxis(o);
  return Math.asin(R_EARTH / a) / DEG;
}

/**
 * Eclipse fraction of the orbit (0..1), using a cylindrical shadow.
 *
 * For beta = 0 this reduces to the familiar
 *   f = (1/pi) * acos( sqrt(h(2Re+h)) / (Re+h) )
 * and it goes to zero once |beta| exceeds the critical beta.
 */
export function eclipseFraction(o: Orbit): Traced<number> {
  const a = semiMajorAxis(o);
  const beta = betaAngle(o).value;
  const betaStar = criticalBeta(o);

  let f: number;
  if (Math.abs(beta) >= betaStar) {
    // The orbit plane is tilted far enough from the Sun that the Earth's
    // shadow cylinder never crosses it.
    f = 0;
  } else {
    // Half-width of the shadow arc, projected into the orbit plane. The
    // numerator sqrt(1 - (Re/a)^2) is the sine of the Earth's angular radius
    // complement; dividing by cos(beta) projects it onto the tilted plane.
    const ratio =
      Math.sqrt(1 - Math.pow(R_EARTH / a, 2)) / Math.cos(beta * DEG);
    f = Math.acos(Math.max(-1, Math.min(1, ratio))) / Math.PI;
  }

  return traced(f, '-', {
    label: 'Eclipse fraction',
    formula: 'f_ecl = (1/pi) * acos( sqrt(1 - (Re/a)^2) / cos(beta) )',
    substitutions: [
      sub('Re', R_EARTH, 'km'),
      sub('a', a, 'km'),
      sub('beta', beta, 'deg'),
      sub('beta_crit', betaStar, 'deg', 'Above this, no eclipse at all'),
    ],
    source: 'Cylindrical shadow model',
    assumptions: [
      'Cylindrical shadow (no penumbra)',
      'Spherical Earth',
      'Circular orbit',
    ],
  });
}

/** Eclipse duration per orbit (seconds). */
export function eclipseDuration(o: Orbit): Traced<number> {
  const T = orbitalPeriod(o).value;
  const f = eclipseFraction(o).value;
  return traced(T * f, 's', {
    label: 'Eclipse duration per orbit',
    formula: 't_ecl = f_ecl * T',
    substitutions: [
      sub('f_ecl', f, '-', 'Fraction of the orbit in shadow'),
      sub('T', T, 's', 'Orbital period'),
    ],
    source: 'Cylindrical shadow model',
  });
}

/** Illuminated (sunlit) fraction of the orbit (0..1). */
export function sunlitFraction(o: Orbit): number {
  return 1 - eclipseFraction(o).value;
}

/** Number of orbits per day. */
export function orbitsPerDay(o: Orbit): number {
  return 86400 / orbitalPeriod(o).value;
}

/** Ground-track westward shift per orbit (degrees of longitude). */
export function groundTrackShiftDeg(o: Orbit): number {
  const T = orbitalPeriod(o).value;
  return (OMEGA_EARTH * T * 180) / Math.PI;
}

/**
 * Slant range (km) from a ground station to the satellite at a given
 * elevation angle, for a circular orbit over a spherical Earth.
 */
export function slantRange(altitudeKm: number, elevationDeg: number): Traced<number> {
  const Re = R_EARTH;
  const r = Re + altitudeKm;
  const el = elevationDeg * DEG;
  const d =
    Re * (Math.sqrt(Math.pow(r / Re, 2) - Math.pow(Math.cos(el), 2)) - Math.sin(el));
  return traced(d, 'km', {
    label: 'Slant range',
    formula: 'd = Re * ( sqrt((r/Re)^2 - cos^2(el)) - sin(el) )',
    substitutions: [
      sub('Re', Re, 'km'),
      sub('r', r, 'km', 'Orbit radius'),
      sub('el', elevationDeg, 'deg', 'Elevation above the horizon'),
    ],
    source: 'Spherical-Earth geometry',
    assumptions: ['Spherical Earth', 'Circular orbit'],
  });
}

/**
 * Maximum half-angle of the ground-station access circle (degrees of
 * Earth-central angle) for a given minimum elevation.
 */
export function accessCentralAngle(altitudeKm: number, minElevationDeg: number): number {
  const r = R_EARTH + altitudeKm;
  const el = minElevationDeg * DEG;
  return Math.acos((R_EARTH / r) * Math.cos(el)) / DEG - minElevationDeg;
}
