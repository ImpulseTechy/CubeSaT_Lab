/**
 * Flight physics, checked against published values and against what actually
 * happens to student hardware.
 *
 * The atmosphere numbers are from the International Standard Atmosphere, which
 * is tabulated everywhere — so these are real external references, not our own
 * arithmetic repeated back at us.
 */

import { describe, expect, it } from 'vitest';
import {
  altitudeFromPressure, densityKgM3, pressurePa, SEA_LEVEL_PRESSURE_PA,
  speedOfSound, temperatureC, TROPOPAUSE_M,
} from './atmosphere';
import {
  CAN_BODY_AREA_M2, landingOutcome, landingSpeed, requiredChuteDiameter,
  simulateFlight, terminalVelocity, type Vehicle,
} from './descent';

// A typical student CanSat: Arduino, sensors, LiPo, in a drinks can.
const CANSAT: Vehicle = {
  massG: 330,
  bodyAreaM2: CAN_BODY_AREA_M2,
  parachute: { diameterM: 0.5, dragCoefficient: 1.1, deployAltitudeM: 10000 },
};

describe('the standard atmosphere matches published values', () => {
  it('sea level is 15 C and 101,325 Pa', () => {
    expect(temperatureC(0)).toBeCloseTo(15, 2);
    expect(pressurePa(0)).toBeCloseTo(101325, 0);
  });

  it('sea level air density is 1.225 kg/m3', () => {
    expect(densityKgM3(0)).toBeCloseTo(1.225, 3);
  });

  // Published ISA values, used by every aviation reference.
  it.each([
    [1000, 8.5, 89875],
    [5000, -17.5, 54020],
    [11000, -56.5, 22632],
  ])('at %i m: %f C and about %i Pa', (alt, tempC, pa) => {
    expect(temperatureC(alt)).toBeCloseTo(tempC, 1);
    expect(pressurePa(alt)).toBeCloseTo(pa, -2);
  });

  it('holds -56.5 C through the isothermal layer above the tropopause', () => {
    expect(temperatureC(TROPOPAUSE_M + 1)).toBeCloseTo(-56.5, 1);
    expect(temperatureC(20000)).toBeCloseTo(-56.5, 1);
  });

  it('pressure keeps falling above the tropopause even though temperature does not', () => {
    expect(pressurePa(20000)).toBeLessThan(pressurePa(TROPOPAUSE_M));
    expect(pressurePa(20000)).toBeGreaterThan(0);
  });

  it('speed of sound at sea level is about 340 m/s', () => {
    expect(speedOfSound(0)).toBeCloseTo(340, 0);
  });
});

describe('converting pressure back to height', () => {
  it('round-trips at every altitude a CanSat will see', () => {
    for (const h of [0, 100, 500, 1000, 3000, 5000, 10000]) {
      expect(altitudeFromPressure(pressurePa(h))).toBeCloseTo(h, 0);
    }
  });

  it('reads zero at the launch site when calibrated to ground pressure', () => {
    // What a student must do before flying: zero the sensor where they stand.
    const ground = pressurePa(850); // launching from a plateau
    expect(altitudeFromPressure(ground, ground)).toBeCloseTo(0, 6);
  });

  it('is offset if you forget to calibrate', () => {
    // The classic mistake: assume standard sea level when you are not at it.
    const ground = pressurePa(850);
    const uncalibrated = altitudeFromPressure(ground, SEA_LEVEL_PRESSURE_PA);
    expect(uncalibrated).toBeCloseTo(850, 0);
  });
});

describe('a parachute has to be the right size', () => {
  it('a bare can falls dangerously fast', () => {
    const bare: Vehicle = { ...CANSAT, parachute: null };
    const v = landingSpeed(bare);
    expect(v).toBeGreaterThan(25);
    expect(landingOutcome(v)).toBe('destroyed');
  });

  it('a sensible chute brings it down safely', () => {
    const v = landingSpeed(CANSAT);
    expect(v).toBeGreaterThan(4);
    expect(v).toBeLessThan(11);
    expect(landingOutcome(v)).toBe('good');
  });

  it('too big a chute turns it into a kite', () => {
    const huge: Vehicle = {
      ...CANSAT,
      parachute: { diameterM: 1.4, dragCoefficient: 1.1, deployAltitudeM: 10000 },
    };
    expect(landingOutcome(landingSpeed(huge))).toBe('drifts');
  });

  it('the sizing formula produces the speed it promises', () => {
    for (const target of [5, 7, 9]) {
      const d = requiredChuteDiameter(330, target);
      const v: Vehicle = {
        ...CANSAT,
        parachute: { diameterM: d, dragCoefficient: 1.1, deployAltitudeM: 10000 },
      };
      expect(landingSpeed(v)).toBeCloseTo(target, 1);
    }
  });

  it('a heavier CanSat needs a bigger chute', () => {
    expect(requiredChuteDiameter(500, 7)).toBeGreaterThan(
      requiredChuteDiameter(300, 7),
    );
  });

  it('falls faster high up where the air is thin', () => {
    // The lesson students miss: a chute sized at sea level barely works at 20 km.
    expect(terminalVelocity(CANSAT, 20000)).toBeGreaterThan(
      terminalVelocity(CANSAT, 0) * 2.5,
    );
  });
});

describe('a whole flight', () => {
  it('a 1 km drop lands in a sensible time', () => {
    const f = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 1000 });
    expect(f.apogeeM).toBeCloseTo(1000, 0);
    // About 1000 m at roughly 7 m/s, plus a few seconds to settle.
    expect(f.durationS).toBeGreaterThan(100);
    expect(f.durationS).toBeLessThan(220);
    expect(f.outcome).toBe('good');
    expect(f.chuteDeployed).toBe(true);
  });

  it('ends on the ground, not below it', () => {
    const f = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 500 });
    const last = f.samples[f.samples.length - 1];
    expect(last.altitudeM).toBeLessThanOrEqual(1);
    expect(f.samples.every((s) => s.altitudeM >= -1)).toBe(true);
  });

  it('never exceeds terminal velocity', () => {
    const f = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 3000 });
    for (const s of f.samples) {
      const vt = terminalVelocity(CANSAT, Math.max(0, s.altitudeM));
      expect(Math.abs(s.verticalSpeedMS)).toBeLessThanOrEqual(vt + 0.5);
    }
  });

  it('a balloon flight climbs first, then comes back down', () => {
    const f = simulateFlight(
      CANSAT,
      { method: 'balloon', releaseAltitudeM: 2000, ascentRateMS: 5 },
    );
    expect(f.samples[0].ascending).toBe(true);
    expect(f.samples[f.samples.length - 1].ascending).toBe(false);
    expect(f.apogeeM).toBeGreaterThanOrEqual(2000);
    // Climbing at 5 m/s to 2 km takes about 400 s on its own.
    expect(f.durationS).toBeGreaterThan(400);
  });

  it('wind carries it away, and that is the recovery problem', () => {
    const calm = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 1000 }, 0);
    const windy = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 1000 }, 8);
    expect(calm.landingDistanceM).toBeCloseTo(0, 5);
    expect(windy.landingDistanceM).toBeGreaterThan(800);
  });

  it('a bigger chute means a longer, further drift', () => {
    const big: Vehicle = {
      ...CANSAT,
      parachute: { diameterM: 1.0, dragCoefficient: 1.1, deployAltitudeM: 10000 },
    };
    const a = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 1000 }, 5);
    const b = simulateFlight(big, { method: 'drop', releaseAltitudeM: 1000 }, 5);
    expect(b.durationS).toBeGreaterThan(a.durationS);
    expect(b.landingDistanceM).toBeGreaterThan(a.landingDistanceM);
  });

  it('a chute that opens late gives a violent snap and little time', () => {
    const late: Vehicle = {
      ...CANSAT,
      parachute: { diameterM: 0.5, dragCoefficient: 1.1, deployAltitudeM: 50 },
    };
    const f = simulateFlight(late, { method: 'drop', releaseAltitudeM: 1000 });
    const fast = Math.max(...f.samples.map((s) => Math.abs(s.verticalSpeedMS)));
    // It free-falls almost the whole way before the chute catches it.
    expect(fast).toBeGreaterThan(25);
    expect(f.durationS).toBeLessThan(60);
  });

  it('is deterministic', () => {
    const a = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 800 });
    const b = simulateFlight(CANSAT, { method: 'drop', releaseAltitudeM: 800 });
    expect(a.samples.length).toBe(b.samples.length);
    expect(a.landingSpeedMS).toBe(b.landingSpeedMS);
  });
});
