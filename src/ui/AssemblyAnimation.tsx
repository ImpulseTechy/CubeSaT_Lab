/**
 * Build a 3U, one part at a time.
 *
 * Interactive rather than a passive loop: the learner adds each part and
 * watches it slide into the stack, with the running weight total climbing
 * towards the 6 kg limit. That makes the mass budget something you feel before
 * you ever meet it as a number in the simulator.
 */

import { useEffect, useRef, useState } from 'react';

interface Part {
  id: string;
  name: string;
  massG: number;
  /** Slot in the stack, 0 = bottom. */
  slot: number;
  height: number;
  colour: string;
  note: string;
}

/** Bottom to top: heavy things low, instrument at the top looking out. */
const PARTS: Part[] = [
  {
    id: 'frame', name: 'The frame', massG: 290, slot: -1, height: 0, colour: '#8c8f98',
    note: 'The aluminium skeleton. Everything else bolts into this, and its rails are what slide into the launcher.',
  },
  {
    id: 'battery', name: 'Battery', massG: 160, slot: 0, height: 34, colour: '#6b8f5e',
    note: 'Goes at the bottom. It is one of the heaviest parts, and keeping weight low makes the satellite easier to control.',
  },
  {
    id: 'eps', name: 'Power board', massG: 125, slot: 1, height: 26, colour: '#c58b3c',
    note: 'Sits right next to the battery, because it is the thing that charges it and shares power out.',
  },
  {
    id: 'obc', name: 'Computer', massG: 60, slot: 2, height: 24, colour: '#5a7fb5',
    note: 'The brain. Small, low power, and it has to survive radiation that would crash a laptop.',
  },
  {
    id: 'adcs', name: 'Pointing system', massG: 110, slot: 3, height: 26, colour: '#8a6bab',
    note: 'Electromagnets and sensors that stop the satellite tumbling and hold it steady.',
  },
  {
    id: 'comms', name: 'Radio', massG: 85, slot: 4, height: 24, colour: '#4f9e94',
    note: 'Your only link to it. Placed near the antenna at the end of the stack.',
  },
  {
    id: 'payload', name: 'Camera', massG: 180, slot: 5, height: 44, colour: '#b5604f',
    note: 'The reason the satellite exists. It goes at the top so it can look out of the end.',
  },
  {
    id: 'solar', name: 'Solar panels', massG: 150, slot: 99, height: 0, colour: '#2a4d8f',
    note: 'Cells glued to the four long sides. These are what keep everything else alive.',
  },
  {
    id: 'antenna', name: 'Antenna', massG: 20, slot: 100, height: 0, colour: '#7a7f88',
    note: 'Folded flat for launch, then springs out once in orbit. If it fails to unfold, the mission is over.',
  },
];

const LIMIT_G = 6000;

const W = 420, H = 340;
const BX = 168, BW = 84;
const BOTTOM = 296;

export function AssemblyAnimation() {
  const [built, setBuilt] = useState(0);
  const [auto, setAuto] = useState(false);
  const timer = useRef<number>(0);

  useEffect(() => {
    if (!auto) return;
    if (built >= PARTS.length) { setAuto(false); return; }
    timer.current = window.setTimeout(() => setBuilt((b) => b + 1), 950);
    return () => window.clearTimeout(timer.current);
  }, [auto, built]);

  const added = PARTS.slice(0, built);
  const total = added.reduce((s, p) => s + p.massG, 0);
  const last = built > 0 ? PARTS[built - 1] : null;
  const done = built >= PARTS.length;

  const hasFrame = built >= 1;
  const hasSolar = added.some((p) => p.id === 'solar');
  const hasAntenna = added.some((p) => p.id === 'antenna');

  // Stacked boards, measured from the bottom up.
  let y = BOTTOM;
  const placed = added
    .filter((p) => p.slot >= 0 && p.slot < 90)
    .sort((a, b) => a.slot - b.slot)
    .map((p) => {
      y -= p.height + 3;
      return { ...p, y };
    });

  return (
    <div className="assembly">
      <div className="asm-stage">
        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label="A 3U CubeSat being assembled one part at a time">
          {/* ghost outline of the finished satellite */}
          <rect x={BX} y={40} width={BW} height={262} rx="2" fill="none"
                stroke="rgba(28,26,23,0.14)" strokeWidth="1" strokeDasharray="4 4" />

          {/* solar panels */}
          {hasSolar && (
            <g className="asm-in">
              {[BX - 17, BX + BW + 4].map((x, i) => (
                <g key={i}>
                  <rect x={x} y={48} width={13} height={246} rx="1" fill="#2a4d8f" />
                  {Array.from({ length: 9 }, (_, k) => (
                    <line key={k} x1={x} x2={x + 13} y1={52 + k * 27} y2={52 + k * 27}
                          stroke="#f7f5f0" strokeWidth="0.7" opacity="0.45" />
                  ))}
                </g>
              ))}
            </g>
          )}

          {/* frame */}
          {hasFrame && (
            <g className="asm-in">
              <rect x={BX} y={40} width={BW} height={262} rx="2" fill="none"
                    stroke="rgba(28,26,23,0.62)" strokeWidth="2.4" />
              {[BX - 3, BX + BW - 3].map((x, i) => (
                <rect key={i} x={x} y={36} width={6} height={270} rx="1"
                      fill="rgba(28,26,23,0.32)" />
              ))}
            </g>
          )}

          {/* boards */}
          {placed.map((p) => (
            <g key={p.id} className="asm-in">
              <rect x={BX + 7} y={p.y} width={BW - 14} height={p.height} rx="2"
                    fill={p.colour} opacity="0.92" />
              <text x={BX + BW / 2} y={p.y + p.height / 2 + 4} textAnchor="middle"
                    fontSize="10" fontFamily="IBM Plex Sans, sans-serif" fill="#fff">
                {p.name}
              </text>
            </g>
          ))}

          {/* antenna */}
          {hasAntenna && (
            <g className="asm-in">
              <line x1={BX + BW / 2} x2={BX + BW / 2} y1={40} y2={22}
                    stroke="rgba(28,26,23,0.55)" strokeWidth="1.8" />
              <line x1={BX + BW / 2 - 30} x2={BX + BW / 2 + 30} y1={22} y2={22}
                    stroke="rgba(28,26,23,0.55)" strokeWidth="1.8" />
            </g>
          )}

          {/* weight bar */}
          <g>
            <text x={20} y={40} fontSize="10.5" fontFamily="IBM Plex Mono, monospace"
                  fill="rgba(28,26,23,0.42)">WEIGHT</text>
            <rect x={20} y={48} width={22} height={248} rx="2" fill="#efece4"
                  stroke="rgba(28,26,23,0.18)" />
            <rect x={20} y={296 - (total / LIMIT_G) * 248} width={22}
                  height={(total / LIMIT_G) * 248} rx="2"
                  fill={total > LIMIT_G ? '#9e2b36' : '#2a4d8f'} opacity="0.75"
                  style={{ transition: 'height 0.45s ease, y 0.45s ease' }} />
            <text x={31} y={310} textAnchor="middle" fontSize="10"
                  fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.6)">
              0
            </text>
            <text x={31} y={44} textAnchor="middle" fontSize="9"
                  fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">
              6 kg
            </text>
          </g>
        </svg>
      </div>

      <div className="asm-side">
        <div className="asm-count">
          <span className="n">{built}</span>
          <span className="of">of {PARTS.length} parts</span>
        </div>

        <div className="asm-weight">
          <span className="w">{total.toLocaleString()} g</span>
          <span className="lim">
            of the {LIMIT_G.toLocaleString()} g a 3U is allowed
          </span>
          <span className="left">
            {(LIMIT_G - total).toLocaleString()} g still spare
          </span>
        </div>

        {last && (
          <div className="asm-note">
            <strong>{last.name}</strong>
            <span className="mass">+{last.massG} g</span>
            <p>{last.note}</p>
          </div>
        )}

        {!last && (
          <div className="asm-note empty">
            <p>Nothing yet &mdash; just the space a 3U is allowed to fill. Add the first part.</p>
          </div>
        )}

        {done && (
          <div className="asm-done">
            That is a complete satellite, at {total.toLocaleString()} g &mdash; comfortably
            inside the limit. Notice how much weight is left: that spare is what lets you
            add fold-out panels or a better radio later, and it is why engineers guard it.
          </div>
        )}

        <div className="asm-controls">
          <button onClick={() => setBuilt((b) => Math.min(PARTS.length, b + 1))}
                  disabled={done}>
            {built === 0 ? 'Start building' : 'Add the next part'}
          </button>
          <button onClick={() => { setAuto((a) => !a); }} disabled={done}>
            {auto ? 'Stop' : 'Build it for me'}
          </button>
          <button onClick={() => { setBuilt(0); setAuto(false); }}>Clear</button>
        </div>
      </div>
    </div>
  );
}
