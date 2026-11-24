/**
 * Design links must survive the round trip.
 *
 * A link is the one artefact a learner keeps and a teacher sends. If it decodes
 * even slightly differently from what was encoded, somebody is looking at a
 * different satellite from the one they were sent - and would have no way of
 * knowing.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN, EXAMPLE_DESIGNS, type Design } from '../physics/design';
import { evaluate } from '../physics/verdict';
import { decodeDesign, encodeDesign } from './share';

const roundTrip = (d: Design) => decodeDesign(encodeDesign(d));

describe('a design survives being turned into a link and back', () => {
  const cases: [string, Design][] = [
    ['the default', DEFAULT_DESIGN],
    ...Object.entries(EXAMPLE_DESIGNS),
  ];

  for (const [name, d] of cases) {
    it(`${name} comes back identical`, () => {
      const back = roundTrip(d);
      expect(back.formFactor).toBe(d.formFactor);
      expect(back.components).toEqual(d.components);
      expect(back.attitude).toBe(d.attitude);
      expect(back.payloadDuty).toBeCloseTo(d.payloadDuty, 5);
      expect(back.dataRateBps).toBe(d.dataRateBps);
      expect(back.contingency).toBeCloseTo(d.contingency, 5);
      expect(back.stationId).toBe(d.stationId);
      expect(back.orbit.altitudeKm).toBeCloseTo(d.orbit.altitudeKm, 5);
      expect(back.orbit.inclinationDeg).toBeCloseTo(d.orbit.inclinationDeg, 5);
    });

    it(`${name} still gets the same verdict`, () => {
      // The real test: the person who opens the link must see what was sent.
      const before = evaluate(d);
      const after = evaluate(roundTrip(d));
      expect(after.cards).toEqual(before.cards);
      expect(after.overall).toBe(before.overall);
    });
  }
});

describe('links stay short enough to send', () => {
  it('encodes a design in a sensible number of characters', () => {
    for (const d of [DEFAULT_DESIGN, ...Object.values(EXAMPLE_DESIGNS)]) {
      const s = encodeDesign(d);
      expect(s.length, s).toBeLessThan(220);
    }
  });

  it('uses only characters that survive being pasted into a chat', () => {
    for (const d of [DEFAULT_DESIGN, ...Object.values(EXAMPLE_DESIGNS)]) {
      expect(encodeDesign(d)).toMatch(/^[A-Za-z0-9=&,.\-_]+$/);
    }
  });
});

describe('a broken link still opens something usable', () => {
  it('falls back to the default when the link is empty', () => {
    expect(decodeDesign('')).toEqual(
      expect.objectContaining({ formFactor: DEFAULT_DESIGN.formFactor }),
    );
  });

  it('ignores nonsense rather than throwing', () => {
    for (const junk of ['???', 'f=99U', 'd=abc', 'alt=xx', 'r=-5', 'a=z', '&&&&']) {
      expect(() => decodeDesign(junk)).not.toThrow();
      const d = decodeDesign(junk);
      expect(evaluate(d).cards).toHaveLength(3);
    }
  });

  it('rejects values outside the ranges the controls allow', () => {
    expect(decodeDesign('d=5').payloadDuty).toBe(DEFAULT_DESIGN.payloadDuty);
    expect(decodeDesign('m=-1').contingency).toBe(DEFAULT_DESIGN.contingency);
    expect(decodeDesign('alt=99999').orbit.altitudeKm).toBe(
      DEFAULT_DESIGN.orbit.altitudeKm,
    );
    expect(decodeDesign('inc=500').orbit.inclinationDeg).toBe(
      DEFAULT_DESIGN.orbit.inclinationDeg,
    );
    expect(decodeDesign('f=banana').formFactor).toBe(DEFAULT_DESIGN.formFactor);
  });

  it('keeps whatever parts of a partial link it can understand', () => {
    const d = decodeDesign('f=6U&d=0.42');
    expect(d.formFactor).toBe('6U');
    expect(d.payloadDuty).toBeCloseTo(0.42, 5);
    // Everything unmentioned falls back rather than going missing.
    expect(d.stationId).toBe(DEFAULT_DESIGN.stationId);
  });
});

describe('edited links behave', () => {
  it('a hand-tweaked duty cycle is honoured', () => {
    const base = encodeDesign(DEFAULT_DESIGN);
    const edited = base.replace(/d=[\d.]+/, 'd=0.85');
    expect(decodeDesign(edited).payloadDuty).toBeCloseTo(0.85, 5);
  });

  it('changing one value does not disturb the others', () => {
    const edited = encodeDesign(DEFAULT_DESIGN).replace(/d=[\d.]+/, 'd=0.7');
    const back = decodeDesign(edited);
    expect(back.components).toEqual(DEFAULT_DESIGN.components);
    expect(back.formFactor).toBe(DEFAULT_DESIGN.formFactor);
  });
});
