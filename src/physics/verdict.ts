/**
 * Mission closure verdict and diagnosis.
 *
 * This is the product. Every other module exists to make these three cards
 * possible, and the diagnosis text is what no competitor produces: not
 * "mission failed" but a specific cause and a fix that names its cross-
 * subsystem cost.
 */

import { byId } from '../data/catalogue';
import { DOD_WARN_FRACTION, LINK_MARGIN_GO_DB, LINK_MARGIN_WARN_DB } from './constants';
import {
  batteryConfig,
  loadProfile,
  massBudget,
  payloadDataPerOrbitMb,
  radioConfig,
  solarConfig,
  stationById,
  type Design,
  type MassBudget,
} from './design';
import {
  dataBalance,
  passStatistics,
  worstCaseLink,
  type DataBalance,
  type LinkResult,
  type PassStats,
} from './link';
import { eclipseDuration, orbitalPeriod, orbitsPerDay } from './orbit';
import {
  energyBalance,
  simulateSoc,
  type EnergyBalance,
  type SocResult,
} from './power';
import { formatNumber } from './trace';

export type Status = 'go' | 'warn' | 'nogo';

export interface VerdictCard {
  id: 'mass' | 'power' | 'data';
  title: string;
  status: Status;
  /** One-line headline figure, e.g. "1,165 g margin". */
  headline: string;
  /** What is wrong (or right), in plain language. */
  diagnosis: string;
  /** What to do about it, naming the cross-subsystem cost. */
  fix: string | null;
}

export interface MissionVerdict {
  cards: VerdictCard[];
  overall: Status;
  mass: MassBudget;
  energy: EnergyBalance;
  soc: SocResult;
  link: LinkResult;
  passes: PassStats;
  data: DataBalance;
}

const g = (n: number) => `${Math.round(n).toLocaleString()} g`;

function worst(statuses: Status[]): Status {
  if (statuses.includes('nogo')) return 'nogo';
  if (statuses.includes('warn')) return 'warn';
  return 'go';
}

// ---------------------------------------------------------------------------
// Mass
// ---------------------------------------------------------------------------

function massCard(d: Design, mass: MassBudget): VerdictCard {
  const margin = mass.marginG.value;
  const limitG = mass.limitKg * 1000;
  const heaviest = mass.items[0];

  if (margin < 0) {
    return {
      id: 'mass', title: 'Mass', status: 'nogo',
      headline: `${g(-margin)} over the ${d.formFactor} limit`,
      diagnosis:
        `Your ${d.formFactor} totals ${g(mass.totalMassG.value)} including ` +
        `${(d.contingency * 100).toFixed(0)}% contingency, against a ${mass.limitKg} kg ` +
        `CDS limit. The heaviest item is the ${heaviest.name} at ${g(heaviest.massG)}.`,
      fix:
        `Drop to a lighter ${heaviest.subsystem}, or move up a form factor — ` +
        `a larger bus raises the limit but costs volume, launch price and often power.`,
    };
  }

  const marginFrac = margin / limitG;
  if (marginFrac < 0.1) {
    return {
      id: 'mass', title: 'Mass', status: 'warn',
      headline: `${g(margin)} margin (${(marginFrac * 100).toFixed(0)}%)`,
      diagnosis:
        `You are within the ${mass.limitKg} kg limit but with only ` +
        `${(marginFrac * 100).toFixed(0)}% to spare. Real builds grow during integration — ` +
        `harness, shims and brackets are rarely in the first estimate.`,
      fix: `Aim for 10–20% margin at this stage. Raising contingency models that honestly.`,
    };
  }

  return {
    id: 'mass', title: 'Mass', status: 'go',
    headline: `${g(margin)} margin`,
    diagnosis:
      `${g(mass.totalMassG.value)} against a ${mass.limitKg} kg limit for ${d.formFactor}, ` +
      `including ${(d.contingency * 100).toFixed(0)}% contingency.`,
    fix: null,
  };
}

// ---------------------------------------------------------------------------
// Power
// ---------------------------------------------------------------------------

function powerCard(
  d: Design,
  energy: EnergyBalance,
  soc: SocResult,
  mass: MassBudget,
  battery: { capacityWh: number },
): VerdictCard {
  const gen = energy.generationWh.value;
  const use = energy.loadWh.value;
  const margin = energy.marginWh.value;
  const eclipseMin = eclipseDuration(d.orbit).value / 60;
  const avgGenW = (gen * 3600) / orbitalPeriod(d.orbit).value;
  const avgLoadW = (use * 3600) / orbitalPeriod(d.orbit).value;
  const payload = d.components.payload ? byId(d.components.payload) : undefined;

  // The cross-subsystem fix: what would deployables cost in mass?
  const deployable = d.formFactor === '6U' ? byId('solar-deploy-6u') : byId('solar-deploy-3u');
  const current = d.components.solar ? byId(d.components.solar) : undefined;
  const upgradeCostG =
    deployable && current && deployable.id !== current.id
      ? deployable.massG - current.massG
      : null;
  const canAffordUpgrade = upgradeCostG !== null && mass.marginG.value > upgradeCostG;

  /**
   * Build the fix sentence for any negative-energy case.
   *
   * This is the sentence the whole product exists for, so both the brownout
   * and the slow-drain path get it in full: the duty cycle that would work,
   * plus what the array upgrade would cost in mass and whether the design can
   * actually afford it.
   */
  const energyFix = (): string => {
    const suggestedDuty = Math.max(
      0.02,
      d.payloadDuty * (avgGenW / Math.max(avgLoadW, 0.01)) * 0.85,
    );
    const upgrade =
      upgradeCostG !== null && upgradeCostG > 0
        ? canAffordUpgrade
          ? ` Or fit ${deployable!.name} (+${g(upgradeCostG)}, which you can afford from your ${g(mass.marginG.value)} mass margin).`
          : ` Fitting ${deployable!.name} would add ${g(upgradeCostG)}, which you cannot afford from your ${g(mass.marginG.value)} mass margin — so the duty cycle is your lever.`
        : ` Your array is already the largest that fits a ${d.formFactor}, so the duty cycle is your lever.`;
    return (
      `Cut ${payload?.name ?? 'payload'} duty cycle from ` +
      `${(d.payloadDuty * 100).toFixed(0)}% to about ` +
      `${(suggestedDuty * 100).toFixed(0)}%.${upgrade}`
    );
  };

  if (soc.brownoutOrbit !== null) {
    return {
      id: 'power', title: 'Power', status: 'nogo',
      headline: `Brownout on orbit ${soc.brownoutOrbit}`,
      diagnosis:
        `Battery reached ${(soc.minSoc * 100).toFixed(0)}% state of charge on orbit ` +
        `${soc.brownoutOrbit}. You draw ${formatNumber(avgLoadW)} W orbit-average against ` +
        `${formatNumber(avgGenW)} W generated, a deficit of ${formatNumber(-margin)} Wh ` +
        `per orbit, and you spend ${eclipseMin.toFixed(1)} min of every orbit in eclipse.`,
      fix: energyFix(),
    };
  }

  if (margin < 0 || soc.divergent) {
    // How long until it does hit the floor? This is more useful than "it will".
    const usableWh = (soc.samples[0].soc - 0.2) * battery.capacityWh;
    const orbitsToEmpty = margin < 0 ? Math.ceil(usableWh / -margin) : null;
    const timeline =
      orbitsToEmpty !== null && Number.isFinite(orbitsToEmpty)
        ? ` At ${formatNumber(-margin)} Wh lost per orbit it reaches the 20% floor in about ` +
          `${orbitsToEmpty} orbits — roughly ${(orbitsToEmpty / orbitsPerDay(d.orbit)).toFixed(1)} days.`
        : '';
    return {
      id: 'power', title: 'Power', status: 'nogo',
      headline: `${formatNumber(margin)} Wh/orbit deficit`,
      diagnosis:
        `Consumption (${formatNumber(use)} Wh) exceeds generation (${formatNumber(gen)} Wh) ` +
        `every orbit, drawing ${formatNumber(avgLoadW)} W against ${formatNumber(avgGenW)} W. ` +
        `The battery has not hit the floor within the simulated window, but it will.${timeline}`,
      fix: energyFix(),
    };
  }

  if (soc.depthOfDischarge > DOD_WARN_FRACTION) {
    return {
      id: 'power', title: 'Power', status: 'warn',
      headline: `${(soc.depthOfDischarge * 100).toFixed(0)}% depth of discharge`,
      diagnosis:
        `The design closes with ${formatNumber(margin)} Wh/orbit to spare, but the battery ` +
        `cycles ${(soc.depthOfDischarge * 100).toFixed(0)}% deep every orbit. In LEO that is ` +
        `about 5,500 cycles a year, and deep cycling shortens pack life.`,
      fix: `Keep depth of discharge under ${(DOD_WARN_FRACTION * 100).toFixed(0)}% — a larger battery or a lower duty cycle.`,
    };
  }

  const marginPct = gen > 0 ? (margin / gen) * 100 : 0;
  if (marginPct < 15) {
    return {
      id: 'power', title: 'Power', status: 'warn',
      headline: `${formatNumber(margin)} Wh/orbit margin (${marginPct.toFixed(0)}%)`,
      diagnosis:
        `It closes, but with only ${marginPct.toFixed(0)}% energy margin. Array output drops ` +
        `with cell degradation and off-pointing, neither of which is modelled here.`,
      fix: `Aim for 20% or more at this stage of design.`,
    };
  }

  return {
    id: 'power', title: 'Power', status: 'go',
    headline: `${formatNumber(margin)} Wh/orbit margin`,
    diagnosis:
      `Generating ${formatNumber(gen)} Wh per orbit against ${formatNumber(use)} Wh consumed, ` +
      `cycling ${(soc.depthOfDischarge * 100).toFixed(0)}% deep through a ` +
      `${eclipseMin.toFixed(1)} min eclipse.`,
    fix: null,
  };
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

function dataCard(
  d: Design,
  data: DataBalance,
  link: LinkResult,
  passes: PassStats,
): VerdictCard {
  const station = stationById(d.stationId);
  const gen = data.generatedMbPerDay.value;
  const down = data.downlinkedMbPerDay.value;
  const payload = d.components.payload ? byId(d.components.payload) : undefined;
  const radio = radioConfig(d);

  if (passes.passesPerDay.value === 0) {
    return {
      id: 'data', title: 'Data', status: 'nogo',
      headline: 'No passes at all',
      diagnosis:
        `${station.name} at ${station.latDeg.toFixed(0)}° latitude never sees a satellite ` +
        `in a ${d.orbit.inclinationDeg.toFixed(1)}° inclination orbit. The ground track ` +
        `never reaches that far from the equator.`,
      fix: `Raise the inclination to at least ${Math.abs(station.latDeg).toFixed(0)}°, or pick a station closer to the equator.`,
    };
  }

  if (!link.closes) {
    const maxRate = Math.floor(
      radio.dataRateBps * Math.pow(10, link.marginDb.value / 10),
    );
    return {
      id: 'data', title: 'Data', status: 'nogo',
      headline: `Link short by ${formatNumber(-link.marginDb.value)} dB`,
      diagnosis:
        `At ${(radio.dataRateBps / 1000).toFixed(1)} kbps the link to ${station.name} gives ` +
        `Eb/N0 of ${formatNumber(link.ebN0Db.value)} dB at the ${station.minElevationDeg}° ` +
        `horizon, below the ${formatNumber(link.ebN0Db.value - link.marginDb.value)} dB needed. ` +
        `You get ${passes.passesPerDay.value} passes a day and none of them decode.`,
      fix:
        `Drop the rate to about ${(maxRate / 1000).toFixed(1)} kbps, use a higher-gain ground ` +
        `station, or move to a higher band — note every 10x in rate costs 10 dB.`,
    };
  }

  if (!data.closes) {
    const ratio = down > 0 ? gen / down : Infinity;
    const neededRate = (gen * 8 * 1e6) / (passes.contactMinutesPerDay.value * 60);
    return {
      id: 'data', title: 'Data', status: 'nogo',
      headline: `${formatNumber(gen)} MB/day generated, ${formatNumber(down)} MB/day home`,
      diagnosis:
        `Your ${payload?.name ?? 'payload'} produces ${formatNumber(gen)} MB a day, but ` +
        `${passes.passesPerDay.value} passes totalling ` +
        `${formatNumber(passes.contactMinutesPerDay.value)} minutes at ` +
        `${(radio.dataRateBps / 1000).toFixed(1)} kbps only bring ${formatNumber(down)} MB home. ` +
        `The buffer fills ${formatNumber(ratio)}x faster than you can empty it, so ` +
        `${formatNumber(gen - down)} MB a day is lost.`,
      fix:
        `You need about ${(neededRate / 1000).toFixed(0)} kbps to clear the backlog. Either ` +
        `cut the payload duty cycle from ${(d.payloadDuty * 100).toFixed(0)}%, compress harder, ` +
        `or move to a faster band — S-band buys roughly 100x the rate for about 95 g more and ` +
        `a dish at the ground station.`,
    };
  }

  const utilisation = gen / Math.max(down, 1e-9);
  if (link.marginDb.value < LINK_MARGIN_WARN_DB) {
    return {
      id: 'data', title: 'Data', status: 'warn',
      headline: `Link margin only ${formatNumber(link.marginDb.value)} dB`,
      diagnosis:
        `The data closes, but with ${formatNumber(link.marginDb.value)} dB of link margin at ` +
        `the horizon. Rain, pointing error and antenna nulls are not modelled here and will ` +
        `eat that quickly.`,
      fix: `Aim for ${LINK_MARGIN_GO_DB} dB. Lower the rate or improve the ground station.`,
    };
  }

  if (utilisation > 0.8) {
    return {
      id: 'data', title: 'Data', status: 'warn',
      headline: `${(utilisation * 100).toFixed(0)}% of downlink capacity used`,
      diagnosis:
        `You clear the backlog, but only just: ${formatNumber(gen)} MB generated against ` +
        `${formatNumber(down)} MB of capacity. A missed pass puts you behind.`,
      fix: `Leave headroom for missed passes — they happen.`,
    };
  }

  return {
    id: 'data', title: 'Data', status: 'go',
    headline: `${formatNumber(down)} MB/day capacity, ${formatNumber(gen)} MB/day used`,
    diagnosis:
      `${passes.passesPerDay.value} passes a day over ${station.name}, ` +
      `${formatNumber(passes.contactMinutesPerDay.value)} minutes of contact, ` +
      `${formatNumber(link.marginDb.value)} dB link margin at the horizon.`,
    fix: null,
  };
}

// ---------------------------------------------------------------------------
// Assemble
// ---------------------------------------------------------------------------

export function evaluate(d: Design, orbits = 6): MissionVerdict {
  const station = stationById(d.stationId);
  const solar = solarConfig(d);
  const battery = batteryConfig(d);
  const load = loadProfile(d);
  const radio = radioConfig(d);

  const mass = massBudget(d);
  const energy = energyBalance(d.orbit, solar, d.attitude, load);
  const soc = simulateSoc(d.orbit, solar, d.attitude, load, battery, orbits);
  const link = worstCaseLink(d.orbit, radio, station);
  const passes = passStatistics(d.orbit, station);
  const data = dataBalance(
    d.orbit, radio, station, payloadDataPerOrbitMb(d).value, link,
  );

  const cards = [
    massCard(d, mass),
    powerCard(d, energy, soc, mass, battery),
    dataCard(d, data, link, passes),
  ];

  return {
    cards,
    overall: worst(cards.map((c) => c.status)),
    mass, energy, soc, link, passes, data,
  };
}

/** Orbits per day, exposed for the UI summary strip. */
export { orbitsPerDay };
