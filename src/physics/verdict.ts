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
  /**
   * The same finding in engineering language, for a learner who wants the real
   * vocabulary. Shown behind a toggle, never instead of the plain version.
   */
  technical?: string;
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

/** Plain-language names for subsystems, for use inside sentences. */
const SUBSYSTEM_PLAIN: Record<string, string> = {
  structure: 'frame',
  eps: 'power board',
  battery: 'battery',
  solar: 'solar panel',
  obc: 'computer',
  adcs: 'pointing system',
  comms: 'radio',
  payload: 'instrument',
};

/** Round to something a person would actually say out loud. */
const say = (n: number, unit: string) => `${formatNumber(n)} ${unit}`;

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
      id: 'mass', title: 'Weight', status: 'nogo',
      headline: `${g(-margin)} too heavy`,
      diagnosis:
        `Your satellite weighs ${g(mass.totalMassG.value)}, but a ${d.formFactor} is only ` +
        `allowed to weigh ${mass.limitKg} kg. It will not be accepted for launch. ` +
        `The heaviest single part is the ${heaviest.name} at ${g(heaviest.massG)}.`,
      fix:
        `Pick a lighter ${SUBSYSTEM_PLAIN[heaviest.subsystem]}, or choose a bigger satellite ` +
        `size. A bigger one may carry more weight, but it costs more to launch and needs ` +
        `more power to run.`,
      technical:
        `Total ${g(mass.totalMassG.value)} including ${(d.contingency * 100).toFixed(0)}% ` +
        `contingency exceeds the ${mass.limitKg} kg CDS Rev. 14.1 allowance for ${d.formFactor}.`,
    };
  }

  const marginFrac = margin / limitG;
  if (marginFrac < 0.1) {
    return {
      id: 'mass', title: 'Weight', status: 'warn',
      headline: `Only ${g(margin)} of weight to spare`,
      diagnosis:
        `You are under the ${mass.limitKg} kg limit, but only just — ` +
        `${(marginFrac * 100).toFixed(0)}% spare. Real satellites always get heavier while ` +
        `they are being built: wiring, screws, brackets and glue are never in the first guess, ` +
        `and they are never weightless.`,
      fix:
        `Leave yourself 10–20% spare weight at this stage. You can model that honestly by ` +
        `raising the spare-weight setting on the left.`,
      technical:
        `Mass margin ${(marginFrac * 100).toFixed(0)}% of the ${mass.limitKg} kg allowance.`,
    };
  }

  return {
    id: 'mass', title: 'Weight', status: 'go',
    headline: `${g(margin)} of weight to spare`,
    diagnosis:
      `Your satellite weighs ${g(mass.totalMassG.value)} and a ${d.formFactor} may weigh up ` +
      `to ${mass.limitKg} kg, so you have comfortable room left. That spare weight is what ` +
      `lets you add bigger solar panels or a better radio later if you need them.`,
    fix: null,
    technical:
      `${g(mass.totalMassG.value)} against the ${mass.limitKg} kg CDS Rev. 14.1 allowance, ` +
      `including ${(d.contingency * 100).toFixed(0)}% contingency.`,
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
          ? ` Or fit ${deployable!.name}, which fold out to catch more sunlight. They add ${g(upgradeCostG)}, and you have ${g(mass.marginG.value)} of spare weight, so you can afford them.`
          : ` Bigger panels (${deployable!.name}) would add ${g(upgradeCostG)}, but you only have ${g(mass.marginG.value)} of spare weight — so running the instrument less is your only option here.`
        : ` Your panels are already the largest that fit a ${d.formFactor}, so running the instrument less is your only option.`;
    return (
      `Run the ${payload?.name ?? 'instrument'} less often — turn it down from ` +
      `${(d.payloadDuty * 100).toFixed(0)}% of each lap to about ` +
      `${(suggestedDuty * 100).toFixed(0)}%.${upgrade}`
    );
  };

  if (soc.brownoutOrbit !== null) {
    return {
      id: 'power', title: 'Staying powered', status: 'nogo',
      headline: `Battery dies on lap ${soc.brownoutOrbit}`,
      diagnosis:
        `Your satellite uses ${say(avgLoadW, 'watts')} on average but its panels only make ` +
        `${say(avgGenW, 'watts')}. It spends more than it earns on every lap, and after ` +
        `${soc.brownoutOrbit} laps the battery is down to ${(soc.minSoc * 100).toFixed(0)}% ` +
        `and the satellite shuts down. It does not come back. ` +
        `The problem is worst because ${eclipseMin.toFixed(0)} minutes of every lap are spent ` +
        `in Earth's shadow, where the panels make nothing at all.`,
      fix: energyFix(),
      technical:
        `Brownout at orbit ${soc.brownoutOrbit}; ${formatNumber(avgLoadW)} W orbit-average ` +
        `load against ${formatNumber(avgGenW)} W generation, ${formatNumber(-margin)} Wh/orbit ` +
        `deficit, eclipse ${eclipseMin.toFixed(1)} min.`,
    };
  }

  if (margin < 0 || soc.divergent) {
    // How long until it does hit the floor? This is more useful than "it will".
    const usableWh = (soc.samples[0].soc - 0.2) * battery.capacityWh;
    const orbitsToEmpty = margin < 0 ? Math.ceil(usableWh / -margin) : null;
    const timeline =
      orbitsToEmpty !== null && Number.isFinite(orbitsToEmpty)
        ? ` At this rate the battery is flat in about ${orbitsToEmpty} laps — ` +
          `roughly ${(orbitsToEmpty / orbitsPerDay(d.orbit)).toFixed(1)} days after launch.`
        : '';
    return {
      id: 'power', title: 'Staying powered', status: 'nogo',
      headline: `Slowly running the battery flat`,
      diagnosis:
        `Your satellite uses ${say(avgLoadW, 'watts')} but only makes ${say(avgGenW, 'watts')}, ` +
        `so it loses a little energy on every lap. Nothing looks wrong yet — the battery still ` +
        `has charge — but it is heading one way only.${timeline}`,
      fix: energyFix(),
      technical:
        `Negative energy balance: ${formatNumber(use)} Wh consumed against ` +
        `${formatNumber(gen)} Wh generated per orbit.`,
    };
  }

  if (soc.depthOfDischarge > DOD_WARN_FRACTION) {
    return {
      id: 'power', title: 'Staying powered', status: 'warn',
      headline: `Battery drains ${(soc.depthOfDischarge * 100).toFixed(0)}% every lap`,
      diagnosis:
        `There is enough energy overall, but the battery is being worked hard: it drops ` +
        `${(soc.depthOfDischarge * 100).toFixed(0)}% and recharges on every single lap. ` +
        `Your satellite goes round about 5,500 times a year, and batteries wear out faster ` +
        `the deeper you drain them each time.`,
      fix:
        `Keep the drain under ${(DOD_WARN_FRACTION * 100).toFixed(0)}% so the battery lasts ` +
        `for years rather than months — either fit a bigger battery or run the instrument less often.`,
      technical:
        `Depth of discharge ${(soc.depthOfDischarge * 100).toFixed(0)}% per orbit at roughly ` +
        `5,500 cycles/year in LEO; energy margin ${formatNumber(margin)} Wh/orbit.`,
    };
  }

  const marginPct = gen > 0 ? (margin / gen) * 100 : 0;
  if (marginPct < 15) {
    return {
      id: 'power', title: 'Staying powered', status: 'warn',
      headline: `Power works, but only just`,
      diagnosis:
        `You make ${marginPct.toFixed(0)}% more energy than you use. That is positive, but it ` +
        `is a thin cushion. Solar panels get slowly weaker in space, and if the satellite ` +
        `points imperfectly they make less than planned — neither of which this model accounts for.`,
      fix:
        `Aim for 20% or more spare energy at this stage, so real-world losses do not tip you ` +
        `into the red.`,
      technical: `Energy margin ${formatNumber(margin)} Wh/orbit (${marginPct.toFixed(0)}%).`,
    };
  }

  return {
    id: 'power', title: 'Staying powered', status: 'go',
    headline: `Makes ${marginPct.toFixed(0)}% more energy than it uses`,
    diagnosis:
      `The panels make ${say(avgGenW, 'watts')} on average and the satellite uses ` +
      `${say(avgLoadW, 'watts')}, so the battery refills every lap. It dips ` +
      `${(soc.depthOfDischarge * 100).toFixed(0)}% during the ${eclipseMin.toFixed(0)} minutes ` +
      `spent in Earth's shadow, then recharges in sunlight.`,
    fix: null,
    technical:
      `${formatNumber(gen)} Wh generated against ${formatNumber(use)} Wh consumed per orbit; ` +
      `depth of discharge ${(soc.depthOfDischarge * 100).toFixed(0)}%.`,
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
      id: 'data', title: 'Getting data home', status: 'nogo',
      headline: `Your satellite never flies over the antenna`,
      diagnosis:
        `${station.name} sits at ${Math.abs(station.latDeg).toFixed(0)}° latitude, but your ` +
        `orbit is tilted only ${d.orbit.inclinationDeg.toFixed(0)}°, so the satellite never ` +
        `travels that far from the equator. It is a perfectly good satellite that your antenna ` +
        `will simply never see.`,
      fix:
        `Tilt the orbit to at least ${Math.abs(station.latDeg).toFixed(0)}° so the satellite ` +
        `flies far enough north and south, or choose a ground station nearer the equator.`,
      technical:
        `Station latitude ${station.latDeg.toFixed(1)}° lies outside the ` +
        `${d.orbit.inclinationDeg.toFixed(1)}° inclination ground-track band.`,
    };
  }

  if (!link.closes) {
    const maxRate = Math.floor(
      radio.dataRateBps * Math.pow(10, link.marginDb.value / 10),
    );
    return {
      id: 'data', title: 'Getting data home', status: 'nogo',
      headline: `Signal too weak to understand`,
      diagnosis:
        `Your satellite flies over ${station.name} ${passes.passesPerDay.value} times a day, ` +
        `but the signal arriving is too faint to make sense of — it is ` +
        `${formatNumber(-link.marginDb.value)} dB short, meaning roughly ` +
        `${formatNumber(Math.pow(10, -link.marginDb.value / 10))} times weaker than it needs ` +
        `to be. Being overhead is not the same as being heard.`,
      fix:
        `Send the data more slowly — about ${(maxRate / 1000).toFixed(0)} kbps would work. ` +
        `Sending slower gives each piece of data more signal strength. Or use a bigger ` +
        `ground antenna, which is usually cheaper than changing the satellite.`,
      technical:
        `Eb/N0 ${formatNumber(link.ebN0Db.value)} dB at ${station.minElevationDeg}° elevation ` +
        `against ${formatNumber(link.ebN0Db.value - link.marginDb.value)} dB required; ` +
        `margin ${formatNumber(link.marginDb.value)} dB at ` +
        `${(radio.dataRateBps / 1000).toFixed(1)} kbps.`,
    };
  }

  if (!data.closes) {
    const ratio = down > 0 ? gen / down : Infinity;
    const neededRate = (gen * 8 * 1e6) / (passes.contactMinutesPerDay.value * 60);
    return {
      id: 'data', title: 'Getting data home', status: 'nogo',
      headline: `Making ${formatNumber(ratio)}x more data than you can send`,
      diagnosis:
        `Your ${payload?.name ?? 'instrument'} records ${formatNumber(gen)} MB a day. But the ` +
        `satellite only flies over ${station.name} ${passes.passesPerDay.value} times a day, ` +
        `for ${formatNumber(passes.contactMinutesPerDay.value)} minutes in total, which is only ` +
        `enough to send ${formatNumber(down)} MB home. The rest — ` +
        `${formatNumber(gen - down)} MB every day — fills up the storage and is lost. ` +
        `The satellite works perfectly and you still never see most of the pictures.`,
      fix:
        `You would need to send about ${(neededRate / 1000).toFixed(0)} kbps to keep up. ` +
        `Either record less often (turn the instrument down from ` +
        `${(d.payloadDuty * 100).toFixed(0)}% of each lap), squash the data smaller before ` +
        `sending, or fit a faster radio — an S-band radio sends about 100 times faster for ` +
        `roughly 95 g more weight, but needs a dish on the ground.`,
      technical:
        `Generated ${formatNumber(gen)} MB/day against ${formatNumber(down)} MB/day downlink ` +
        `capacity at ${(radio.dataRateBps / 1000).toFixed(1)} kbps over ` +
        `${formatNumber(passes.contactMinutesPerDay.value)} min of contact.`,
    };
  }

  const utilisation = gen / Math.max(down, 1e-9);
  if (link.marginDb.value < LINK_MARGIN_WARN_DB) {
    return {
      id: 'data', title: 'Getting data home', status: 'warn',
      headline: `Data gets home, but the signal is fragile`,
      diagnosis:
        `Everything fits, but your radio signal only just makes it — ` +
        `${formatNumber(link.marginDb.value)} dB of strength to spare. Rain, a slightly ` +
        `misaligned antenna, or local interference could each be enough to break it, and ` +
        `none of those are modelled here.`,
      fix:
        `Aim for ${LINK_MARGIN_GO_DB} dB of spare signal — about four times stronger than the ` +
        `bare minimum. Send more slowly, or use a better ground antenna.`,
      technical: `Link margin ${formatNumber(link.marginDb.value)} dB at the elevation mask.`,
    };
  }

  if (utilisation > 0.8) {
    return {
      id: 'data', title: 'Getting data home', status: 'warn',
      headline: `Using ${(utilisation * 100).toFixed(0)}% of your sending capacity`,
      diagnosis:
        `You can just about send everything home: ${formatNumber(gen)} MB recorded against ` +
        `${formatNumber(down)} MB you can send. But there is almost no slack. Miss one pass — ` +
        `a power glitch, bad weather, someone else using the antenna — and you fall behind ` +
        `with no way to catch up.`,
      fix: `Leave room for missed passes. They happen on every real mission.`,
      technical:
        `Downlink utilisation ${(utilisation * 100).toFixed(0)}% ` +
        `(${formatNumber(gen)} / ${formatNumber(down)} MB per day).`,
    };
  }

  return {
    id: 'data', title: 'Getting data home', status: 'go',
    headline: `All your data gets home`,
    diagnosis:
      `Your satellite passes over ${station.name} ${passes.passesPerDay.value} times a day, ` +
      `giving ${formatNumber(passes.contactMinutesPerDay.value)} minutes to talk. That is ` +
      `enough to send ${formatNumber(down)} MB, and you only record ${formatNumber(gen)} MB — ` +
      `so nothing is lost, and the signal has ${formatNumber(link.marginDb.value)} dB of ` +
      `strength to spare.`,
    fix: null,
    technical:
      `${passes.passesPerDay.value} passes/day, ` +
      `${formatNumber(passes.contactMinutesPerDay.value)} min contact, ` +
      `link margin ${formatNumber(link.marginDb.value)} dB, ` +
      `${formatNumber(gen)}/${formatNumber(down)} MB per day.`,
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
