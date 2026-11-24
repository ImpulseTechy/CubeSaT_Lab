/**
 * The power system, opened up.
 *
 * Two halves: a tree showing what the power system is made of, and an animated
 * flow diagram showing how the electricity actually moves. Toggle between
 * sunlight and shadow and the flow reverses - which is the single idea the
 * whole subsystem is built around.
 */

import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// The tree
// ---------------------------------------------------------------------------

export interface TreeNode {
  id: string;
  label: string;
  short: string;
  detail: string;
  children?: TreeNode[];
}

export const EPS_TREE: TreeNode = {
  id: 'eps',
  label: 'Power system',
  short: 'Everything to do with electricity on board.',
  detail:
    'Without this nothing else runs. Of every CubeSat failure that has been written up, about one in seven traces back to power.',
  children: [
    {
      id: 'make',
      label: 'Making it',
      short: 'Turning sunlight into electricity.',
      detail: 'Solar cells are the only source of new energy a satellite has.',
      children: [
        {
          id: 'cells',
          label: 'Solar cells',
          short: 'Convert about a third of the sunlight hitting them.',
          detail:
            'Space-grade cells are far better than the ones on a house roof — roughly 30% efficient instead of 20% — because every gram and every centimetre counts. They are also brittle and expensive, which is why they are glued flat to the sides.',
        },
        {
          id: 'angle',
          label: 'Why the angle matters',
          short: 'A panel edge-on to the Sun makes almost nothing.',
          detail:
            'A panel facing the Sun squarely catches all the light that falls on it. Tilt it and it catches less, in proportion to the tilt. At 60 degrees off you get half. Edge-on you get nothing at all. This is why which way the satellite points changes the power budget so dramatically.',
        },
        {
          id: 'deploy',
          label: 'Stuck-on or fold-out',
          short: 'Fold-out wings catch roughly three times more.',
          detail:
            'Cells glued to the body are simple and safe but limited by the size of the satellite. Fold-out wings unfold once in orbit and can triple your power — at the cost of real weight, and a mechanism that has to work first time with nobody there to help.',
        },
      ],
    },
    {
      id: 'store',
      label: 'Storing it',
      short: 'Getting through Earth’s shadow.',
      detail: 'For about 35 minutes of every lap the panels make nothing at all.',
      children: [
        {
          id: 'battery',
          label: 'The battery',
          short: 'Rechargeable cells, much like a phone’s.',
          detail:
            'Usually the same chemistry as a laptop battery. It charges whenever there is spare sunlight and discharges in the dark. It will do this roughly 5,500 times a year, every year, with no way to replace it.',
        },
        {
          id: 'cycles',
          label: 'Shallow sips last longer',
          short: 'Draining it hard every lap wears it out fast.',
          detail:
            'A battery that drops to 10% every lap will not last the mission. One that only dips to 85% can last for years. This is why engineers deliberately fit a bigger battery than they strictly need — not for capacity, but so each lap only takes a small sip.',
        },
        {
          id: 'cold',
          label: 'The freezing problem',
          short: 'Charging a cold battery damages it permanently.',
          detail:
            'Below 0 °C, charging a lithium battery plates metal inside it and ruins it for good. Satellites in shadow get very cold, so many carry a small electric heater — which itself draws power from the very battery it is protecting.',
        },
      ],
    },
    {
      id: 'share',
      label: 'Sharing it out',
      short: 'Getting the right power to the right part.',
      detail: 'A board in the middle of the stack does the distributing.',
      children: [
        {
          id: 'board',
          label: 'The power board',
          short: 'The switchboard of the satellite.',
          detail:
            'It takes the messy, varying output of the solar cells, turns it into the steady voltages each part needs, and can cut power to anything that misbehaves. It also protects the battery from being over-charged or completely drained.',
        },
        {
          id: 'mppt',
          label: 'Squeezing more out',
          short: 'Smart boards get about 5% more from the same panels.',
          detail:
            'Solar cells have one sweet spot where they give the most power, and it moves as they heat up and cool down. A smarter board constantly hunts for that spot. It is a small gain, but it is free weight-wise — which makes it one of the cheapest wins available.',
        },
      ],
    },
    {
      id: 'spend',
      label: 'Spending it',
      short: 'Where the electricity actually goes.',
      detail: 'Every part draws some. The instrument usually draws the most.',
      children: [
        {
          id: 'loads',
          label: 'What each part draws',
          short: 'The computer sips; the camera and radio gulp.',
          detail:
            'A computer might use less than half a watt continuously. A camera can use six watts while it is running, and a transmitter several more while it is sending. The continuous small draws add up to more than people expect.',
        },
        {
          id: 'duty',
          label: 'How often you run things',
          short: 'The single most powerful choice you make.',
          detail:
            'You cannot change physics, but you can change how often the hungry parts are switched on. Running a camera a quarter of the time instead of all the time is often the difference between a satellite that survives and one that does not. It is also the first thing to try when your design fails.',
        },
      ],
    },
  ],
};

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

export function findNode(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;
  for (const c of tree.children ?? []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
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
