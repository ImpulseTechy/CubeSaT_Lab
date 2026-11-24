/**
 * Validation gate: orbit and eclipse.
 *
 * The 525 km reference case is hand-verified against closed-form solutions.
 * These numbers are the contract - if they drift, the physics changed.
 */

import { describe, expect, it } from 'vitest';
import {
  accessCentralAngle,
  betaAngle,
  criticalBeta,
  eclipseDuration,
  eclipseFraction,
  nodalRegression,
  orbitalPeriod,
  orbitalVelocity,
  orbitsPerDay,
  slantRange,
  sunSyncInclination,
  type Orbit,
} from './orbit';

const REF: Orbit = { altitudeKm: 525, inclinationDeg: 0, raanDeg: 0, solarLongitudeDeg: 0 };

describe('525 km reference mission (hand-verified)', () => {
  it('orbital period is 95.13 min', () => {
    expect(orbitalPeriod(REF).value / 60).toBeCloseTo(95.13, 2);
  });

  it('orbital velocity is 7.599 km/s', () => {
    expect(orbitalVelocity(REF).value).toBeCloseTo(7.599, 3);
  });

  it('max eclipse at beta = 0 is 35.68 min', () => {
    expect(eclipseDuration(REF).value / 60).toBeCloseTo(35.68, 2);
  });

  it('eclipse fraction at beta = 0 is 0.37506', () => {
    expect(eclipseFraction(REF).value).toBeCloseTo(0.37506, 5);
  });

  // Independently matches the 1755.9 km figure in the technical blueprint
  // (docs/05) - a useful third-party cross-check on the geometry.
  it('slant range at 10 deg elevation is 1755.9 km', () => {
    expect(slantRange(525, 10).value).toBeCloseTo(1755.9, 1);
  });
});

describe('circular orbit fundamentals', () => {
  it('velocity decreases with altitude (breaks the "higher = faster" misconception)', () => {
    const v400 = orbitalVelocity({ altitudeKm: 400, inclinationDeg: 0 }).value;
    const v600 = orbitalVelocity({ altitudeKm: 600, inclinationDeg: 0 }).value;
    expect(v400).toBeCloseTo(7.669, 3);
    expect(v600).toBeCloseTo(7.558, 3);
    expect(v600).toBeLessThan(v400);
  });

  it('period increases with altitude', () => {
    const t400 = orbitalPeriod({ altitudeKm: 400, inclinationDeg: 0 }).value;
    const t600 = orbitalPeriod({ altitudeKm: 600, inclinationDeg: 0 }).value;
    expect(t400 / 60).toBeCloseTo(92.56, 1);
    expect(t600).toBeGreaterThan(t400);
  });

  it('ISS-like orbit completes about 15.5 orbits per day', () => {
    const n = orbitsPerDay({ altitudeKm: 420, inclinationDeg: 51.6 });
    expect(n).toBeGreaterThan(15.3);
    expect(n).toBeLessThan(15.7);
  });
});

describe('slant range', () => {
  it('equals orbit altitude at the zenith', () => {
    expect(slantRange(500, 90).value).toBeCloseTo(500, 6);
  });

  it('grows as elevation falls', () => {
    const high = slantRange(500, 60).value;
    const low = slantRange(500, 5).value;
    expect(low).toBeGreaterThan(high);
    expect(low).toBeGreaterThan(1800);
  });
});

describe('J2 and sun-synchronous orbits', () => {
  it('prograde orbits regress westward, retrograde advance', () => {
    expect(nodalRegression({ altitudeKm: 500, inclinationDeg: 51.6 }).value).toBeLessThan(0);
    expect(nodalRegression({ altitudeKm: 500, inclinationDeg: 98 }).value).toBeGreaterThan(0);
  });

  it('polar orbits barely regress', () => {
    const r = nodalRegression({ altitudeKm: 500, inclinationDeg: 90 }).value;
    expect(Math.abs(r)).toBeLessThan(1e-9);
  });

  it('sun-sync inclination at 500 km is about 97.4 deg', () => {
    const i = sunSyncInclination(500);
    expect(i).not.toBeNull();
    expect(i!).toBeCloseTo(97.4, 1);
  });

  it('sun-sync orbit precesses at ~0.9856 deg/day', () => {
    const i = sunSyncInclination(500)!;
    const rate = nodalRegression({ altitudeKm: 500, inclinationDeg: i }).value;
    expect(rate).toBeCloseTo(360 / 365.242, 3);
  });

  it('no sun-sync solution exists at very high altitude', () => {
    expect(sunSyncInclination(20000)).toBeNull();
  });
});

describe('beta angle and eclipse', () => {
  it('critical beta at 525 km is about 67.5 deg', () => {
    expect(criticalBeta(REF)).toBeCloseTo(67.5, 1);
  });

  it('eclipse vanishes above the critical beta (dawn-dusk SSO case)', () => {
    const o: Orbit = {
      altitudeKm: 525,
      inclinationDeg: 97.5,
      raanDeg: 90,
      solarLongitudeDeg: 0,
    };
    const beta = betaAngle(o).value;
    expect(Math.abs(beta)).toBeGreaterThan(criticalBeta(o));
    expect(eclipseFraction(o).value).toBe(0);
  });

  it('eclipse is longest at beta = 0 and shrinks as |beta| grows', () => {
    const base = { altitudeKm: 525, inclinationDeg: 51.6, solarLongitudeDeg: 0 };
    const f0 = eclipseFraction({ ...base, raanDeg: 0 }).value;
    const f60 = eclipseFraction({ ...base, raanDeg: 60 }).value;
    expect(f0).toBeGreaterThan(f60);
  });

  it('eclipse fraction is always between 0 and 0.5', () => {
    for (let h = 300; h <= 1200; h += 100) {
      for (let raan = 0; raan < 360; raan += 30) {
        const f = eclipseFraction({
          altitudeKm: h,
          inclinationDeg: 51.6,
          raanDeg: raan,
          solarLongitudeDeg: 0,
        }).value;
        expect(f).toBeGreaterThanOrEqual(0);
        expect(f).toBeLessThan(0.5);
      }
    }
  });

  it('higher orbits spend less of each orbit in shadow', () => {
    const low = eclipseFraction({ altitudeKm: 300, inclinationDeg: 0 }).value;
    const high = eclipseFraction({ altitudeKm: 1200, inclinationDeg: 0 }).value;
    expect(high).toBeLessThan(low);
  });
});

describe('ground station access', () => {
  it('access circle widens with altitude', () => {
    expect(accessCentralAngle(800, 10)).toBeGreaterThan(accessCentralAngle(400, 10));
  });

  it('access circle narrows as the elevation mask rises', () => {
    expect(accessCentralAngle(500, 30)).toBeLessThan(accessCentralAngle(500, 5));
  });
});

describe('traces', () => {
  it('every traced value carries a formula and substitutions', () => {
    for (const t of [
      orbitalPeriod(REF),
      orbitalVelocity(REF),
      eclipseFraction(REF),
      slantRange(525, 10),
      betaAngle(REF),
    ]) {
      expect(t.trace.formula.length).toBeGreaterThan(0);
      expect(t.trace.substitutions.length).toBeGreaterThan(0);
      expect(t.unit.length).toBeGreaterThan(0);
    }
  });
});
