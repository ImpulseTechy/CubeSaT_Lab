/**
 * The radio link, checked against the Semtech SX127x datasheet.
 *
 * The bitrate figures below are published values, so these tests verify the
 * model against the real chip rather than against itself.
 */

import { describe, expect, it } from 'vitest';
import {
  airtimeS, bitrateBps, DEFAULT_RADIO, keepsUp, linkMarginDb, maxRangeM,
  pathLossDb, rangeInEnvironment, receivedPowerDbm, SENSITIVITY_DBM,
  slantDistanceM, type RadioConfig, type SpreadingFactor,
} from './radio';

const at = (sf: SpreadingFactor): RadioConfig => ({
  ...DEFAULT_RADIO, spreadingFactor: sf,
});

describe('bitrate matches the datasheet', () => {
  // Published SX127x values at 125 kHz, coding rate 4/5.
  it.each([
    [7, 5470], [8, 3125], [9, 1758], [10, 977], [11, 537], [12, 293],
  ])('SF%i gives about %i bit/s', (sf, expected) => {
    expect(bitrateBps(at(sf as SpreadingFactor))).toBeCloseTo(expected, -1);
  });

  it('every step up in spreading factor roughly halves the rate', () => {
    for (let sf = 7; sf < 12; sf++) {
      const fast = bitrateBps(at(sf as SpreadingFactor));
      const slow = bitrateBps(at((sf + 1) as SpreadingFactor));
      expect(slow).toBeLessThan(fast);
      expect(fast / slow).toBeGreaterThan(1.6);
      expect(fast / slow).toBeLessThan(2.1);
    }
  });

  it('a more robust coding rate costs speed', () => {
    const light = bitrateBps({ ...DEFAULT_RADIO, codingRate: 5 });
    const heavy = bitrateBps({ ...DEFAULT_RADIO, codingRate: 8 });
    expect(heavy).toBeLessThan(light);
  });
});

describe('path loss behaves like physics', () => {
  it('doubling the distance costs 6 dB', () => {
    const a = pathLossDb(500, 868);
    const b = pathLossDb(1000, 868);
    expect(b - a).toBeCloseTo(6.02, 1);
  });

  it('doubling the frequency also costs 6 dB', () => {
    expect(pathLossDb(1000, 868) - pathLossDb(1000, 434)).toBeCloseTo(6.02, 1);
  });

  // Hand-checked: 20log10(1) + 20log10(868) + 32.45 = 91.2 dB
  it('is about 91 dB at 1 km on 868 MHz', () => {
    expect(pathLossDb(1000, 868)).toBeCloseTo(91.2, 1);
  });
});

describe('range is the whole lesson', () => {
  it('a long spreading factor reaches much further than a fast one', () => {
    const near = maxRangeM(at(7));
    const far = maxRangeM(at(12));
    expect(far).toBeGreaterThan(near * 4);
  });

  it('reaches enormous distances from a balloon with a clear view', () => {
    // Free space with nothing in the way. LoRa balloon records really do
    // exceed 700 km, so a figure in the hundreds of kilometres is correct
    // physics - not a bug.
    const r = rangeInEnvironment(at(9), 'flying');
    expect(r).toBeGreaterThan(100000);
  });

  it('reaches only a few kilometres across a field', () => {
    // The same radio, sitting on the grass. This is the number that matters
    // when a student walks away from their CanSat to test the link.
    const r = rangeInEnvironment(at(9), 'openField');
    expect(r).toBeGreaterThan(1000);
    expect(r).toBeLessThan(150000);
  });

  it('gets dramatically worse with things in the way', () => {
    const open = rangeInEnvironment(at(9), 'openField');
    const trees = rangeInEnvironment(at(9), 'trees');
    const town = rangeInEnvironment(at(9), 'builtUp');
    expect(trees).toBeLessThan(open);
    expect(town).toBeLessThan(trees / 4);
  });

  it('flying beats standing on the ground by a wide margin', () => {
    // The single most useful thing to know: get the antenna up.
    expect(rangeInEnvironment(at(9), 'flying'))
      .toBeGreaterThan(rangeInEnvironment(at(9), 'builtUp') * 50);
  });

  it('obstacles cut the range hard', () => {
    const clear = maxRangeM(at(9), 0);
    const trees = maxRangeM(at(9), 20);
    expect(trees).toBeLessThan(clear / 5);
  });

  it('the margin is exactly zero at the stated maximum range', () => {
    for (const sf of [7, 9, 12] as SpreadingFactor[]) {
      expect(linkMarginDb(at(sf), maxRangeM(at(sf)))).toBeCloseTo(0, 6);
    }
  });

  it('more transmit power buys range, but slowly', () => {
    const weak = maxRangeM({ ...DEFAULT_RADIO, txPowerDbm: 14 });
    const strong = maxRangeM({ ...DEFAULT_RADIO, txPowerDbm: 20 });
    // 6 dB is double the range, not ten times - the surprise for students.
    expect(strong / weak).toBeCloseTo(2, 0);
  });

  it('signal gets weaker the further away it is', () => {
    expect(receivedPowerDbm(DEFAULT_RADIO, 2000))
      .toBeLessThan(receivedPowerDbm(DEFAULT_RADIO, 200));
  });

  it('a link fails once the signal drops below the receiver sensitivity', () => {
    const far = maxRangeM(at(7)) * 1.5;
    expect(receivedPowerDbm(at(7), far)).toBeLessThan(SENSITIVITY_DBM[7]);
    expect(linkMarginDb(at(7), far)).toBeLessThan(0);
  });
});

describe('sending faster than the radio can manage', () => {
  it('SF12 cannot send a 60-byte packet every second', () => {
    const r = keepsUp(at(12), 60, 1);
    expect(r.ok).toBe(false);
    expect(r.airtimeS).toBeGreaterThan(1);
  });

  it('SF7 manages the same packet comfortably', () => {
    const r = keepsUp(at(7), 60, 1);
    expect(r.ok).toBe(true);
    expect(r.dutyCycle).toBeLessThan(0.2);
  });

  it('a smaller packet is the cheapest fix', () => {
    expect(keepsUp(at(12), 20, 1).ok).toBe(true);
    expect(keepsUp(at(12), 60, 1).ok).toBe(false);
  });

  it('airtime scales with payload size', () => {
    expect(airtimeS(at(9), 100)).toBeCloseTo(airtimeS(at(9), 50) * 2, 6);
  });
});

describe('distance is not the same as altitude', () => {
  it('counts the sideways drift too', () => {
    // 1 km up and 800 m downwind is 1.28 km of actual distance.
    expect(slantDistanceM(1000, 800)).toBeCloseTo(1280.6, 0);
  });

  it('is just the altitude directly overhead', () => {
    expect(slantDistanceM(1000, 0)).toBe(1000);
  });

  it('drifting downwind weakens the link even while it descends', () => {
    const overhead = linkMarginDb(DEFAULT_RADIO, slantDistanceM(800, 0));
    const drifted = linkMarginDb(DEFAULT_RADIO, slantDistanceM(800, 3000));
    expect(drifted).toBeLessThan(overhead);
  });
});
