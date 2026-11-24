/**
 * The detumble animation, verified with a fake clock.
 *
 * Browsers throttle animation frames heavily whenever a page is not visible,
 * which makes the real loop impossible to measure reliably from automation.
 * The physics is a pure function, so it can be stepped deterministically here
 * instead - which is both faster and a far better check than watching pixels.
 */

import { describe, expect, it } from 'vitest';
import {
  advanceSpin, DAMPING, INITIAL_SPIN, RELEASED_SPIN, spinStage, WAKE_UP_S,
} from './DetumbleAnimation';

/** Run the simulation at 60 fps for up to `seconds`, returning every state. */
function run(seconds: number) {
  const dt = 1 / 60;
  let s = { ...RELEASED_SPIN };
  const frames = [s];
  for (let i = 0; i < seconds * 60; i++) {
    s = advanceSpin(s, dt);
    frames.push(s);
  }
  return frames;
}

describe('the satellite is thrown out spinning', () => {
  it('starts at a realistic deployer tip-off rate', () => {
    // Real deployers impart roughly 5-10 degrees per second.
    expect(RELEASED_SPIN.rate).toBeGreaterThanOrEqual(5);
    expect(RELEASED_SPIN.rate).toBeLessThanOrEqual(10);
  });

  it('does nothing at all before release', () => {
    const s = advanceSpin(INITIAL_SPIN, 1);
    expect(s).toBe(INITIAL_SPIN);
    expect(spinStage(s)).toBe('ready');
  });

  it('keeps spinning at full rate while the pointing system wakes up', () => {
    const frames = run(WAKE_UP_S - 0.1);
    const end = frames[frames.length - 1];
    expect(end.rate).toBeCloseTo(RELEASED_SPIN.rate, 5);
    expect(end.angle).toBeGreaterThan(0);
  });
});

describe('then it brings itself under control', () => {
  it('starts bleeding off spin once awake', () => {
    const frames = run(WAKE_UP_S + 1);
    const end = frames[frames.length - 1];
    expect(end.rate).toBeLessThan(RELEASED_SPIN.rate);
    expect(end.rate).toBeCloseTo(RELEASED_SPIN.rate - DAMPING, 1);
  });

  it('comes to a complete stop, and stops running', () => {
    const frames = run(20);
    const end = frames[frames.length - 1];
    expect(end.rate).toBe(0);
    expect(end.running).toBe(false);
    expect(spinStage(end)).toBe('stable');
  });

  it('settles in a sensible length of time to watch', () => {
    const frames = run(20);
    const settledAt = frames.findIndex((f) => !f.running);
    const seconds = settledAt / 60;
    // Long enough to follow, short enough that nobody walks away.
    expect(seconds).toBeGreaterThan(5);
    expect(seconds).toBeLessThan(12);
    // And it matches the closed form: wake-up plus rate divided by damping.
    expect(seconds).toBeCloseTo(WAKE_UP_S + RELEASED_SPIN.rate / DAMPING, 0);
  });

  it('never spins backwards', () => {
    for (const f of run(20)) expect(f.rate).toBeGreaterThanOrEqual(0);
  });

  it('keeps rotating the whole time it is spinning, then holds still', () => {
    const frames = run(20);
    const settled = frames.findIndex((f) => !f.running);
    expect(frames[settled].angle).toBeGreaterThan(frames[10].angle);
    // Once stopped, the angle must not creep.
    const after = advanceSpin(frames[settled], 1);
    expect(after.angle).toBe(frames[settled].angle);
  });
});

describe('it drifts clear of the launcher', () => {
  it('moves away and then stops drifting', () => {
    const frames = run(20);
    expect(frames[60].x).toBeGreaterThan(0);
    expect(frames[frames.length - 1].x).toBe(118);
  });

  it('never overshoots the end of the frame', () => {
    for (const f of run(20)) expect(f.x).toBeLessThanOrEqual(118);
  });
});

describe('the story reads in the right order', () => {
  it('passes through released, tumbling, detumbling, then stable', () => {
    const seen: string[] = [];
    for (const f of run(20)) {
      const st = spinStage(f);
      if (seen[seen.length - 1] !== st) seen.push(st);
    }
    expect(seen).toEqual(['released', 'tumbling', 'detumbling', 'stable']);
  });

  it('gives the same result whatever the frame rate', () => {
    // A learner on a slow laptop must see the same thing as everyone else.
    const at = (fps: number) => {
      let s = { ...RELEASED_SPIN };
      for (let i = 0; i < 20 * fps; i++) s = advanceSpin(s, 1 / fps);
      return s;
    };
    expect(at(30).rate).toBe(0);
    expect(at(144).rate).toBe(0);
    expect(at(30).elapsed).toBeCloseTo(at(144).elapsed, 0);
  });
});
