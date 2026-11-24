/**
 * Design state and mass budget.
 *
 * One immutable object is the single source of truth. Every budget reads from
 * it, which is what makes the cascade real: change the payload and mass, power
 * and data all move together because they all derive from here.
 */

import { byId, type Component, type Subsystem } from '../data/catalogue';
import {
  CDS_LEGACY_1U_MASS_KG,
  CDS_MAX_MASS_KG,
  CDS_SOURCE,
  FORM_FACTOR_UNITS,
  type FormFactor,
} from './constants';
import { BANDS, type GroundStation, type RadioConfig } from './link';
import type { AttitudeMode, BatteryConfig, LoadProfile, SolarConfig } from './power';
import type { Orbit } from './orbit';
import { sub, traced, type Traced } from './trace';

export interface Design {
  formFactor: FormFactor;
  /** Component ids chosen per subsystem. */
  components: Partial<Record<Subsystem, string>>;
  attitude: AttitudeMode;
  /** Fraction of each orbit spent running the payload (0..1). */
  payloadDuty: number;
  /** Downlink data rate chosen by the user (bit/s). */
  dataRateBps: number;
  /** Mass contingency margin applied on top of the component roll-up (0..1). */
  contingency: number;
  orbit: Orbit;
  stationId: string;
}

export const DEFAULT_DESIGN: Design = {
  formFactor: '3U',
  components: {
    structure: 'struct-3u',
    eps: 'eps-mppt',
    battery: 'batt-20',
    solar: 'solar-body-3u',
    obc: 'obc-basic',
    adcs: 'adcs-mtq',
    comms: 'comms-uhf',
    payload: 'pl-cam-lo',
  },
  attitude: 'nadir',
  payloadDuty: 0.15,
  dataRateBps: 9600,
  contingency: 0.1,
  orbit: { altitudeKm: 525, inclinationDeg: 51.6, raanDeg: 0, solarLongitudeDeg: 0 },
  stationId: 'amateur-eu',
};

/** Resolve the chosen components, skipping any empty slot. */
export function selectedComponents(d: Design): Component[] {
  return Object.values(d.components)
    .map((id) => (id ? byId(id) : undefined))
    .filter((c): c is Component => !!c);
}

// ---------------------------------------------------------------------------
// Mass budget
// ---------------------------------------------------------------------------

export interface MassBudget {
  /** Per-component breakdown, heaviest first. */
  items: { name: string; subsystem: Subsystem; massG: number }[];
  dryMassG: Traced<number>;
  contingencyG: number;
  totalMassG: Traced<number>;
  limitKg: number;
  legacyLimitKg: number | null;
  marginG: Traced<number>;
  withinLimit: boolean;
}

export function massBudget(d: Design): MassBudget {
  const comps = selectedComponents(d);
  const items = comps
    .map((c) => ({ name: c.name, subsystem: c.subsystem, massG: c.massG }))
    .sort((a, b) => b.massG - a.massG);

  const dry = items.reduce((s, i) => s + i.massG, 0);
  const contingency = dry * d.contingency;
  const total = dry + contingency;
  const limitKg = CDS_MAX_MASS_KG[d.formFactor];
  const limitG = limitKg * 1000;

  return {
    items,
    dryMassG: traced(dry, 'g', {
      label: 'Dry mass',
      formula: 'm_dry = sum( m_component )',
      substitutions: items.map((i) => sub(i.name, i.massG, 'g', i.subsystem)),
      source: 'Component roll-up',
    }),
    contingencyG: contingency,
    totalMassG: traced(total, 'g', {
      label: 'Total mass with contingency',
      formula: 'm_total = m_dry * (1 + k_cont)',
      substitutions: [
        sub('m_dry', dry, 'g', 'Sum of selected components'),
        sub('k_cont', d.contingency, '-', 'Contingency margin'),
      ],
      source: 'Standard systems-engineering practice',
      assumptions: [
        'Harness, fasteners and adhesive are covered by the contingency',
      ],
    }),
    limitKg,
    legacyLimitKg: d.formFactor === '1U' ? CDS_LEGACY_1U_MASS_KG : null,
    marginG: traced(limitG - total, 'g', {
      label: 'Mass margin',
      formula: 'margin = m_limit - m_total',
      substitutions: [
        sub('m_limit', limitG, 'g', `${d.formFactor} limit, ${limitKg} kg`),
        sub('m_total', total, 'g'),
        sub('units', FORM_FACTOR_UNITS[d.formFactor], 'U', 'At 2.00 kg per U'),
      ],
      source: CDS_SOURCE,
      assumptions: [
        'A launch provider dispenser ICD always supersedes the generic CDS table',
      ],
    }),
    withinLimit: total <= limitG,
  };
}

// ---------------------------------------------------------------------------
// Derived subsystem configurations
// ---------------------------------------------------------------------------

export function solarConfig(d: Design): SolarConfig {
  const panel = d.components.solar ? byId(d.components.solar) : undefined;
  const eps = d.components.eps ? byId(d.components.eps) : undefined;
  return {
    areaM2: panel?.solar?.areaM2 ?? 0.01,
    efficiency: panel?.solar?.efficiency ?? 0.3,
    packingFactor: 0.85,
    epsEfficiency: eps?.id === 'eps-mppt' ? 0.93 : 0.88,
  };
}

export function batteryConfig(d: Design): BatteryConfig {
  const b = d.components.battery ? byId(d.components.battery) : undefined;
  return {
    capacityWh: b?.battery?.capacityWh ?? 10,
    efficiency: 0.95,
    initialSoc: 0.9,
  };
}

export function radioConfig(d: Design): RadioConfig {
  const c = d.components.comms ? byId(d.components.comms) : undefined;
  const spec = c?.comms;
  const band = spec?.band ?? 'UHF';
  return {
    band,
    txPowerW: spec?.txPowerW ?? 1,
    txGainDbi: spec?.gainDbi ?? 0,
    txLossDb: 1,
    dataRateBps: Math.min(d.dataRateBps, spec?.maxRateBps ?? BANDS[band].typicalRatesBps[0]),
  };
}

export function loadProfile(d: Design): LoadProfile {
  const comps = selectedComponents(d);
  const bus = comps.reduce((s, c) => s + c.powerW, 0);
  const payload = d.components.payload ? byId(d.components.payload) : undefined;
  const comms = d.components.comms ? byId(d.components.comms) : undefined;

  // Downlink duty follows the contact time, approximated here as a small slice;
  // the data balance uses real pass geometry.
  const downlinkDuty = 0.05;
  const duty = Math.max(0, Math.min(1 - downlinkDuty, d.payloadDuty));

  return {
    busPowerW: bus,
    modePowerW: {
      idle: 0,
      payload: payload?.payload?.activePowerW ?? 0,
      downlink: (comms?.comms?.txPowerW ?? 1) * 2.5, // PA efficiency ~40%
      safe: 0,
    },
    dutyCycle: {
      idle: Math.max(0, 1 - duty - downlinkDuty),
      payload: duty,
      downlink: downlinkDuty,
      safe: 0,
    },
  };
}

/** Payload data generated per orbit (MB), at the configured duty cycle. */
export function payloadDataPerOrbitMb(d: Design): Traced<number> {
  const p = d.components.payload ? byId(d.components.payload) : undefined;
  const perCapture = p?.payload?.mbPerCapture ?? 0;
  const captures = p?.payload?.capturesPerOrbit ?? 0;
  // Duty cycle scales how many of the nominal captures actually happen.
  const scale = d.payloadDuty / 0.15;
  const mb = perCapture * captures * scale;

  return traced(mb, 'MB', {
    label: 'Payload data per orbit',
    formula: 'D = d_capture * n_capture * (duty / duty_nominal)',
    substitutions: [
      sub('d_capture', perCapture, 'MB', p?.name ?? 'No payload'),
      sub('n_capture', captures, '/orbit', 'At nominal duty'),
      sub('duty', d.payloadDuty, '-', 'Configured payload duty cycle'),
      sub('duty_nominal', 0.15, '-', 'Duty the capture rate is quoted at'),
    ],
    source: 'Payload configuration',
    assumptions: ['No onboard compression beyond what the payload already applies'],
  });
}

// ---------------------------------------------------------------------------
// Ground stations
// ---------------------------------------------------------------------------

export const STATIONS: GroundStation[] = [
  {
    id: 'amateur-eu', name: 'Hobby antenna in Europe',
    latDeg: 52, lonDeg: 0, altitudeM: 50, gOverTDbK: -12, minElevationDeg: 10,
  },
  {
    id: 'amateur-in', name: 'Hobby antenna in India',
    latDeg: 19.1, lonDeg: 72.9, altitudeM: 14, gOverTDbK: -12, minElevationDeg: 10,
  },
  {
    id: 'university', name: 'University dish, 3 m, Europe',
    latDeg: 52, lonDeg: 0, altitudeM: 50, gOverTDbK: 8, minElevationDeg: 10,
  },
  {
    id: 'svalbard', name: 'Professional station near the North Pole',
    latDeg: 78.2, lonDeg: 15.4, altitudeM: 450, gOverTDbK: 18, minElevationDeg: 5,
  },
  {
    id: 'equatorial', name: 'Station on the equator',
    latDeg: 0, lonDeg: 0, altitudeM: 10, gOverTDbK: 2, minElevationDeg: 10,
  },
];

export function stationById(id: string): GroundStation {
  return STATIONS.find((s) => s.id === id) ?? STATIONS[0];
}

// ---------------------------------------------------------------------------
// Worked examples
//
// Three designs a beginner can open to see how the trade-offs play out. The
// first works, the second fails on data (the classic trap), the third shows
// what deployable panels buy you and what they cost.
// ---------------------------------------------------------------------------

export const EXAMPLE_DESIGNS: Record<string, Design> = {
  'ex-beacon': {
    formFactor: '1U',
    components: {
      structure: 'struct-1u', eps: 'eps-basic', battery: 'batt-10',
      solar: 'solar-body-1u', obc: 'obc-basic', adcs: 'adcs-passive',
      comms: 'comms-vhf', payload: 'pl-beacon',
    },
    attitude: 'tumbling',
    payloadDuty: 0.1,
    dataRateBps: 1200,
    contingency: 0.15,
    orbit: { altitudeKm: 420, inclinationDeg: 51.6, raanDeg: 0, solarLongitudeDeg: 0 },
    stationId: 'amateur-eu',
  },
  'ex-imager': {
    formFactor: '3U',
    components: {
      structure: 'struct-3u', eps: 'eps-mppt', battery: 'batt-20',
      solar: 'solar-body-3u', obc: 'obc-basic', adcs: 'adcs-mtq',
      comms: 'comms-uhf', payload: 'pl-cam-hi',
    },
    attitude: 'nadir',
    payloadDuty: 0.15,
    dataRateBps: 9600,
    contingency: 0.1,
    orbit: { altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 0, solarLongitudeDeg: 0 },
    stationId: 'university',
  },
  'ex-science': {
    formFactor: '6U',
    components: {
      structure: 'struct-6u', eps: 'eps-mppt', battery: 'batt-80',
      solar: 'solar-deploy-6u', obc: 'obc-linux', adcs: 'adcs-wheels',
      comms: 'comms-x', payload: 'pl-sar',
    },
    attitude: 'sun-tracking',
    payloadDuty: 0.15,
    dataRateBps: 10e6,
    contingency: 0.15,
    orbit: { altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 90, solarLongitudeDeg: 0 },
    stationId: 'svalbard',
  },
};
