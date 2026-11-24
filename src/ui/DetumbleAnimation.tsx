/**
 * Release, tumble, detumble, hold steady.
 *
 * Explains the pointing system in about fifteen seconds, which no amount of
 * prose manages. The launcher throws the satellite out spinning; it has to stop
 * that spin using nothing but Earth's magnetic field, and only then can the
 * solar panels and camera do their jobs properly.
 *
 * The spin-rate number is real in shape: deployers impart roughly 5-10 degrees
 * per second, and magnetorquer detumbling typically takes hours to days. We
 * compress the time, not the story.
 */

import { useEffect, useRef, useState } from 'react';

type Stage = 'ready' | 'released' | 'tumbling' | 'detumbling' | 'stable';

const START_RATE = 9.2; // deg/s, typical deployer tip-off

/** The simulation state. Kept separate so it can be tested without a browser. */
export interface SpinState {
  rate: number;
  angle: number;
  x: number;
  elapsed: number;
  running: boolean;
}

export const INITIAL_SPIN: SpinState = {
  rate: 0, angle: 0, x: 0, elapsed: 0, running: false,
};

export const RELEASED_SPIN: SpinState = {
  rate: START_RATE, angle: 0, x: 0, elapsed: 0, running: true,
};

/** How long the pointing system takes to wake up, in seconds. */
export const WAKE_UP_S = 2.4;
/** How fast it bleeds off spin once awake, in degrees per second per second. */
export const DAMPING = 1.55;

/**
 * Advance the simulation by dt seconds. Pure: same input, same output.
 *
 * Separated from the component so the behaviour can be verified with a fake
 * clock instead of relying on animation frames, which browsers throttle
 * heavily whenever the page is not visible.
 */
export function advanceSpin(s: SpinState, dt: number): SpinState {
  if (!s.running) return s;
  const elapsed = s.elapsed + dt;
  const awake = elapsed > WAKE_UP_S;
  const rate = awake ? Math.max(0, s.rate - DAMPING * dt) : s.rate;
  const settled = awake && rate <= 0.05;
  return {
    rate: settled ? 0 : rate,
    angle: s.angle + rate * 14 * dt,
    x: s.x < 118 ? Math.min(118, s.x + 46 * dt) : s.x,
    elapsed,
    running: !settled,
  };
}

/** Which part of the story the simulation is currently in. */
export function spinStage(s: SpinState): Stage {
  if (!s.running && s.elapsed === 0) return 'ready';
  if (!s.running) return 'stable';
  if (s.elapsed > WAKE_UP_S) return 'detumbling';
  return s.elapsed > 0.9 ? 'tumbling' : 'released';
}

export function DetumbleAnimation() {
  const [stage, setStage] = useState<Stage>('ready');
  const [angle, setAngle] = useState(0);
  const [rate, setRate] = useState(0);
  const [x, setX] = useState(0);
  const [torquers, setTorquers] = useState(false);

  /**
   * The simulation lives in refs, not state.
   *
   * An earlier version put `rate` in the effect's dependency list while the
   * effect itself updated it, so the loop tore down and restarted on every
   * frame - which reset its own clock and meant the spin never decayed. Refs
   * keep one continuous loop running and state is only for rendering.
   */
  const sim = useRef<SpinState>({ ...INITIAL_SPIN });

  const release = () => {
    sim.current = { ...RELEASED_SPIN };
    setStage('released'); setRate(START_RATE); setAngle(0); setX(0); setTorquers(false);
  };

  /**
   * One loop, started on mount and never torn down.
   *
   * Gating the loop on state meant every frame's setState re-ran the effect,
   * which cancelled the frame it had just scheduled - the loop managed about
   * four frames a second and the spin never decayed. Now the loop always runs
   * and simply idles when there is nothing to simulate.
   */
  useEffect(() => {
    // Timing is local to this effect, not a shared ref. In development React
    // mounts twice, and two loops sharing one clock each reset it before the
    // other could measure anything - so dt came out at roughly zero and the
    // spin never decayed. `cancelled` makes sure the discarded loop dies.
    let id = 0;
    let cancelled = false;
    let prev = 0;

    const step = (now: number) => {
      if (cancelled) return;
      id = requestAnimationFrame(step);

      if (!sim.current.running) { prev = 0; return; }
      if (!prev) prev = now;
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      const next = advanceSpin(sim.current, dt);
      sim.current = next;

      setRate(next.rate);
      setAngle(next.angle);
      setX(next.x);
      setTorquers(next.running && next.elapsed > WAKE_UP_S);
      setStage(spinStage(next));
    };

    id = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(id); };
  }, []);

  const CAPTION: Record<Stage, { t: string; b: string }> = {
    ready: {
      t: 'Still inside the launcher',
      b: 'The satellite is folded up in a spring-loaded tube attached to the rocket, waiting for its moment.',
    },
    released: {
      t: 'Released',
      b: 'A spring pushes it out. Nothing is gentle about this.',
    },
    tumbling: {
      t: 'Tumbling',
      b: `The push sets it spinning at about ${START_RATE.toFixed(0)} degrees a second. Solar panels catch the Sun only in flashes, and the antenna sweeps past your ground station instead of pointing at it.`,
    },
    detumbling: {
      t: 'Pushing against Earth’s magnetic field',
      b: 'Electromagnets switch on and push against Earth’s own magnetic field — the only thing out here to push against. There is no fuel involved, just electricity and patience.',
    },
    stable: {
      t: 'Steady, and now useful',
      b: 'The spin is gone. The panels can face the Sun, the antenna can point at your ground station, and the camera can look at the ground. Only now can the satellite actually do its job.',
    },
  };

  const cap = CAPTION[stage];
  const spinning = rate > 0.05;

  return (
    <div className="detumble">
      <div className="dt-stage">
        <svg viewBox="0 0 440 200" role="img"
             aria-label="A satellite being released from its launcher, tumbling, then steadying itself">
          {/* Earth's edge below, for orientation */}
          <circle cx={220} cy={330} r={190} fill="#1e3e6b" opacity="0.14" />
          <text x={220} y={192} textAnchor="middle" fontSize="10"
                fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.35)">
            Earth, 500 km below
          </text>

          {/* magnetic field lines, shown while torquers are active */}
          {torquers && (
            <g opacity="0.5">
              {[42, 92, 142].map((yy) => (
                <path key={yy} d={`M 24 ${yy} Q 220 ${yy - 16} 416 ${yy}`}
                      fill="none" stroke="#8a6bab" strokeWidth="1" strokeDasharray="5 5" />
              ))}
              <text x={30} y={34} fontSize="9.5" fontFamily="IBM Plex Mono, monospace"
                    fill="#8a6bab">Earth&rsquo;s magnetic field</text>
            </g>
          )}

          {/* launcher tube */}
          <g>
            <rect x={14} y={74} width={58} height={52} rx="3"
                  fill="#cfd0d4" stroke="rgba(28,26,23,0.45)" strokeWidth="1.5" />
            <rect x={62} y={78} width={8} height={44} fill="rgba(28,26,23,0.18)" />
            <text x={43} y={142} textAnchor="middle" fontSize="9.5"
                  fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.45)">
              launcher
            </text>
          </g>

          {/* the satellite */}
          <g transform={`translate(${86 + x} 100) rotate(${angle})`}>
            <rect x={-16} y={-5} width={11} height={10} rx="1" fill="#2a4d8f" />
            <rect x={5} y={-5} width={11} height={10} rx="1" fill="#2a4d8f" />
            <rect x={-6} y={-16} width={12} height={32} rx="1.5"
                  fill="#f7f5f0" stroke="rgba(28,26,23,0.6)" strokeWidth="1.3" />
            <line x1={-6} y1={-6} x2={6} y2={-6} stroke="rgba(28,26,23,0.28)" strokeWidth="0.8" />
            <line x1={-6} y1={4} x2={6} y2={4} stroke="rgba(28,26,23,0.28)" strokeWidth="0.8" />
            {/* a mark so the rotation is unmistakable */}
            <circle cx={0} cy={-13} r="2.4" fill="#b5604f" />
            {/* torquer glow */}
            {torquers && (
              <circle cx={0} cy={0} r="26" fill="none" stroke="#8a6bab"
                      strokeWidth="1.5" opacity="0.6" strokeDasharray="3 4" />
            )}
          </g>

          {/* spin arrows while tumbling */}
          {spinning && stage !== 'ready' && (
            <g opacity="0.45">
              <path d={`M ${86 + x + 30} 100 a 30 30 0 0 1 -12 24`} fill="none"
                    stroke="#9e2b36" strokeWidth="1.6" />
              <path d={`M ${86 + x + 16} 126 l 4 -2 l -1 5 z`} fill="#9e2b36" />
            </g>
          )}
        </svg>
      </div>

      <div className="dt-side">
        <div className="dt-rate">
          <span className="lbl">How fast it is spinning</span>
          <span className="v">{rate.toFixed(1)}<span className="u">°/sec</span></span>
          <div className="g-track">
            <span className="g-fill"
                  style={{
                    width: `${(rate / START_RATE) * 100}%`,
                    background: rate > 4 ? 'var(--nogo)' : rate > 0.5 ? 'var(--warn)' : 'var(--go)',
                  }} />
          </div>
        </div>

        <div className={`dt-caption ${stage}`}>
          <strong>{cap.t}</strong>
          <p>{cap.b}</p>
        </div>

        <div className="dt-controls">
          <button onClick={release}>
            {stage === 'ready' ? 'Release it' : 'Release it again'}
          </button>
        </div>

        <p className="dt-real">
          Sped up heavily. In reality a satellite is thrown out at roughly 5&ndash;10
          degrees a second and takes <strong>hours or even days</strong> to settle
          down &mdash; all while its panels are only catching the Sun in flashes.
          Some satellites never manage it, and are never properly heard from.
        </p>
      </div>
    </div>
  );
}
