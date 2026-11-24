/**
 * RF link budget and data closure.
 *
 * SCOPE DECISION (see docs/05): groundsat.com already does a better link budget
 * than we ever will - ITU-R P.618 rain, galactic background noise, gaseous
 * absorption, pointing loss. We deliberately do NOT compete there.
 *
 * What this module does is the part Groundsat cannot: tie the link to a
 * satellite the learner designed, and answer "does the data get home?".
 *
 * Fidelity statement (shown in-app):
 *   Free-space path loss at the true slant range, a fixed allowance for
 *   atmospheric and polarisation losses, and a required Eb/N0 threshold.
 *   Not modelled: rain, ionospheric scintillation, Doppler, antenna patterns,
 *   modem implementation loss beyond the stated margin.
 */

import {
  BOLTZMANN_DBW,
  C_LIGHT,
  LINK_MARGIN_GO_DB,
  LINK_MARGIN_WARN_DB,
  OMEGA_EARTH,
} from './constants';
import {
  accessCentralAngle,
  DEG,
  nodalRegression,
  orbitalPeriod,
  orbitsPerDay,
  slantRange,
  type Orbit,
} from './orbit';
import { sub, traced, type Traced } from './trace';

export type Band = 'VHF' | 'UHF' | 'S' | 'X';

export interface BandSpec {
  band: Band;
  label: string;
  /** Representative centre frequency (Hz). */
  frequencyHz: number;
  /** Typical achievable data rates (bit/s) for a CubeSat downlink. */
  typicalRatesBps: number[];
  /** Fixed allowance for atmosphere, polarisation and pointing (dB). */
  miscLossDb: number;
}

export const BANDS: Record<Band, BandSpec> = {
  VHF: {
    band: 'VHF',
    label: 'VHF (145 MHz amateur)',
    frequencyHz: 145.9e6,
    typicalRatesBps: [1200, 9600],
    miscLossDb: 1.5,
  },
  UHF: {
    band: 'UHF',
    label: 'UHF (437 MHz amateur)',
    frequencyHz: 437.5e6,
    typicalRatesBps: [1200, 9600, 19200],
    miscLossDb: 2.0,
  },
  S: {
    band: 'S',
    label: 'S-band (2.2 GHz)',
    frequencyHz: 2.2e9,
    typicalRatesBps: [100e3, 500e3, 1e6, 2e6],
    miscLossDb: 3.0,
  },
  X: {
    band: 'X',
    label: 'X-band (8.2 GHz)',
    frequencyHz: 8.2e9,
    typicalRatesBps: [10e6, 50e6, 100e6],
    miscLossDb: 4.5,
  },
};

export interface RadioConfig {
  band: Band;
  /** Transmit power at the antenna port (W). */
  txPowerW: number;
  /** Spacecraft antenna gain (dBi). */
  txGainDbi: number;
  /** Losses between transmitter and antenna (dB). */
  txLossDb: number;
  /** Downlink data rate (bit/s). */
  dataRateBps: number;
}

export interface GroundStation {
  id: string;
  name: string;
  latDeg: number;
  lonDeg: number;
  altitudeM: number;
  /** Receive figure of merit (dB/K). */
  gOverTDbK: number;
  /** Minimum usable elevation (degrees). */
  minElevationDeg: number;
}

/** Required Eb/N0 for a usable link (dB), including implementation margin. */
export const REQUIRED_EB_N0_DB = 10.0;

// ---------------------------------------------------------------------------
// Link budget
// ---------------------------------------------------------------------------

/** Effective isotropic radiated power (dBW). */
export function eirp(radio: RadioConfig): Traced<number> {
  const txDbw = 10 * Math.log10(radio.txPowerW);
  const v = txDbw + radio.txGainDbi - radio.txLossDb;
  return traced(v, 'dBW', {
    label: 'EIRP',
    formula: 'EIRP = 10*log10(P_tx) + G_tx - L_tx',
    substitutions: [
      sub('P_tx', radio.txPowerW, 'W', 'Transmit power'),
      sub('G_tx', radio.txGainDbi, 'dBi', 'Spacecraft antenna gain'),
      sub('L_tx', radio.txLossDb, 'dB', 'Feed and cable losses'),
    ],
    source: 'Standard link budget',
  });
}

/** Free-space path loss (dB) at a given slant range. */
export function pathLoss(rangeKm: number, frequencyHz: number): Traced<number> {
  const rangeM = rangeKm * 1000;
  const v = 20 * Math.log10((4 * Math.PI * rangeM * frequencyHz) / C_LIGHT);
  return traced(v, 'dB', {
    label: 'Free-space path loss',
    formula: 'FSPL = 20*log10( 4*pi*d*f / c )',
    substitutions: [
      sub('d', rangeKm, 'km', 'Slant range to the ground station'),
      sub('f', frequencyHz / 1e6, 'MHz', 'Carrier frequency'),
      sub('c', C_LIGHT / 1e6, 'km/s', 'Speed of light'),
    ],
    source: 'Friis transmission equation',
    assumptions: ['Vacuum propagation; atmosphere handled as a fixed allowance'],
  });
}

export interface LinkResult {
  eirpDbw: Traced<number>;
  pathLossDb: Traced<number>;
  ebN0Db: Traced<number>;
  marginDb: Traced<number>;
  closes: boolean;
}

/**
 * Link budget at a single geometry.
 *
 * Eb/N0 = EIRP - FSPL - L_misc + G/T - k - 10*log10(R)
 */
export function linkBudget(
  radio: RadioConfig,
  station: GroundStation,
  rangeKm: number,
): LinkResult {
  const spec = BANDS[radio.band];
  const e = eirp(radio);
  const fspl = pathLoss(rangeKm, spec.frequencyHz);
  const rateDb = 10 * Math.log10(radio.dataRateBps);

  const ebno =
    e.value - fspl.value - spec.miscLossDb + station.gOverTDbK - BOLTZMANN_DBW - rateDb;

  const ebnoTraced = traced(ebno, 'dB', {
    label: 'Eb/N0',
    formula: 'Eb/N0 = EIRP - FSPL - L_misc + G/T - k - 10*log10(R)',
    substitutions: [
      sub('EIRP', e.value, 'dBW'),
      sub('FSPL', fspl.value, 'dB', `at ${rangeKm.toFixed(0)} km`),
      sub('L_misc', spec.miscLossDb, 'dB', 'Atmosphere, polarisation, pointing'),
      sub('G/T', station.gOverTDbK, 'dB/K', station.name),
      sub('k', BOLTZMANN_DBW, 'dBW/K/Hz', 'Boltzmann constant'),
      sub('R', radio.dataRateBps, 'bit/s', 'Data rate'),
    ],
    source: 'Standard downlink budget',
    assumptions: [
      'Fixed misc-loss allowance; no rain or ionospheric model',
      'No Doppler or modem implementation loss beyond the required margin',
    ],
  });

  const margin = ebno - REQUIRED_EB_N0_DB;

  return {
    eirpDbw: e,
    pathLossDb: fspl,
    ebN0Db: ebnoTraced,
    marginDb: traced(margin, 'dB', {
      label: 'Link margin',
      formula: 'Margin = Eb/N0 - (Eb/N0)_required',
      substitutions: [
        sub('Eb/N0', ebno, 'dB', 'Achieved'),
        sub('(Eb/N0)_req', REQUIRED_EB_N0_DB, 'dB', 'Required for this modulation'),
      ],
      source: 'Link closure criterion',
      assumptions: [`Below ${LINK_MARGIN_WARN_DB} dB is marginal; aim for ${LINK_MARGIN_GO_DB} dB`],
    }),
    closes: margin >= 0,
  };
}

/**
 * Link margin at the worst-case geometry of a pass: the lowest usable
 * elevation, where slant range is greatest.
 */
export function worstCaseLink(
  orbit: Orbit,
  radio: RadioConfig,
  station: GroundStation,
): LinkResult {
  const range = slantRange(orbit.altitudeKm, station.minElevationDeg).value;
  return linkBudget(radio, station, range);
}

// ---------------------------------------------------------------------------
// Passes and data volume
// ---------------------------------------------------------------------------

export interface PassStats {
  passesPerDay: Traced<number>;
  avgPassDurationS: Traced<number>;
  contactMinutesPerDay: Traced<number>;
}

/** A single ground-track sample. */
export interface GroundTrackPoint {
  t: number;
  latDeg: number;
  lonDeg: number;
  /** Earth-central angle to the station (degrees). */
  centralAngleDeg: number;
  inView: boolean;
}

/**
 * Sub-satellite ground track for a circular orbit, including Earth rotation
 * and J2 nodal regression.
 *
 * Closed-form spherical trigonometry rather than a heuristic, so pass counts
 * fall out of real geometry and the same samples drive the ground-track plot.
 */
export function groundTrack(
  orbit: Orbit,
  station: GroundStation,
  durationS = 86400,
  stepS = 10,
): GroundTrackPoint[] {
  const T = orbitalPeriod(orbit).value;
  const inc = orbit.inclinationDeg * DEG;
  const raan0 = (orbit.raanDeg ?? 0) * DEG;
  const nodeRateDegPerS = nodalRegression(orbit).value / 86400;
  const stLat = station.latDeg * DEG;
  const stLon = station.lonDeg * DEG;
  const lambda = accessCentralAngle(orbit.altitudeKm, station.minElevationDeg);

  const pts: GroundTrackPoint[] = [];
  for (let t = 0; t < durationS; t += stepS) {
    // Argument of latitude: angle travelled from the ascending node.
    const u = (2 * Math.PI * t) / T;
    const lat = Math.asin(Math.sin(inc) * Math.sin(u));
    // Longitude relative to the node, then rotate for Earth spin and J2 drift.
    const dLon = Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u));
    const raan = raan0 + nodeRateDegPerS * t * DEG;
    const lon = raan + dLon - OMEGA_EARTH * t;

    // Earth-central angle between sub-satellite point and station.
    const cosC =
      Math.sin(stLat) * Math.sin(lat) +
      Math.cos(stLat) * Math.cos(lat) * Math.cos(lon - stLon);
    const c = Math.acos(Math.max(-1, Math.min(1, cosC))) / DEG;

    pts.push({
      t,
      latDeg: lat / DEG,
      lonDeg: (((lon / DEG + 180) % 360) + 360) % 360 - 180,
      centralAngleDeg: c,
      inView: c <= lambda,
    });
  }
  return pts;
}

/**
 * Pass statistics derived by walking the ground track and counting contiguous
 * in-view intervals.
 *
 * This replaces an earlier closed-form heuristic that was too crude to trust:
 * it mishandled retrograde inclinations (a 97.5 deg orbit reaches 82.5 deg
 * latitude, not 97.5) and could not represent ground-track bunching near the
 * turning latitude, which is exactly why polar stations are so valuable.
 */
export function passStatistics(orbit: Orbit, station: GroundStation): PassStats {
  const lambda = accessCentralAngle(orbit.altitudeKm, station.minElevationDeg);
  const stepS = 10;
  const track = groundTrack(orbit, station, 86400, stepS);

  let passes = 0;
  let inViewSteps = 0;
  let wasInView = false;
  for (const p of track) {
    if (p.inView) {
      inViewSteps++;
      if (!wasInView) passes++;
    }
    wasInView = p.inView;
  }

  const contactS = inViewSteps * stepS;
  const duration = passes > 0 ? contactS / passes : 0;

  return {
    passesPerDay: traced(passes, '/day', {
      label: 'Usable passes per day',
      formula: 'Counted from the simulated ground track over 24 h',
      substitutions: [
        sub('lambda', lambda, 'deg', 'Access circle half-angle'),
        sub('lat_station', station.latDeg, 'deg', station.name),
        sub('i', orbit.inclinationDeg, 'deg', 'Inclination'),
        sub('el_min', station.minElevationDeg, 'deg', 'Elevation mask'),
        sub('dt', stepS, 's', 'Ground-track sampling step'),
      ],
      source: 'Spherical geometry over a simulated 24 h ground track',
      assumptions: [
        'Circular orbit with J2 nodal regression and Earth rotation',
        'Spherical Earth; no terrain masking',
        `Counts only passes reaching ${station.minElevationDeg} deg elevation`,
      ],
    }),
    avgPassDurationS: traced(duration, 's', {
      label: 'Average pass duration',
      formula: 't_pass = t_contact / N_pass',
      substitutions: [
        sub('t_contact', contactS, 's', 'Total time in view over 24 h'),
        sub('N_pass', passes, '/day'),
      ],
      source: 'Simulated ground track',
    }),
    contactMinutesPerDay: traced(contactS / 60, 'min/day', {
      label: 'Contact time per day',
      formula: 't_contact = steps_in_view * dt',
      substitutions: [
        sub('steps_in_view', inViewSteps, '-'),
        sub('dt', stepS, 's'),
      ],
      source: 'Simulated ground track',
    }),
  };
}

export interface DataBalance {
  generatedMbPerDay: Traced<number>;
  downlinkedMbPerDay: Traced<number>;
  marginMb: Traced<number>;
  closes: boolean;
}

/**
 * Does the data get home?
 *
 * This is the question no other tool answers, because it needs both the link
 * and the payload the learner configured.
 */
export function dataBalance(
  orbit: Orbit,
  radio: RadioConfig,
  station: GroundStation,
  payloadMbPerOrbit: number,
  link: LinkResult,
): DataBalance {
  const stats = passStatistics(orbit, station);
  const nOrbits = orbitsPerDay(orbit);
  const generated = payloadMbPerOrbit * nOrbits;

  // No link, no data - however many passes you get.
  const effectiveSeconds = link.closes ? stats.contactMinutesPerDay.value * 60 : 0;
  const downlinked = (radio.dataRateBps * effectiveSeconds) / 8 / 1e6;

  return {
    generatedMbPerDay: traced(generated, 'MB/day', {
      label: 'Payload data generated',
      formula: 'D_gen = D_orbit * N_orbit',
      substitutions: [
        sub('D_orbit', payloadMbPerOrbit, 'MB', 'Per orbit, at the configured duty cycle'),
        sub('N_orbit', nOrbits, '/day'),
      ],
      source: 'Payload configuration',
    }),
    downlinkedMbPerDay: traced(downlinked, 'MB/day', {
      label: 'Data downlinked',
      formula: 'D_down = R * t_contact / 8 / 1e6',
      substitutions: [
        sub('R', radio.dataRateBps, 'bit/s', 'Downlink rate'),
        sub('t_contact', effectiveSeconds, 's', link.closes ? 'Usable contact time' : 'Link does not close - no data'),
      ],
      source: 'Contact time times data rate',
      assumptions: [
        'Full rate for the whole pass; no acquisition or protocol overhead',
        'Link margin must be positive or nothing gets through',
      ],
    }),
    marginMb: traced(downlinked - generated, 'MB/day', {
      label: 'Data margin',
      formula: 'D_margin = D_down - D_gen',
      substitutions: [
        sub('D_down', downlinked, 'MB/day'),
        sub('D_gen', generated, 'MB/day'),
      ],
      source: 'Data closure',
      assumptions: ['Negative margin means the onboard buffer fills and data is lost'],
    }),
    closes: downlinked >= generated,
  };
}
