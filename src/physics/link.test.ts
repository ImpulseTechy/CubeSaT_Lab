import { describe, expect, it } from 'vitest';
import type { Orbit } from './orbit';
import { slantRange } from './orbit';
import {
  BANDS,
  dataBalance,
  eirp,
  linkBudget,
  passStatistics,
  pathLoss,
  worstCaseLink,
  type GroundStation,
  type RadioConfig,
} from './link';

const ORBIT: Orbit = { altitudeKm: 525, inclinationDeg: 51.6 };

// A typical amateur UHF ground station.
const AMATEUR: GroundStation = {
  id: 'amateur',
  name: 'Amateur UHF station',
  latDeg: 52,
  lonDeg: 0,
  altitudeM: 50,
  gOverTDbK: -12,
  minElevationDeg: 10,
};

const UHF_RADIO: RadioConfig = {
  band: 'UHF',
  txPowerW: 2,
  txGainDbi: 2,
  txLossDb: 1,
  dataRateBps: 9600,
};

describe('EIRP', () => {
  it('1 W into a 0 dBi antenna with no loss is 0 dBW', () => {
    const e = eirp({ ...UHF_RADIO, txPowerW: 1, txGainDbi: 0, txLossDb: 0 });
    expect(e.value).toBeCloseTo(0, 6);
  });

  it('doubling power adds 3 dB', () => {
    const a = eirp({ ...UHF_RADIO, txPowerW: 1 }).value;
    const b = eirp({ ...UHF_RADIO, txPowerW: 2 }).value;
    expect(b - a).toBeCloseTo(3.01, 2);
  });
});

describe('free-space path loss', () => {
  // Hand-checked: FSPL(dB) = 20log10(4*pi*d*f/c)
  // At 437.5 MHz and 1000 km: 20*log10(4*pi*1e6*437.5e6/2.998e8) = 145.25 dB
  it('matches the closed-form value at 437.5 MHz, 1000 km', () => {
    expect(pathLoss(1000, 437.5e6).value).toBeCloseTo(145.25, 1);
  });

  it('adds 6 dB when range doubles', () => {
    const a = pathLoss(500, 437.5e6).value;
    const b = pathLoss(1000, 437.5e6).value;
    expect(b - a).toBeCloseTo(6.02, 2);
  });

  it('adds 6 dB when frequency doubles', () => {
    const a = pathLoss(1000, 1e9).value;
    const b = pathLoss(1000, 2e9).value;
    expect(b - a).toBeCloseTo(6.02, 2);
  });

  it('is higher at X-band than UHF for the same range', () => {
    expect(pathLoss(1000, BANDS.X.frequencyHz).value).toBeGreaterThan(
      pathLoss(1000, BANDS.UHF.frequencyHz).value,
    );
  });

  // This is the bug we found hard-coded in a competitor: a constant path loss
  // that ignores range entirely. Ours must vary.
  it('varies across a pass instead of being a constant', () => {
    const zenith = pathLoss(slantRange(525, 90).value, 437.5e6).value;
    const horizon = pathLoss(slantRange(525, 10).value, 437.5e6).value;
    expect(horizon - zenith).toBeGreaterThan(9);
  });
});

describe('link budget', () => {
  it('closes comfortably at 9600 bps on UHF overhead', () => {
    const zenithRange = slantRange(525, 90).value;
    const l = linkBudget(UHF_RADIO, AMATEUR, zenithRange);
    expect(l.closes).toBe(true);
    expect(l.marginDb.value).toBeGreaterThan(6);
  });

  it('is tighter at the horizon than at the zenith', () => {
    const zenith = linkBudget(UHF_RADIO, AMATEUR, slantRange(525, 90).value);
    const horizon = linkBudget(UHF_RADIO, AMATEUR, slantRange(525, 10).value);
    expect(horizon.marginDb.value).toBeLessThan(zenith.marginDb.value);
  });

  it('a 100x data rate increase costs 20 dB of margin', () => {
    const slow = linkBudget({ ...UHF_RADIO, dataRateBps: 9600 }, AMATEUR, 1000);
    const fast = linkBudget({ ...UHF_RADIO, dataRateBps: 960000 }, AMATEUR, 1000);
    expect(slow.marginDb.value - fast.marginDb.value).toBeCloseTo(20, 1);
  });

  it('fails to close when the rate is pushed too high on a weak link', () => {
    const greedy = worstCaseLink(ORBIT, { ...UHF_RADIO, dataRateBps: 2e6 }, AMATEUR);
    expect(greedy.closes).toBe(false);
    expect(greedy.marginDb.value).toBeLessThan(0);
  });

  it('a better ground station rescues a marginal link', () => {
    const big: GroundStation = { ...AMATEUR, name: 'Big dish', gOverTDbK: 10 };
    const weak = worstCaseLink(ORBIT, { ...UHF_RADIO, dataRateBps: 1e6 }, AMATEUR);
    const strong = worstCaseLink(ORBIT, { ...UHF_RADIO, dataRateBps: 1e6 }, big);
    expect(weak.closes).toBe(false);
    expect(strong.closes).toBe(true);
  });
});

describe('passes', () => {
  it('a mid-latitude station under a 51.6 deg orbit gets several passes a day', () => {
    const s = passStatistics(ORBIT, AMATEUR);
    expect(s.passesPerDay.value).toBeGreaterThan(1);
    expect(s.passesPerDay.value).toBeLessThan(16);
    expect(s.contactMinutesPerDay.value).toBeGreaterThan(5);
  });

  it('a station outside the inclination band never sees the satellite', () => {
    const polar: GroundStation = { ...AMATEUR, name: 'Svalbard', latDeg: 78 };
    const equatorialOrbit: Orbit = { altitudeKm: 525, inclinationDeg: 5 };
    expect(passStatistics(equatorialOrbit, polar).passesPerDay.value).toBe(0);
  });

  it('a polar station under a polar orbit sees many passes', () => {
    const polarStation: GroundStation = { ...AMATEUR, name: 'Svalbard', latDeg: 78 };
    const sso: Orbit = { altitudeKm: 525, inclinationDeg: 97.5 };
    const s = passStatistics(sso, polarStation);
    // A high-latitude station under a near-polar orbit sees most orbits -
    // this is exactly why Svalbard and Troll are used as real ground stations.
    expect(s.passesPerDay.value).toBeGreaterThan(8);
    const midLat = passStatistics(sso, AMATEUR);
    expect(s.passesPerDay.value).toBeGreaterThan(midLat.passesPerDay.value);
  });

  it('a higher orbit gives longer passes', () => {
    const low = passStatistics({ altitudeKm: 350, inclinationDeg: 51.6 }, AMATEUR);
    const high = passStatistics({ altitudeKm: 800, inclinationDeg: 51.6 }, AMATEUR);
    expect(high.avgPassDurationS.value).toBeGreaterThan(low.avgPassDurationS.value);
  });

  it('a higher elevation mask reduces contact time', () => {
    const open = passStatistics(ORBIT, { ...AMATEUR, minElevationDeg: 5 });
    const blocked = passStatistics(ORBIT, { ...AMATEUR, minElevationDeg: 30 });
    expect(blocked.contactMinutesPerDay.value).toBeLessThan(
      open.contactMinutesPerDay.value,
    );
  });
});

describe('data closure - the question nobody else answers', () => {
  it('a small beacon payload closes on amateur UHF', () => {
    const link = worstCaseLink(ORBIT, UHF_RADIO, AMATEUR);
    const d = dataBalance(ORBIT, UHF_RADIO, AMATEUR, 0.05, link);
    expect(d.closes).toBe(true);
    expect(d.marginMb.value).toBeGreaterThan(0);
  });

  it('an imager overwhelms an amateur UHF downlink', () => {
    const link = worstCaseLink(ORBIT, UHF_RADIO, AMATEUR);
    // 40 MB per orbit - a modest camera taking a few frames.
    const d = dataBalance(ORBIT, UHF_RADIO, AMATEUR, 40, link);
    expect(d.closes).toBe(false);
    expect(d.generatedMbPerDay.value).toBeGreaterThan(d.downlinkedMbPerDay.value * 10);
  });

  it('moving that imager to S-band closes the mission', () => {
    const sBand: RadioConfig = {
      band: 'S', txPowerW: 2, txGainDbi: 6, txLossDb: 1, dataRateBps: 4e6,
    };
    const sStation: GroundStation = { ...AMATEUR, name: 'S-band dish', gOverTDbK: 12 };
    const link = worstCaseLink(ORBIT, sBand, sStation);
    const d = dataBalance(ORBIT, sBand, sStation, 40, link);
    expect(link.closes).toBe(true);
    expect(d.closes).toBe(true);
  });

  it('nothing gets home if the link does not close, however many passes there are', () => {
    const link = worstCaseLink(ORBIT, { ...UHF_RADIO, dataRateBps: 2e6 }, AMATEUR);
    const d = dataBalance(ORBIT, { ...UHF_RADIO, dataRateBps: 2e6 }, AMATEUR, 1, link);
    expect(link.closes).toBe(false);
    expect(d.downlinkedMbPerDay.value).toBe(0);
    expect(d.closes).toBe(false);
  });
});
