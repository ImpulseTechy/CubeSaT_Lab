import { describe, expect, it } from 'vitest';
import type { Orbit } from './orbit';
import {
  ATTITUDE_ASSUMPTIONS,
  averageLoad,
  energyBalance,
  generationPerOrbit,
  peakGeneration,
  simulateSoc,
  type BatteryConfig,
  type LoadProfile,
  type SolarConfig,
} from './power';

const ORBIT: Orbit = {
  altitudeKm: 525,
  inclinationDeg: 51.6,
  raanDeg: 0,
  solarLongitudeDeg: 0,
};

// A representative 3U: body-mounted cells on four long faces.
const SOLAR_3U: SolarConfig = {
  areaM2: 0.03,
  efficiency: 0.3,
  packingFactor: 0.85,
  epsEfficiency: 0.9,
};

const BATTERY: BatteryConfig = {
  capacityWh: 40,
  efficiency: 0.95,
  initialSoc: 0.9,
};

function profile(payloadW: number, duty: number): LoadProfile {
  return {
    busPowerW: 1.2,
    modePowerW: { idle: 0, payload: payloadW, downlink: 2.5, safe: 0 },
    dutyCycle: { idle: 1 - duty - 0.05, payload: duty, downlink: 0.05, safe: 0 },
  };
}

describe('generation', () => {
  it('scales linearly with panel area', () => {
    const a = peakGeneration(SOLAR_3U, 'nadir').value;
    const b = peakGeneration({ ...SOLAR_3U, areaM2: 0.06 }, 'nadir').value;
    expect(b).toBeCloseTo(2 * a, 6);
  });

  it('sun-tracking beats nadir, which beats tumbling', () => {
    const tumbling = peakGeneration(SOLAR_3U, 'tumbling').value;
    const nadir = peakGeneration(SOLAR_3U, 'nadir').value;
    const tracking = peakGeneration(SOLAR_3U, 'sun-tracking').value;
    expect(tumbling).toBeLessThan(nadir);
    expect(nadir).toBeLessThan(tracking);
  });

  it('uses the correct solar constant', () => {
    const ideal: SolarConfig = {
      areaM2: 1,
      efficiency: 1,
      packingFactor: 1,
      epsEfficiency: 1,
    };
    const p = peakGeneration(ideal, 'sun-tracking').value;
    expect(p).toBeCloseTo(1361 * 0.8, 6);
  });

  it('generates nothing during eclipse, so a longer eclipse means less energy', () => {
    const eclipsed = generationPerOrbit(ORBIT, SOLAR_3U, 'nadir').value;
    const sunlit = generationPerOrbit(
      { ...ORBIT, inclinationDeg: 97.5, raanDeg: 90 },
      SOLAR_3U,
      'nadir',
    ).value;
    expect(sunlit).toBeGreaterThan(eclipsed);
  });

  it('a dawn-dusk SSO is never eclipsed, so generation is maximal', () => {
    const dawnDusk: Orbit = {
      altitudeKm: 525,
      inclinationDeg: 97.5,
      raanDeg: 90,
      solarLongitudeDeg: 0,
    };
    const gen = generationPerOrbit(dawnDusk, SOLAR_3U, 'sun-tracking');
    const peak = peakGeneration(SOLAR_3U, 'sun-tracking').value;
    const T = 95.13 * 60;
    expect(gen.value).toBeCloseTo((peak * T) / 3600, 0);
  });
});

describe('load', () => {
  it('weights mode power by duty cycle', () => {
    const l = averageLoad(profile(4.0, 0.25));
    // 1.2 bus + 0.25*4.0 payload + 0.05*2.5 downlink = 2.325
    expect(l.value).toBeCloseTo(2.325, 3);
  });

  it('rises with payload duty cycle', () => {
    expect(averageLoad(profile(4, 0.5)).value).toBeGreaterThan(
      averageLoad(profile(4, 0.1)).value,
    );
  });
});

describe('energy balance - the core coupling', () => {
  it('a modest payload closes on a 3U', () => {
    const bal = energyBalance(ORBIT, SOLAR_3U, 'nadir', profile(2.0, 0.2));
    expect(bal.marginWh.value).toBeGreaterThan(0);
  });

  it('an over-ambitious payload does not close', () => {
    const bal = energyBalance(ORBIT, SOLAR_3U, 'nadir', profile(12.0, 0.6));
    expect(bal.marginWh.value).toBeLessThan(0);
  });

  it('switching from tumbling to sun-tracking can rescue a failing design', () => {
    const load = profile(5.0, 0.3);
    const tumbling = energyBalance(ORBIT, SOLAR_3U, 'tumbling', load);
    const tracking = energyBalance(ORBIT, SOLAR_3U, 'sun-tracking', load);
    expect(tumbling.marginWh.value).toBeLessThan(0);
    expect(tracking.marginWh.value).toBeGreaterThan(0);
  });
});

describe('battery state of charge', () => {
  it('cycles down in eclipse and recovers in sunlight when the design closes', () => {
    const r = simulateSoc(ORBIT, SOLAR_3U, 'nadir', profile(2.0, 0.2), BATTERY, 5);
    expect(r.brownoutOrbit).toBeNull();
    // Steady-state cycling: it discharges in eclipse and recharges in sunlight.
    expect(r.depthOfDischarge).toBeGreaterThan(0);
    expect(r.depthOfDischarge).toBeLessThan(0.25);
    expect(r.divergent).toBe(false);
    // Measured over the final orbit, so the start-up climb is excluded.
    const last = r.samples.slice(-120);
    expect(Math.max(...last.map((s) => s.soc))).toBeGreaterThan(0.9);
  });

  it('browns out within a few orbits when the design does not close', () => {
    const r = simulateSoc(ORBIT, SOLAR_3U, 'nadir', profile(14.0, 0.7), BATTERY, 6);
    expect(r.brownoutOrbit).not.toBeNull();
    expect(r.brownoutOrbit!).toBeLessThanOrEqual(6);
    expect(r.divergent).toBe(true);
  });

  it('a bigger battery delays but does not prevent a brownout on a negative balance', () => {
    const load = profile(14.0, 0.7);
    const small = simulateSoc(ORBIT, SOLAR_3U, 'nadir', load, BATTERY, 12);
    const big = simulateSoc(
      ORBIT, SOLAR_3U, 'nadir', load, { ...BATTERY, capacityWh: 120 }, 12,
    );
    expect(small.brownoutOrbit).not.toBeNull();
    expect(big.brownoutOrbit).not.toBeNull();
    expect(big.brownoutOrbit!).toBeGreaterThan(small.brownoutOrbit!);
  });

  it('state of charge never leaves 0..1', () => {
    const r = simulateSoc(ORBIT, SOLAR_3U, 'tumbling', profile(20, 0.9), BATTERY, 10);
    for (const s of r.samples) {
      expect(s.soc).toBeGreaterThanOrEqual(0);
      expect(s.soc).toBeLessThanOrEqual(1);
    }
  });

  it('produces one sample per step', () => {
    const r = simulateSoc(ORBIT, SOLAR_3U, 'nadir', profile(2, 0.2), BATTERY, 3, 60);
    expect(r.samples).toHaveLength(180);
  });
});

describe('attitude assumptions are documented', () => {
  it('every mode states its rationale', () => {
    for (const a of Object.values(ATTITUDE_ASSUMPTIONS)) {
      expect(a.rationale.length).toBeGreaterThan(20);
      expect(a.incidenceFactor).toBeGreaterThan(0);
      expect(a.incidenceFactor).toBeLessThanOrEqual(1);
    }
  });
});
