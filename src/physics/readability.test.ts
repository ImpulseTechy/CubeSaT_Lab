/**
 * Readability guard.
 *
 * The product promise is that a student with no background can understand why
 * their satellite failed. That promise is easy to make and easy to erode: one
 * convenient bit of shorthand at a time, the copy drifts back into jargon.
 *
 * These tests make the promise enforceable. Headlines, diagnoses and fixes must
 * stay in plain language; the engineering vocabulary lives in the `technical`
 * field and in the expandable working, where it belongs.
 */

import { describe, expect, it } from 'vitest';
import { bySubsystem } from '../data/catalogue';
import { FORM_FACTORS } from './constants';
import { DEFAULT_DESIGN, STATIONS, type Design } from './design';
import { evaluate, type VerdictCard } from './verdict';
import { GLOSSARY } from '../ui/glossary';
import { CATALOGUE } from '../data/catalogue';
import { ATTITUDE_ASSUMPTIONS } from './power';

/**
 * Terms that must never appear in learner-facing copy without being explained.
 * Each maps to what we say instead.
 */
const BANNED: { pattern: RegExp; instead: string }[] = [
  { pattern: /\bduty cycle\b/i, instead: '"how often it runs"' },
  { pattern: /\bEb\/N0\b/i, instead: '"signal quality"' },
  { pattern: /\bG\/T\b/, instead: '"how good the ground antenna is"' },
  { pattern: /\bEIRP\b/, instead: '"how loudly it transmits"' },
  { pattern: /\bFSPL\b/i, instead: '"signal weakening with distance"' },
  { pattern: /\borbit-average\b/i, instead: '"on average"' },
  { pattern: /\bdepth of discharge\b/i, instead: '"how far the battery drains"' },
  { pattern: /\bstate of charge\b/i, instead: '"how full the battery is"' },
  { pattern: /\bbrownout\b/i, instead: '"the battery dies"' },
  { pattern: /\binclination\b/i, instead: '"how tilted the orbit is"' },
  { pattern: /\beclipse\b/i, instead: '"Earth’s shadow"' },
  { pattern: /\bbeta angle\b/i, instead: '"how side-on the orbit is to the Sun"' },
  { pattern: /\bcontingency\b/i, instead: '"spare weight"' },
  { pattern: /\bslant range\b/i, instead: '"distance to the ground station"' },
  { pattern: /\belevation mask\b/i, instead: '"how high above the horizon"' },
  { pattern: /\bCDS\b/, instead: '"the CubeSat rulebook"' },
  { pattern: /\bLEO\b/, instead: '"low orbit"' },
  { pattern: /\bWh\/orbit\b/i, instead: '"energy per lap"' },
  { pattern: /\bpayload\b/i, instead: '"instrument"' },
  { pattern: /\bbus\b(?!\w)/i, instead: '"the satellite itself"' },
  { pattern: /\bform factor\b/i, instead: '"size"' },
  { pattern: /\bdeficit\b/i, instead: '"spends more than it makes"' },
  { pattern: /\bmargin\b/i, instead: '"to spare"' },
  { pattern: /\bnominal\b/i, instead: 'plain wording' },
  { pattern: /\bpropagat/i, instead: 'plain wording' },
  { pattern: /\bdowblink\b/i, instead: 'typo guard' },
];

/** A broad sweep of designs, so we exercise every branch of every card. */
function sampleDesigns(): Design[] {
  const out: Design[] = [DEFAULT_DESIGN];
  for (const ff of FORM_FACTORS) {
    const components: Design['components'] = {};
    for (const s of ['structure', 'eps', 'battery', 'solar', 'obc', 'adcs', 'comms', 'payload'] as const) {
      components[s] = bySubsystem(s, ff)[0]?.id;
    }
    for (const duty of [0.02, 0.3, 0.6, 0.95]) {
      for (const station of STATIONS) {
        out.push({ ...DEFAULT_DESIGN, formFactor: ff, components, payloadDuty: duty, stationId: station.id });
      }
    }
  }
  // Pathological orbits too.
  out.push({ ...DEFAULT_DESIGN, orbit: { altitudeKm: 300, inclinationDeg: 0, raanDeg: 0, solarLongitudeDeg: 0 } });
  out.push({ ...DEFAULT_DESIGN, orbit: { altitudeKm: 1400, inclinationDeg: 98, raanDeg: 90, solarLongitudeDeg: 0 }, stationId: 'svalbard' });
  return out;
}

const learnerFacing = (c: VerdictCard) =>
  [c.headline, c.diagnosis, c.fix ?? ''].join('  ');

describe('learner-facing copy stays in plain language', () => {
  const cards = sampleDesigns().flatMap((d) => evaluate(d, 4).cards);

  it(`covers a wide sample of designs (${sampleDesigns().length} designs)`, () => {
    expect(cards.length).toBeGreaterThan(300);
  });

  for (const { pattern, instead } of BANNED) {
    it(`never says ${pattern.source} — say ${instead}`, () => {
      const offenders = cards
        .filter((c) => pattern.test(learnerFacing(c)))
        .map((c) => `[${c.id}] ${learnerFacing(c).slice(0, 110)}`);
      expect(offenders.slice(0, 3)).toEqual([]);
    });
  }
});

describe('copy quality', () => {
  const cards = sampleDesigns().flatMap((d) => evaluate(d, 4).cards);

  it('every headline is short enough to scan', () => {
    for (const c of cards) {
      expect(c.headline.length, c.headline).toBeLessThan(60);
    }
  });

  it('every diagnosis explains rather than labels', () => {
    for (const c of cards) {
      expect(c.diagnosis.length, `${c.id}: ${c.diagnosis}`).toBeGreaterThan(60);
    }
  });

  it('every problem comes with something the learner can actually do', () => {
    for (const c of cards) {
      if (c.status !== 'go') {
        expect(c.fix, `${c.id} ${c.status}`).toBeTruthy();
        expect(c.fix!.length).toBeGreaterThan(30);
      }
    }
  });

  it('keeps the engineering version available on every card', () => {
    for (const c of cards) {
      expect(c.technical, `${c.id} has no technical note`).toBeTruthy();
    }
  });

  it('never shows an unreadable number', () => {
    for (const c of cards) {
      const text = learnerFacing(c);
      expect(text, text.slice(0, 80)).not.toMatch(/NaN|Infinity|undefined|null/);
      // Long unrounded decimals are a sign a number escaped formatting.
      expect(text, text.slice(0, 80)).not.toMatch(/\d\.\d{4,}/);
    }
  });
});

describe('parts catalogue reads plainly', () => {
  // These descriptions sit under every dropdown, so they are learner-facing too.
  const JARGON = [
    /\bMPPT\b/, /\bPC\/104\b/, /\bGaAs\b/, /\btriple-junction\b/i,
    /\bhysteresis\b/i, /\bmagnetorquer\b/i, /\bdesaturation\b/i,
    /\bCortex-[AM]\b/, /\b18650\b/, /\bdetumble\b/i, /\bdipole\b/i,
    /\bmultispectral\b/i, /\bdownlink\b/i, /\btelemetry\b/i,
    /\borbit-average\b/i, /\bdata-closure\b/i, /\bdeployables\b/i,
  ];
  for (const rx of JARGON) {
    it(`no part description says ${rx.source}`, () => {
      const bad = CATALOGUE.filter((c) => rx.test(c.typicalOf)).map((c) => `${c.name}: ${c.typicalOf}`);
      expect(bad).toEqual([]);
    });
  }

  it('every part explains what it is, not just what it is called', () => {
    for (const c of CATALOGUE) {
      expect(c.typicalOf.length, c.name).toBeGreaterThan(35);
    }
  });
});

describe('attitude choices are explained in plain words', () => {
  for (const a of Object.values(ATTITUDE_ASSUMPTIONS)) {
    it(`"${a.label}" avoids jargon`, () => {
      const text = `${a.label} ${a.rationale}`;
      expect(text).not.toMatch(/\bincidence\b|\bnadir\b|\bnormal\b|\bderated\b|\bconvex\b/i);
      expect(a.rationale.length).toBeGreaterThan(60);
    });
  }
});

describe('glossary', () => {
  it('defines every term in plain language', () => {
    for (const [key, t] of Object.entries(GLOSSARY)) {
      expect(t.plain.length, key).toBeGreaterThan(2);
      expect(t.technical.length, key).toBeGreaterThan(0); // unit symbols may be 1 char
      expect(t.definition.length, key).toBeGreaterThan(25);
      // A definition that leans on the jargon it defines explains nothing.
      // Unit symbols are exempt: you cannot define "decibel" without "dB".
      if (t.technical.length > 3) {
        const selfRef = new RegExp(`\\b${t.technical.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\b`, 'i');
        expect(selfRef.test(t.definition), `${key}: definition uses "${t.technical}"`).toBe(false);
      }
    }
  });

  it('leads with everyday words, not the technical name', () => {
    for (const [key, t] of Object.entries(GLOSSARY)) {
      expect(t.plain.toLowerCase(), key).not.toBe(t.technical.toLowerCase());
    }
  });
});
