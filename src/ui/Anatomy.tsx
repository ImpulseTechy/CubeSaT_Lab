/**
 * A labelled cutaway of a 3U CubeSat.
 *
 * Drawn rather than photographed so each part can be selected and explained.
 * The stack order is the real one: power at the bottom (heaviest, lowest centre
 * of gravity), computer and radio in the middle, instrument at the top looking
 * out of the end.
 */

import { SUBSYSTEMS } from './learn';

const PARTS = [
  { id: 'payload', y: 42, h: 58, label: 'Instrument' },
  { id: 'obc', y: 104, h: 34, label: 'Computer' },
  { id: 'comms', y: 142, h: 34, label: 'Radio' },
  { id: 'adcs', y: 180, h: 34, label: 'Pointing' },
  { id: 'eps', y: 218, h: 46, label: 'Battery + power' },
];

export function Anatomy({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const W = 300, H = 330;
  const bx = 96, bw = 108;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="anatomy"
      role="img"
      aria-label="Cutaway diagram of a 3U CubeSat showing the instrument, computer, radio, pointing system and power system stacked inside the frame"
    >
      {/* solar panels on the long faces */}
      {[bx - 15, bx + bw + 3].map((x, i) => (
        <g key={i}>
          <rect x={x} y={30} width={12} height={250} rx="1"
                fill={selected === 'solar' ? '#2a4d8f' : '#30406b'} opacity={0.9} />
          {Array.from({ length: 10 }, (_, k) => (
            <line key={k} x1={x} x2={x + 12} y1={30 + k * 25} y2={30 + k * 25}
                  stroke="#f7f5f0" strokeWidth="0.6" opacity="0.5" />
          ))}
        </g>
      ))}

      {/* frame */}
      <rect x={bx} y={26} width={bw} height={258} rx="2"
            fill="none" stroke="rgba(28,26,23,0.55)" strokeWidth="2" />
      {/* rails */}
      {[bx - 3, bx + bw - 3].map((x, i) => (
        <rect key={i} x={x} y={22} width={6} height={266} rx="1"
              fill="rgba(28,26,23,0.30)" />
      ))}

      {/* internal boards */}
      {PARTS.map((p) => {
        const on = selected === p.id;
        return (
          <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: 'pointer' }}>
            <rect
              x={bx + 7} y={p.y} width={bw - 14} height={p.h} rx="2"
              fill={on ? '#2a4d8f' : '#efece4'}
              stroke={on ? '#2a4d8f' : 'rgba(28,26,23,0.35)'}
              strokeWidth={on ? 2 : 1}
            />
            <text
              x={bx + bw / 2} y={p.y + p.h / 2 + 4}
              textAnchor="middle" fontSize="10.5"
              fontFamily="IBM Plex Sans, sans-serif"
              fill={on ? '#fff' : 'rgba(28,26,23,0.75)'}
            >
              {p.label}
            </text>
            {/* leader line and hit target out to the left */}
            <line x1={bx - 20} x2={bx + 5} y1={p.y + p.h / 2} y2={p.y + p.h / 2}
                  stroke={on ? '#2a4d8f' : 'rgba(28,26,23,0.25)'} strokeWidth="1"
                  strokeDasharray={on ? '0' : '2 2'} />
            <circle cx={bx - 24} cy={p.y + p.h / 2} r="3.5"
                    fill={on ? '#2a4d8f' : '#f7f5f0'}
                    stroke={on ? '#2a4d8f' : 'rgba(28,26,23,0.35)'} strokeWidth="1" />
          </g>
        );
      })}

      {/* antenna */}
      <g onClick={() => onSelect('comms')} style={{ cursor: 'pointer' }}>
        <line x1={bx + bw / 2} x2={bx + bw / 2} y1={26} y2={10}
              stroke={selected === 'comms' ? '#2a4d8f' : 'rgba(28,26,23,0.45)'} strokeWidth="1.5" />
        <line x1={bx + bw / 2 - 22} x2={bx + bw / 2 + 22} y1={10} y2={10}
              stroke={selected === 'comms' ? '#2a4d8f' : 'rgba(28,26,23,0.45)'} strokeWidth="1.5" />
        <text x={bx + bw / 2 + 28} y={13} fontSize="9.5"
              fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">aerial</text>
      </g>

      {/* scale bar */}
      <g>
        <line x1={44} y1={26} x2={44} y2={284} stroke="rgba(28,26,23,0.28)" strokeWidth="1" />
        <line x1={40} y1={26} x2={48} y2={26} stroke="rgba(28,26,23,0.28)" strokeWidth="1" />
        <line x1={40} y1={284} x2={48} y2={284} stroke="rgba(28,26,23,0.28)" strokeWidth="1" />
        <text x={36} y={160} fontSize="9.5" textAnchor="middle"
              fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)"
              transform="rotate(-90 36 160)">34 cm — three 10 cm cubes</text>
      </g>

      <text x={bx + bw / 2} y={302} textAnchor="middle" fontSize="10"
            fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">
        a 3U CubeSat, cut open
      </text>
      <text x={bx + bw / 2} y={318} textAnchor="middle" fontSize="10.5"
            fontFamily="IBM Plex Sans, sans-serif" fill="rgba(28,26,23,0.60)">
        click any part to find out what it does
      </text>
    </svg>
  );
}

export function subsystemById(id: string) {
  return SUBSYSTEMS.find((s) => s.id === id);
}
