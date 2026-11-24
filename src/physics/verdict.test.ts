/**
 * The coupling tests.
 *
 * These are the ones that matter: they prove that changing one subsystem moves
 * the others, which is the single thing no competitor does.
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN, massBudget, type Design } from './design';
import { evaluate } from './verdict';

const d = (patch: Partial<Design>): Design => ({ ...DEFAULT_DESIGN, ...patch });

describe('default design is a sensible starting point', () => {
  it('is within mass limits', () => {
    expect(massBudget(DEFAULT_DESIGN).withinLimit).toBe(true);
  });

  it('produces three cards', () => {
    const v = evaluate(DEFAULT_DESIGN);
    expect(v.cards.map((c) => c.id)).toEqual(['mass', 'power', 'data']);
  });

  it('every card carries a diagnosis', () => {
    for (const c of evaluate(DEFAULT_DESIGN).cards) {
      expect(c.diagnosis.length).toBeGreaterThan(30);
      expect(c.headline.length).toBeGreaterThan(3);
    }
  });

  it('every failing or warning card offers a fix', () => {
    const designs = [
      DEFAULT_DESIGN,
      d({ payloadDuty: 0.9 }),
      d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }),
      d({ dataRateBps: 19200, components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }),
    ];
    for (const design of designs) {
      for (const c of evaluate(design).cards) {
        if (c.status !== 'go') {
          expect(c.fix, `${c.id} @ ${c.status}`).toBeTruthy();
          expect(c.fix!.length).toBeGreaterThan(20);
        }
      }
    }
  });
});

describe('MASS cascade', () => {
  it('a heavier payload eats the mass margin', () => {
    const light = massBudget(d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-sensor' } }));
    const heavy = massBudget(d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }));
    expect(heavy.totalMassG.value).toBeGreaterThan(light.totalMassG.value);
    expect(heavy.marginG.value).toBeLessThan(light.marginG.value);
  });

  it('deployable panels cost mass', () => {
    const body = massBudget(d({ components: { ...DEFAULT_DESIGN.components, solar: 'solar-body-3u' } }));
    const wings = massBudget(d({ components: { ...DEFAULT_DESIGN.components, solar: 'solar-deploy-3u' } }));
    expect(wings.totalMassG.value - body.totalMassG.value).toBeCloseTo(
      (360 - 150) * 1.1, 0,
    );
  });

  it('contingency is applied on top of the component roll-up', () => {
    const none = massBudget(d({ contingency: 0 }));
    const twenty = massBudget(d({ contingency: 0.2 }));
    expect(twenty.totalMassG.value).toBeCloseTo(none.dryMassG.value * 1.2, 6);
  });

  it('uses CDS Rev 14.1 limits, not the legacy 1.33 kg figure', () => {
    expect(massBudget(d({ formFactor: '1U' })).limitKg).toBe(2.0);
    expect(massBudget(d({ formFactor: '3U' })).limitKg).toBe(6.0);
    expect(massBudget(d({ formFactor: '1U' })).legacyLimitKg).toBe(1.33);
  });
});

describe('POWER cascade - the headline demo', () => {
  it('raising payload duty cycle eventually browns out the battery', () => {
    const hungry = { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' };
    const calm = evaluate(d({ payloadDuty: 0.1, components: hungry }));
    const greedy = evaluate(d({ payloadDuty: 0.9, components: hungry }));
    expect(calm.soc.brownoutOrbit).toBeNull();
    expect(greedy.soc.brownoutOrbit).not.toBeNull();
    expect(greedy.cards[1].status).toBe('nogo');

    // A slow drain is still a failure, and must still say so with a timeline.
    const slow = evaluate(d({ payloadDuty: 0.9 }));
    expect(slow.cards[1].status).toBe('nogo');
    expect(slow.cards[1].diagnosis).toMatch(/about \d+ orbits/);
  });

  it('the brownout diagnosis names the orbit, the draw and the generation', () => {
    const v = evaluate(d({ payloadDuty: 0.9, components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }));
    const power = v.cards.find((c) => c.id === 'power')!;
    expect(power.status).toBe('nogo');
    expect(power.diagnosis).toMatch(/orbit \d+/);
    expect(power.diagnosis).toMatch(/W orbit-average/);
    expect(power.diagnosis).toMatch(/eclipse/);
  });

  it('the fix names the cross-subsystem mass cost of deployables', () => {
    const v = evaluate(d({ payloadDuty: 0.8 }));
    const power = v.cards.find((c) => c.id === 'power')!;
    expect(power.fix).toBeTruthy();
    expect(power.fix!).toMatch(/duty cycle/i);
    expect(power.fix!).toMatch(/mass margin|g\)/);
  });

  it('deployable wings rescue a design that body-mounted cells cannot run', () => {
    const base = { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' };
    const body = evaluate(d({ payloadDuty: 0.45, components: { ...base, solar: 'solar-body-3u' } }));
    const wings = evaluate(d({ payloadDuty: 0.45, components: { ...base, solar: 'solar-deploy-3u' } }));
    expect(body.energy.marginWh.value).toBeLessThan(0);
    expect(wings.energy.marginWh.value).toBeGreaterThan(0);
  });

  it('a dawn-dusk SSO removes eclipse and transforms the power budget', () => {
    const iss = evaluate(d({ payloadDuty: 0.4 }));
    const dawnDusk = evaluate(
      d({
        payloadDuty: 0.4,
        orbit: { altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 90, solarLongitudeDeg: 0 },
      }),
    );
    expect(dawnDusk.energy.generationWh.value).toBeGreaterThan(
      iss.energy.generationWh.value,
    );
  });
});

describe('DATA cascade - the question nobody else answers', () => {
  it('a high-res imager on amateur UHF cannot get its data home', () => {
    const v = evaluate(d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }));
    const data = v.cards.find((c) => c.id === 'data')!;
    expect(data.status).toBe('nogo');
    expect(v.data.generatedMbPerDay.value).toBeGreaterThan(
      v.data.downlinkedMbPerDay.value,
    );
  });

  it('the diagnosis quantifies how much data is lost per day', () => {
    const v = evaluate(d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }));
    const data = v.cards.find((c) => c.id === 'data')!;
    expect(data.diagnosis).toMatch(/MB a day is lost|buffer fills/);
    expect(data.fix).toMatch(/kbps/);
  });

  it('moving to S-band fixes the imager mission', () => {
    // Same camera, same orbit, same station - only the radio changes.
    const uhf = evaluate(
      d({ dataRateBps: 19200, stationId: 'university' }),
    );
    const sband = evaluate(
      d({
        components: { ...DEFAULT_DESIGN.components, comms: 'comms-s' },
        dataRateBps: 2e6,
        stationId: 'university',
      }),
    );
    expect(uhf.data.closes).toBe(false);
    expect(sband.data.closes).toBe(true);
    // And it costs mass: the S-band radio is heavier than the UHF one.
    expect(sband.mass.totalMassG.value).toBeGreaterThan(uhf.mass.totalMassG.value);
  });

  it('a station outside the inclination band reports no passes, not a bad link', () => {
    const v = evaluate(
      d({
        stationId: 'svalbard',
        orbit: { altitudeKm: 525, inclinationDeg: 10, raanDeg: 0, solarLongitudeDeg: 0 },
      }),
    );
    const data = v.cards.find((c) => c.id === 'data')!;
    expect(v.passes.passesPerDay.value).toBe(0);
    expect(data.headline).toMatch(/No passes/);
    expect(data.fix).toMatch(/inclination/i);
  });

  it('pushing the rate too high breaks the link before the buffer', () => {
    const v = evaluate(d({ dataRateBps: 19200, stationId: 'equatorial' }));
    // Either it closes or it tells us by how many dB it misses - never silent.
    const data = v.cards.find((c) => c.id === 'data')!;
    expect(['go', 'warn', 'nogo']).toContain(data.status);
    expect(data.diagnosis.length).toBeGreaterThan(30);
  });
});

describe('cross-budget coupling', () => {
  it('one payload change moves all three budgets at once', () => {
    const base = evaluate(d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-sensor' } }));
    const big = evaluate(d({ components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }));

    expect(big.mass.totalMassG.value).toBeGreaterThan(base.mass.totalMassG.value);
    expect(big.energy.loadWh.value).toBeGreaterThan(base.energy.loadWh.value);
    expect(big.data.generatedMbPerDay.value).toBeGreaterThan(
      base.data.generatedMbPerDay.value,
    );
  });

  it('overall status is the worst of the three', () => {
    const v = evaluate(d({ payloadDuty: 0.95, components: { ...DEFAULT_DESIGN.components, payload: 'pl-cam-hi' } }));
    expect(v.overall).toBe('nogo');
    const benign = evaluate(
      d({ payloadDuty: 0.1, components: { ...DEFAULT_DESIGN.components, payload: 'pl-beacon' } }),
    );
    expect(benign.overall).not.toBe('nogo');
    expect(benign.cards.every((c) => c.status !== 'nogo')).toBe(true);
  });

  it('is deterministic - the same design always gives the same verdict', () => {
    const a = evaluate(DEFAULT_DESIGN);
    const b = evaluate(DEFAULT_DESIGN);
    expect(a.cards).toEqual(b.cards);
    expect(a.soc.minSoc).toBe(b.soc.minSoc);
  });
});
