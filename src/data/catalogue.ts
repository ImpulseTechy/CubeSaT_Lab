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
    fits: ['1U'], typicalOf: 'A single aluminium cube, 10 cm on each side.',
  },
  {
    id: 'struct-2u', subsystem: 'structure', name: '2U frame', massG: 215, powerW: 0,
    fits: ['2U'], typicalOf: 'Two cubes stacked. More room inside, more weight.',
  },
  {
    id: 'struct-3u', subsystem: 'structure', name: '3U frame', massG: 290, powerW: 0,
    fits: ['3U'], typicalOf: 'Three cubes stacked into a loaf shape. The most common student size.',
  },
  {
    id: 'struct-6u', subsystem: 'structure', name: '6U frame', massG: 1100, powerW: 0,
    fits: ['6U'], typicalOf: 'Six cubes, roughly a shoebox. Room for serious instruments.',
  },

  // --- EPS ------------------------------------------------------------------
  {
    id: 'eps-basic', subsystem: 'eps', name: 'Basic EPS', massG: 90, powerW: 0.15,
    fits: ALL, typicalOf: 'Shares electricity to the other parts. Wastes about 10% of it as heat.',
  },
  {
    id: 'eps-mppt', subsystem: 'eps', name: 'EPS with MPPT', massG: 125, powerW: 0.25,
    fits: ALL, typicalOf: 'A smarter version that squeezes more usable power out of the panels. Wastes about 7%.',
  },

  // --- Batteries ------------------------------------------------------------
  {
    id: 'batt-10', subsystem: 'battery', name: '10 Wh pack', massG: 85, powerW: 0,
    fits: ALL, battery: { capacityWh: 10 }, typicalOf: 'Two rechargeable cells, about the size of two AA batteries. Holds roughly as much as a phone battery.',
  },
  {
    id: 'batt-20', subsystem: 'battery', name: '20 Wh pack', massG: 160, powerW: 0,
    fits: ALL, battery: { capacityWh: 20 }, typicalOf: 'Four rechargeable cells. Twice the store, twice the weight.',
  },
  {
    id: 'batt-40', subsystem: 'battery', name: '40 Wh pack', massG: 310, powerW: 0,
    fits: ['2U', '3U', '6U'], battery: { capacityWh: 40 },
    typicalOf: 'Eight cells with a built-in warmer, because batteries will not charge when frozen.',
  },
  {
    id: 'batt-80', subsystem: 'battery', name: '80 Wh pack', massG: 600, powerW: 0,
    fits: ['6U'], battery: { capacityWh: 80 }, typicalOf: 'A large pack for a big satellite that uses a lot of power.',
  },

  // --- Solar ----------------------------------------------------------------
  {
    id: 'solar-body-1u', subsystem: 'solar', name: 'Body-mounted (1U)', massG: 60, powerW: 0,
    fits: ['1U'], solar: { areaM2: 0.022, efficiency: 0.30, deployable: false },
    typicalOf: 'Cells glued to the four sides. Makes about 1.4 watts on average - enough for a simple radio beacon.',
  },
  {
    id: 'solar-body-3u', subsystem: 'solar', name: 'Body-mounted (3U)', massG: 150, powerW: 0,
    fits: ['2U', '3U'], solar: { areaM2: 0.055, efficiency: 0.30, deployable: false },
    typicalOf: 'Cells on the four long sides. About 3.5 watts on average - enough for a small camera.',
  },
  {
    id: 'solar-deploy-3u', subsystem: 'solar', name: 'Deployable wings (3U)', massG: 360, powerW: 0,
    fits: ['3U'], solar: { areaM2: 0.160, efficiency: 0.30, deployable: true },
    typicalOf: 'Wings that fold out once in space, roughly tripling the sunlight caught. About 10 watts - but they add real weight.',
  },
  {
    id: 'solar-body-6u', subsystem: 'solar', name: 'Body-mounted (6U)', massG: 280, powerW: 0,
    fits: ['6U'], solar: { areaM2: 0.110, efficiency: 0.30, deployable: false },
    typicalOf: 'Cells covering the body of a 6U. About 7 watts on average.',
  },
  {
    id: 'solar-deploy-6u', subsystem: 'solar', name: 'Deployable wings (6U)', massG: 850, powerW: 0,
    fits: ['6U'], solar: { areaM2: 0.340, efficiency: 0.30, deployable: true },
    typicalOf: 'Big wings that unfold and can turn to face the Sun. About 22 watts, and the heaviest option here.',
  },

  // --- OBC ------------------------------------------------------------------
  {
    id: 'obc-basic', subsystem: 'obc', name: 'Microcontroller OBC', massG: 60, powerW: 0.3,
    fits: ALL, typicalOf: 'A simple, very low-power computer. Does one job reliably.',
  },
  {
    id: 'obc-linux', subsystem: 'obc', name: 'Linux OBC', massG: 95, powerW: 1.2,
    fits: ['2U', '3U', '6U'], typicalOf: 'A proper little computer that can process images on board - but uses four times the power.',
  },

  // --- ADCS -----------------------------------------------------------------
  {
    id: 'adcs-passive', subsystem: 'adcs', name: 'Passive magnets', massG: 30, powerW: 0,
    fits: ALL, adcs: { supports: ['tumbling', 'nadir'] },
    typicalOf: 'A fixed magnet that lets Earth\u2019s magnetic field line the satellite up, like a compass needle. Free to run, but you cannot aim it.',
  },
  {
    id: 'adcs-mtq', subsystem: 'adcs', name: 'Magnetorquers', massG: 110, powerW: 0.6,
    fits: ALL, adcs: { supports: ['tumbling', 'nadir'] },
    typicalOf: 'Electromagnets that push against Earth\u2019s magnetic field to stop the satellite tumbling and point it roughly.',
  },
  {
    id: 'adcs-wheels', subsystem: 'adcs', name: 'Reaction wheels + MTQ', massG: 400, powerW: 1.8,
    fits: ['3U', '6U'], adcs: { supports: ['tumbling', 'nadir', 'sun-tracking'] },
    typicalOf: 'Spinning wheels inside the satellite that let it turn precisely and hold still. Heavy and power-hungry, but the only way to aim accurately.',
  },

  // --- Comms ----------------------------------------------------------------
  {
    id: 'comms-uhf', subsystem: 'comms', name: 'UHF transceiver', massG: 85, powerW: 0.2,
    fits: ALL,
    comms: { band: 'UHF', txPowerW: 2, gainDbi: 2, maxRateBps: 19200 },
    typicalOf: 'A hobby-radio transmitter with a wire aerial. Cheap and proven, but slow - good for status messages, not pictures.',
  },
  {
    id: 'comms-vhf', subsystem: 'comms', name: 'VHF beacon', massG: 70, powerW: 0.15,
    fits: ALL,
    comms: { band: 'VHF', txPowerW: 1, gainDbi: 0, maxRateBps: 9600 },
    typicalOf: 'Sends a simple heartbeat signal so you know it is alive. Nothing more.',
  },
  {
    id: 'comms-s', subsystem: 'comms', name: 'S-band transmitter', massG: 180, powerW: 0.5,
    fits: ['2U', '3U', '6U'],
    comms: { band: 'S', txPowerW: 2, gainDbi: 6, maxRateBps: 2e6 },
    typicalOf: 'A faster radio, about 100 times quicker than the hobby one. Needs a dish on the ground to hear it.',
  },
  {
    id: 'comms-x', subsystem: 'comms', name: 'X-band transmitter', massG: 340, powerW: 1.0,
    fits: ['3U', '6U'],
    comms: { band: 'X', txPowerW: 3, gainDbi: 14, maxRateBps: 100e6 },
    typicalOf: 'A very fast radio for sending lots of images. Heavy, power-hungry, and needs a serious ground station.',
  },

  // --- Payloads -------------------------------------------------------------
  {
    id: 'pl-beacon', subsystem: 'payload', name: 'Telemetry beacon', massG: 20, powerW: 0.1,
    fits: ALL,
    payload: { activePowerW: 0.3, mbPerCapture: 0.002, capturesPerOrbit: 10 },
    typicalOf: 'Just reports its own health - temperature, battery, status. The simplest mission that is still worth flying.',
  },
  {
    id: 'pl-sensor', subsystem: 'payload', name: 'Science sensor suite', massG: 150, powerW: 0.4,
    fits: ALL,
    payload: { activePowerW: 1.5, mbPerCapture: 0.5, capturesPerOrbit: 8 },
    typicalOf: 'Measures something invisible, like magnetic fields or radiation. Small readings, so very little data to send home.',
  },
  {
    id: 'pl-cam-lo', subsystem: 'payload', name: 'Low-res camera', massG: 180, powerW: 0.2,
    fits: ['2U', '3U', '6U'],
    payload: { activePowerW: 2.5, mbPerCapture: 2, capturesPerOrbit: 6 },
    typicalOf: 'Takes modest photos of Earth. Each one is small enough that you might actually get it home.',
  },
  {
    id: 'pl-cam-hi', subsystem: 'payload', name: 'High-res imager', massG: 900, powerW: 0.5,
    fits: ['3U', '6U'],
    payload: { activePowerW: 6.0, mbPerCapture: 25, capturesPerOrbit: 8 },
    typicalOf: 'A proper camera with real optics. Beautiful images - and the classic trap, because it makes far more data than a small radio can ever send.',
  },
  {
    id: 'pl-sar', subsystem: 'payload', name: 'Experimental payload (power hungry)', massG: 1400, powerW: 1.0,
    fits: ['6U'],
    payload: { activePowerW: 18.0, mbPerCapture: 80, capturesPerOrbit: 4 },
    typicalOf: 'A demanding experiment that eats electricity. It will flatten any satellite without fold-out solar wings.',
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
  "These are realistic examples, not specific products you can buy. The weights and power figures sit inside the published ranges in NASA's Small Spacecraft Technology State-of-the-Art report, so the trade-offs you learn here are the real ones.";
