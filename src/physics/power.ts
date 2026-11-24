/**
 * Electrical power: generation, load, and battery state of charge.
 *
 * Fidelity statement (shown in-app):
 *   Attitude is an ASSUMPTION, not a simulation. Each attitude mode applies a
 *   documented average solar-incidence factor rather than integrating
 *   rigid-body dynamics. This buys the whole power/eclipse/duty-cycle coupling
 *   at a fraction of the cost, and is honest about what it does not know.
 *
 *   Not modelled: Earth albedo and IR input, panel self-shadowing, temperature
 *   derating, battery internal resistance, cell-level balancing, ageing.
 */

import {
  DOD_WARN_FRACTION,
  SOC_CRITICAL_FRACTION,
  SOLAR_CONSTANT,
} from './constants';
import { eclipseFraction, orbitalPeriod, type Orbit } from './orbit';
import { sub, traced, type Traced } from './trace';

// ---------------------------------------------------------------------------
// Attitude as an assumption
// ---------------------------------------------------------------------------

export type AttitudeMode = 'tumbling' | 'nadir' | 'sun-tracking';

export interface AttitudeAssumption {
  mode: AttitudeMode;
  label: string;
  /** Average of cos(incidence) over the sunlit arc, across all lit faces. */
  incidenceFactor: number;
  rationale: string;
}

/**
 * Average solar-incidence factors.
 *
 * - Tumbling: averaged over all orientations, a convex body intercepts
 *   one quarter of its total surface area; for a cube with panels on all six
 *   faces this lands near 0.25.
 * - Nadir-pointing: one face tracks the ground, so the Sun sweeps across the
 *   body through the orbit; roughly 1/pi of a flat plate's peak.
 * - Sun-tracking: a steered or deployed wing holds near-normal incidence,
 *   derated for pointing error and off-axis loss.
 */
export const ATTITUDE_ASSUMPTIONS: Record<AttitudeMode, AttitudeAssumption> = {
  tumbling: {
    mode: 'tumbling',
    label: 'Tumbling (uncontrolled)',
    incidenceFactor: 0.25,
    rationale:
      'Averaged over all orientations a convex body intercepts a quarter of its surface area. This is what you get before detumbling succeeds.',
  },
  nadir: {
    mode: 'nadir',
    label: 'Nadir-pointing',
    incidenceFactor: 0.32,
    rationale:
      'One face holds toward Earth, so the Sun sweeps across the body each orbit. Roughly 1/pi of peak for a flat plate, slightly better with multiple lit faces.',
  },
  'sun-tracking': {
    mode: 'sun-tracking',
    label: 'Sun-tracking wings',
    incidenceFactor: 0.8,
    rationale:
      'Steered or favourably deployed panels hold near-normal incidence. Derated from 1.0 for pointing error, off-axis loss and partial shadowing.',
  },
};

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SolarConfig {
  /** Total photovoltaic area (m^2). */
  areaM2: number;
  /** Cell conversion efficiency (0..1), e.g. 0.30 for triple-junction. */
  efficiency: number;
  /** Packing factor: cell area as a fraction of panel area (0..1). */
  packingFactor: number;
  /** EPS / MPPT conversion efficiency (0..1). */
  epsEfficiency: number;
}

export interface BatteryConfig {
  /** Usable energy capacity (Wh). */
  capacityWh: number;
  /** Round-trip charge/discharge efficiency (0..1). */
  efficiency: number;
  /** Starting state of charge (0..1). */
  initialSoc: number;
}

export type OperatingMode = 'idle' | 'payload' | 'downlink' | 'safe';

export interface LoadProfile {
  /** Continuous bus power drawn in every mode (W). */
  busPowerW: number;
  /** Additional power per mode (W), on top of the bus load. */
  modePowerW: Record<OperatingMode, number>;
  /** Fraction of each orbit spent in each mode. Should sum to 1. */
  dutyCycle: Record<OperatingMode, number>;
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/** Instantaneous power while sunlit (W). */
export function peakGeneration(
  solar: SolarConfig,
  attitude: AttitudeMode,
): Traced<number> {
  const a = ATTITUDE_ASSUMPTIONS[attitude];
  const p =
    SOLAR_CONSTANT *
    solar.areaM2 *
    solar.efficiency *
    solar.packingFactor *
    a.incidenceFactor *
    solar.epsEfficiency;

  return traced(p, 'W', {
    label: 'Sunlit generation',
    formula: 'P = S * A * eta_cell * k_pack * k_inc * eta_eps',
    substitutions: [
      sub('S', SOLAR_CONSTANT, 'W/m^2', 'Solar constant at 1 AU'),
      sub('A', solar.areaM2, 'm^2', 'Total panel area'),
      sub('eta_cell', solar.efficiency, '-', 'Cell conversion efficiency'),
      sub('k_pack', solar.packingFactor, '-', 'Cell packing factor'),
      sub('k_inc', a.incidenceFactor, '-', a.label),
      sub('eta_eps', solar.epsEfficiency, '-', 'EPS/MPPT efficiency'),
    ],
    source: 'Flat-plate photovoltaic model',
    assumptions: [
      a.rationale,
      'No Earth albedo or infrared input',
      'No temperature derating',
      'No panel self-shadowing',
    ],
  });
}

/** Energy generated per orbit (Wh), accounting for eclipse. */
export function generationPerOrbit(
  orbit: Orbit,
  solar: SolarConfig,
  attitude: AttitudeMode,
): Traced<number> {
  const peak = peakGeneration(solar, attitude).value;
  const T = orbitalPeriod(orbit).value;
  const sunlit = 1 - eclipseFraction(orbit).value;
  const wh = (peak * T * sunlit) / 3600;

  return traced(wh, 'Wh', {
    label: 'Generation per orbit',
    formula: 'E_gen = P_sun * T * f_sun / 3600',
    substitutions: [
      sub('P_sun', peak, 'W', 'Sunlit generation'),
      sub('T', T, 's', 'Orbital period'),
      sub('f_sun', sunlit, '-', 'Sunlit fraction of the orbit'),
    ],
    source: 'Energy balance over one orbit',
  });
}

// ---------------------------------------------------------------------------
// Load
// ---------------------------------------------------------------------------

/** Orbit-average load (W), weighted by duty cycle. */
export function averageLoad(load: LoadProfile): Traced<number> {
  let weighted = 0;
  const subs = [sub('P_bus', load.busPowerW, 'W', 'Continuous bus load')];
  for (const mode of Object.keys(load.modePowerW) as OperatingMode[]) {
    const d = load.dutyCycle[mode] ?? 0;
    const p = load.modePowerW[mode] ?? 0;
    weighted += d * p;
    if (d > 0) {
      subs.push(
        sub(`P_${mode} * d_${mode}`, p * d, 'W', `${p} W at ${(d * 100).toFixed(0)}% duty`),
      );
    }
  }
  const total = load.busPowerW + weighted;
  return traced(total, 'W', {
    label: 'Orbit-average load',
    formula: 'P_avg = P_bus + sum( d_mode * P_mode )',
    substitutions: subs,
    source: 'Duty-cycle weighted average',
    assumptions: ['Mode transitions are instantaneous'],
  });
}

/** Energy consumed per orbit (Wh). */
export function loadPerOrbit(orbit: Orbit, load: LoadProfile): Traced<number> {
  const avg = averageLoad(load).value;
  const T = orbitalPeriod(orbit).value;
  const wh = (avg * T) / 3600;
  return traced(wh, 'Wh', {
    label: 'Consumption per orbit',
    formula: 'E_load = P_avg * T / 3600',
    substitutions: [
      sub('P_avg', avg, 'W', 'Orbit-average load'),
      sub('T', T, 's', 'Orbital period'),
    ],
    source: 'Energy balance over one orbit',
  });
}

// ---------------------------------------------------------------------------
// Energy balance and battery simulation
// ---------------------------------------------------------------------------

export interface EnergyBalance {
  generationWh: Traced<number>;
  loadWh: Traced<number>;
  marginWh: Traced<number>;
  /** Margin as a fraction of generation; negative means a deficit. */
  marginFraction: number;
}

export function energyBalance(
  orbit: Orbit,
  solar: SolarConfig,
  attitude: AttitudeMode,
  load: LoadProfile,
): EnergyBalance {
  const gen = generationPerOrbit(orbit, solar, attitude);
  const use = loadPerOrbit(orbit, load);
  const margin = gen.value - use.value;

  return {
    generationWh: gen,
    loadWh: use,
    marginWh: traced(margin, 'Wh', {
      label: 'Energy margin per orbit',
      formula: 'E_margin = E_gen - E_load',
      substitutions: [
        sub('E_gen', gen.value, 'Wh', 'Generated while sunlit'),
        sub('E_load', use.value, 'Wh', 'Consumed over the whole orbit'),
      ],
      source: 'Orbit energy balance',
      assumptions: ['Positive margin is required for a sustainable mission'],
    }),
    marginFraction: gen.value > 0 ? margin / gen.value : -1,
  };
}

export interface SocSample {
  /** Seconds since the start of the simulation. */
  t: number;
  /** State of charge (0..1). */
  soc: number;
  /** Instantaneous generation (W). */
  genW: number;
  /** Instantaneous load (W). */
  loadW: number;
  sunlit: boolean;
}

export interface SocResult {
  samples: SocSample[];
  minSoc: number;
  maxSoc: number;
  /** Deepest discharge below the starting point, as a fraction. */
  depthOfDischarge: number;
  /** Orbit index where SoC first went below the critical threshold, or null. */
  brownoutOrbit: number | null;
  brownoutTime: number | null;
  /** True if SoC is still falling at the end - the mission is not sustainable. */
  divergent: boolean;
}

/**
 * Integrate battery state of charge over a number of orbits.
 *
 * Simple explicit integration over fixed steps. The sunlit arc is placed at the
 * start of each orbit and the eclipse at the end, which is a geometric
 * simplification but preserves the energy and the depth of discharge that
 * matter for the verdict.
 */
export function simulateSoc(
  orbit: Orbit,
  solar: SolarConfig,
  attitude: AttitudeMode,
  load: LoadProfile,
  battery: BatteryConfig,
  orbits = 5,
  stepsPerOrbit = 120,
): SocResult {
  const T = orbitalPeriod(orbit).value;
  const eclF = eclipseFraction(orbit).value;
  const sunF = 1 - eclF;
  const peak = peakGeneration(solar, attitude).value;
  const avgLoad = averageLoad(load).value;
  const dt = T / stepsPerOrbit;

  let soc = Math.max(0, Math.min(1, battery.initialSoc));
  const samples: SocSample[] = [];
  let minSoc = soc;
  let maxSoc = soc;
  let brownoutOrbit: number | null = null;
  let brownoutTime: number | null = null;

  for (let k = 0; k < orbits * stepsPerOrbit; k++) {
    const t = k * dt;
    const phase = (k % stepsPerOrbit) / stepsPerOrbit;
    const sunlit = phase < sunF;
    const genW = sunlit ? peak : 0;
    const netW = genW - avgLoad;

    // Charging is penalised by round-trip efficiency; discharging is not.
    const deltaWh =
      (netW >= 0 ? netW * battery.efficiency : netW) * (dt / 3600);
    soc = Math.max(0, Math.min(1, soc + deltaWh / battery.capacityWh));

    if (soc < minSoc) minSoc = soc;
    if (soc > maxSoc) maxSoc = soc;
    if (soc < SOC_CRITICAL_FRACTION && brownoutOrbit === null) {
      brownoutOrbit = Math.floor(k / stepsPerOrbit) + 1;
      brownoutTime = t;
    }

    samples.push({ t, soc, genW, loadW: avgLoad, sunlit });
  }

  // Depth of discharge is measured over the FINAL orbit, not the whole run.
  // The first orbit contains the start-up transient (a battery that begins
  // part-charged climbs to full), which is not a real discharge cycle and
  // would otherwise inflate the number that drives battery-life guidance.
  const lastOrbit = samples.slice(-stepsPerOrbit);
  const prevOrbit = samples.slice(-2 * stepsPerOrbit, -stepsPerOrbit);
  const socsOf = (xs: SocSample[]) => xs.map((x) => x.soc);
  const lastMin = lastOrbit.length ? Math.min(...socsOf(lastOrbit)) : soc;
  const lastMax = lastOrbit.length ? Math.max(...socsOf(lastOrbit)) : soc;
  const depthOfDischarge = lastMax - lastMin;

  const meanOf = (xs: SocSample[]) =>
    xs.length ? xs.reduce((s, x) => s + x.soc, 0) / xs.length : 0;

  // The design is unsustainable if the battery is still draining orbit on
  // orbit, OR if it has already hit the floor and is pinned there. The second
  // case matters because a floored battery shows no further decline.
  const stillDraining =
    prevOrbit.length > 0 && meanOf(lastOrbit) < meanOf(prevOrbit) - 1e-4;
  const pinnedEmpty = lastMin <= SOC_CRITICAL_FRACTION;
  const divergent = stillDraining || pinnedEmpty;

  return {
    samples,
    minSoc,
    maxSoc,
    depthOfDischarge,
    brownoutOrbit,
    brownoutTime,
    divergent,
  };
}

/** True if the depth of discharge is deep enough to shorten battery life. */
export function dodExceedsGuidance(dod: number): boolean {
  return dod > DOD_WARN_FRACTION;
}
