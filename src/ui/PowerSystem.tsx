/**
 * The power system, opened up.
 *
 * Two halves: a tree showing what the power system is made of, and an animated
 * flow diagram showing how the electricity actually moves. Toggle between
 * sunlight and shadow and the flow reverses - which is the single idea the
 * whole subsystem is built around.
 */

import { useEffect, useRef, useState } from 'react';
import type { TreeNode } from './content/trees';

// ---------------------------------------------------------------------------
// The tree view
//
// Trees themselves live in content/trees.ts, one per subsystem.
// ---------------------------------------------------------------------------

export function SubsystemTree({
  tree,
  selected,
  onSelect,
}: {
  tree: TreeNode;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="tree">
      <button className={`tree-root${selected === tree.id ? ' on' : ''}`}
              onClick={() => onSelect(tree.id)}>
        {tree.label}
      </button>
      <div className="tree-branches">
        {tree.children?.map((b) => (
          <div className="branch" key={b.id}>
            <button className={`tree-branch${selected === b.id ? ' on' : ''}`}
                    onClick={() => onSelect(b.id)}>
              {b.label}
            </button>
            <div className="leaves">
              {b.children?.map((l) => (
                <button key={l.id}
                        className={`tree-leaf${selected === l.id ? ' on' : ''}`}
                        onClick={() => onSelect(l.id)}>
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The animated flow
// ---------------------------------------------------------------------------

const W = 600, H = 220;

interface Box { id: string; x: number; y: number; w: number; h: number; label: string; sub: string }

const BOXES: Box[] = [
  { id: 'sun', x: 16, y: 86, w: 74, h: 48, label: 'Sunlight', sub: 'free, half the time' },
  { id: 'panels', x: 126, y: 86, w: 94, h: 48, label: 'Solar panels', sub: 'make the power' },
  { id: 'board', x: 258, y: 86, w: 94, h: 48, label: 'Power board', sub: 'shares it out' },
  { id: 'battery', x: 390, y: 20, w: 94, h: 48, label: 'Battery', sub: 'stores spare' },
  { id: 'loads', x: 390, y: 152, w: 94, h: 48, label: 'Everything else', sub: 'uses it' },
];

export function PowerFlow() {
  const [sunlit, setSunlit] = useState(true);
  const [t, setT] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    let last = 0;
    const step = (now: number) => {
      if (!last) last = now;
      setT((v) => (v + (now - last) / 1400) % 1);
      last = now;
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const box = (id: string) => BOXES.find((b) => b.id === id)!;
  const rightOf = (b: Box) => [b.x + b.w, b.y + b.h / 2] as const;
  const leftOf = (b: Box) => [b.x, b.y + b.h / 2] as const;

  /** Flows that are live right now. In shadow the battery feeds the board. */
  const flows = sunlit
    ? [
        { from: rightOf(box('sun')), to: leftOf(box('panels')), colour: '#e8a53d' },
        { from: rightOf(box('panels')), to: leftOf(box('board')), colour: '#2a4d8f' },
        { from: rightOf(box('board')), to: leftOf(box('battery')), colour: '#1f6f4a' },
        { from: rightOf(box('board')), to: leftOf(box('loads')), colour: '#2a4d8f' },
      ]
    : [
        { from: leftOf(box('battery')), to: rightOf(box('board')), colour: '#9e2b36' },
        { from: rightOf(box('board')), to: leftOf(box('loads')), colour: '#2a4d8f' },
      ];

  return (
    <div className="powerflow">
      <div className="pf-toggle">
        <button aria-pressed={sunlit} onClick={() => setSunlit(true)}>In sunlight</button>
        <button aria-pressed={!sunlit} onClick={() => setSunlit(false)}>
          In Earth&rsquo;s shadow
        </button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Diagram showing electricity flowing from sunlight through the solar panels and power board to the battery and the rest of the satellite">
        {!sunlit && <rect x="0" y="0" width={W} height={H} fill="rgba(28,26,23,0.055)" />}

        {flows.map((f, i) => {
          const [x1, y1] = f.from, [x2, y2] = f.to;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={f.colour} strokeWidth="1.6" opacity="0.32" />
              {[0, 0.33, 0.66].map((o, k) => {
                const p = (t + o) % 1;
                const cx = x1 + (x2 - x1) * p;
                const cy = y1 + (y2 - y1) * (p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p));
                return <circle key={k} cx={cx} cy={cy} r="3.6" fill={f.colour} />;
              })}
            </g>
          );
        })}

        {BOXES.map((b) => {
          const dim = !sunlit && (b.id === 'sun' || b.id === 'panels');
          return (
            <g key={b.id} opacity={dim ? 0.32 : 1}>
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="3"
                    fill="#f7f5f0" stroke="rgba(28,26,23,0.45)" strokeWidth="1.3" />
              <text x={b.x + b.w / 2} y={b.y + 21} textAnchor="middle" fontSize="12.5"
                    fontFamily="IBM Plex Sans, sans-serif" fill="#1c1a17" fontWeight="500">
                {b.label}
              </text>
              <text x={b.x + b.w / 2} y={b.y + 36} textAnchor="middle" fontSize="10"
                    fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.5)">
                {b.sub}
              </text>
            </g>
          );
        })}
      </svg>

      <div className={`pf-caption ${sunlit ? 'sun' : 'dark'}`}>
        {sunlit ? (
          <>
            <strong>In sunlight, the panels do everything.</strong> They run the
            satellite and charge the battery at the same time. Whatever is left over
            after everything has taken its share goes into storage.
          </>
        ) : (
          <>
            <strong>In shadow, the flow reverses.</strong> The panels make nothing,
            so the battery feeds the satellite instead of being fed by it. Everything
            now depends on how much you banked while the Sun was out.
          </>
        )}
      </div>
    </div>
  );
}
