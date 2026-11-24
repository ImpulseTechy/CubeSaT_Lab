/**
 * Component archetype catalogue.
 *
 * These are ARCHETYPES, not vendor parts. Each is representative of a class of
 * real CubeSat hardware, with values drawn from the public ranges in NASA's
 * Small Spacecraft Technology State-of-the-Art report. We deliberately do not
 * name vendors or copy datasheets: a learner needs to understand the trade,
 * and a wrong vendor number is worse than an honest typical one.
 *
 * Every entry carries a `typicalOf` note so the provenance is visible in-app.
 */

import type { AttitudeMode } from '../physics/power';
import type { Band } from '../physics/link';

export type Subsystem =
  | 'structure'
  | 'eps'
  | 'battery'
  | 'solar'
  | 'obc'
  | 'adcs'
  | 'comms'
  | 'payload';

export interface Component {
  id: string;
  subsystem: Subsystem;
  name: string;
  /** Mass in grams. */
  massG: number;
  /** Continuous power draw in watts (bus load). */
  powerW: number;
  /** Which form factors this part is appropriate for. */
  fits: ('1U' | '1.5U' | '2U' | '3U' | '6U')[];
  typicalOf: string;
  /** Subsystem-specific parameters. */
  solar?: { areaM2: number; efficiency: number; deployable: boolean };
  battery?: { capacityWh: number };
  adcs?: { supports: AttitudeMode[] };
  comms?: { band: Band; txPowerW: number; gainDbi: number; maxRateBps: number };
  payload?: { activePowerW: number; mbPerCapture: number; capturesPerOrbit: number };
}

const ALL: Component['fits'] = ['1U', '1.5U', '2U', '3U', '6U'];

export const CATALOGUE: Component[] = [
  // --- Structure ------------------------------------------------------------
  {
    id: 'struct-1u', subsystem: 'structure', name: '1U frame', massG: 118, powerW: 0,
    fits: ['1U'], typicalOf: 'Machined aluminium 1U primary structure',
  },
  {
    id: 'struct-2u', subsystem: 'structure', name: '2U frame', massG: 215, powerW: 0,
    fits: ['2U'], typicalOf: 'Machined aluminium 2U primary structure',
  },
  {
    id: 'struct-3u', subsystem: 'structure', name: '3U frame', massG: 290, powerW: 0,
    fits: ['3U'], typicalOf: 'Machined aluminium 3U primary structure',
  },
  {
    id: 'struct-6u', subsystem: 'structure', name: '6U frame', massG: 1100, powerW: 0,
    fits: ['6U'], typicalOf: 'Machined aluminium 6U primary structure',
  },

  // --- EPS ------------------------------------------------------------------
  {
    id: 'eps-basic', subsystem: 'eps', name: 'Basic EPS', massG: 90, powerW: 0.15,
    fits: ALL, typicalOf: 'PC/104 power board, unregulated bus, ~90% MPPT',
  },
  {
    id: 'eps-mppt', subsystem: 'eps', name: 'EPS with MPPT', massG: 125, powerW: 0.25,
    fits: ALL, typicalOf: 'Multi-channel MPPT power board, ~93% conversion',
  },

  // --- Batteries ------------------------------------------------------------
  {
    id: 'batt-10', subsystem: 'battery', name: '10 Wh pack', massG: 85, powerW: 0,
    fits: ALL, battery: { capacityWh: 10 }, typicalOf: '2-cell Li-ion 18650 pack',
  },
  {
    id: 'batt-20', subsystem: 'battery', name: '20 Wh pack', massG: 160, powerW: 0,
    fits: ALL, battery: { capacityWh: 20 }, typicalOf: '4-cell Li-ion 18650 pack',
  },
  {
    id: 'batt-40', subsystem: 'battery', name: '40 Wh pack', massG: 310, powerW: 0,
    fits: ['2U', '3U', '6U'], battery: { capacityWh: 40 },
    typicalOf: '8-cell Li-ion pack with heater and protection',
  },
  {
    id: 'batt-80', subsystem: 'battery', name: '80 Wh pack', massG: 600, powerW: 0,
    fits: ['6U'], battery: { capacityWh: 80 }, typicalOf: 'High-capacity 6U pack',
  },

  // --- Solar ----------------------------------------------------------------
  {
    id: 'solar-body-1u', subsystem: 'solar', name: 'Body-mounted (1U)', massG: 60, powerW: 0,
    fits: ['1U'], solar: { areaM2: 0.022, efficiency: 0.30, deployable: false },
    typicalOf: '4 side panels of triple-junction GaAs cells; ~1.4 W orbit-average',
  },
  {
    id: 'solar-body-3u', subsystem: 'solar', name: 'Body-mounted (3U)', massG: 150, powerW: 0,
    fits: ['2U', '3U'], solar: { areaM2: 0.055, efficiency: 0.30, deployable: false },
    typicalOf: '4 long faces of triple-junction GaAs cells; ~3.5 W orbit-average',
  },
  {
    id: 'solar-deploy-3u', subsystem: 'solar', name: 'Deployable wings (3U)', massG: 360, powerW: 0,
    fits: ['3U'], solar: { areaM2: 0.160, efficiency: 0.30, deployable: true },
    typicalOf: 'Two hinged double-fold wings plus body cells; ~10 W orbit-average',
  },
  {
    id: 'solar-body-6u', subsystem: 'solar', name: 'Body-mounted (6U)', massG: 280, powerW: 0,
    fits: ['6U'], solar: { areaM2: 0.110, efficiency: 0.30, deployable: false },
    typicalOf: '6U body-mounted triple-junction array',
  },
  {
    id: 'solar-deploy-6u', subsystem: 'solar', name: 'Deployable wings (6U)', massG: 850, powerW: 0,
    fits: ['6U'], solar: { areaM2: 0.340, efficiency: 0.30, deployable: true },
    typicalOf: 'Dual deployable wings, sun-tracking capable',
  },

  // --- OBC ------------------------------------------------------------------
  {
    id: 'obc-basic', subsystem: 'obc', name: 'Microcontroller OBC', massG: 60, powerW: 0.3,
    fits: ALL, typicalOf: 'Low-power ARM Cortex-M flight computer',
  },
  {
    id: 'obc-linux', subsystem: 'obc', name: 'Linux OBC', massG: 95, powerW: 1.2,
    fits: ['2U', '3U', '6U'], typicalOf: 'ARM Cortex-A single-board computer with storage',
  },

  // --- ADCS -----------------------------------------------------------------
  {
    id: 'adcs-passive', subsystem: 'adcs', name: 'Passive magnets', massG: 30, powerW: 0,
    fits: ALL, adcs: { supports: ['tumbling', 'nadir'] },
    typicalOf: 'Permanent magnet plus hysteresis rods; coarse alignment only',
  },
  {
    id: 'adcs-mtq', subsystem: 'adcs', name: 'Magnetorquers', massG: 110, powerW: 0.6,
    fits: ALL, adcs: { supports: ['tumbling', 'nadir'] },
    typicalOf: '3-axis magnetorquer set with magnetometer; detumble and coarse point',
  },
  {
    id: 'adcs-wheels', subsystem: 'adcs', name: 'Reaction wheels + MTQ', massG: 400, powerW: 1.8,
    fits: ['3U', '6U'], adcs: { supports: ['tumbling', 'nadir', 'sun-tracking'] },
    typicalOf: '3-axis wheels with magnetorquer desaturation and sun sensors',
  },

  // --- Comms ----------------------------------------------------------------
  {
    id: 'comms-uhf', subsystem: 'comms', name: 'UHF transceiver', massG: 85, powerW: 0.2,
    fits: ALL,
    comms: { band: 'UHF', txPowerW: 2, gainDbi: 2, maxRateBps: 19200 },
    typicalOf: 'Amateur-band UHF transceiver with deployable dipole',
  },
  {
    id: 'comms-vhf', subsystem: 'comms', name: 'VHF beacon', massG: 70, powerW: 0.15,
    fits: ALL,
    comms: { band: 'VHF', txPowerW: 1, gainDbi: 0, maxRateBps: 9600 },
    typicalOf: 'Low-rate telemetry beacon',
  },
  {
    id: 'comms-s', subsystem: 'comms', name: 'S-band transmitter', massG: 180, powerW: 0.5,
    fits: ['2U', '3U', '6U'],
    comms: { band: 'S', txPowerW: 2, gainDbi: 6, maxRateBps: 2e6 },
    typicalOf: 'S-band downlink with patch antenna',
  },
  {
    id: 'comms-x', subsystem: 'comms', name: 'X-band transmitter', massG: 340, powerW: 1.0,
    fits: ['3U', '6U'],
    comms: { band: 'X', txPowerW: 3, gainDbi: 14, maxRateBps: 100e6 },
    typicalOf: 'High-rate X-band downlink with directional antenna',
  },

  // --- Payloads -------------------------------------------------------------
  {
    id: 'pl-beacon', subsystem: 'payload', name: 'Telemetry beacon', massG: 20, powerW: 0.1,
    fits: ALL,
    payload: { activePowerW: 0.3, mbPerCapture: 0.002, capturesPerOrbit: 10 },
    typicalOf: 'Housekeeping telemetry only; the simplest useful mission',
  },
  {
    id: 'pl-sensor', subsystem: 'payload', name: 'Science sensor suite', massG: 150, powerW: 0.4,
    fits: ALL,
    payload: { activePowerW: 1.5, mbPerCapture: 0.5, capturesPerOrbit: 8 },
    typicalOf: 'Magnetometer, radiation monitor or similar low-rate instrument',
  },
  {
    id: 'pl-cam-lo', subsystem: 'payload', name: 'Low-res camera', massG: 180, powerW: 0.2,
    fits: ['2U', '3U', '6U'],
    payload: { activePowerW: 2.5, mbPerCapture: 2, capturesPerOrbit: 6 },
    typicalOf: '2 MP Earth-imaging camera, compressed frames',
  },
  {
    id: 'pl-cam-hi', subsystem: 'payload', name: 'High-res imager', massG: 900, powerW: 0.5,
    fits: ['3U', '6U'],
    payload: { activePowerW: 6.0, mbPerCapture: 25, capturesPerOrbit: 8 },
    typicalOf: 'Multispectral imager with optics; the classic data-closure trap',
  },
  {
    id: 'pl-sar', subsystem: 'payload', name: 'Experimental payload (power hungry)', massG: 1400, powerW: 1.0,
    fits: ['6U'],
    payload: { activePowerW: 18.0, mbPerCapture: 80, capturesPerOrbit: 4 },
    typicalOf: 'High-power experiment; will not close without deployables',
  },
];

export function byId(id: string): Component | undefined {
  return CATALOGUE.find((c) => c.id === id);
}

export function bySubsystem(s: Subsystem, fits?: string): Component[] {
  return CATALOGUE.filter(
    (c) => c.subsystem === s && (!fits || c.fits.includes(fits as never)),
  );
}

export const CATALOGUE_SOURCE =
  "Representative archetypes with values in the public ranges of NASA's Small Spacecraft Technology State-of-the-Art report. Not vendor data.";
