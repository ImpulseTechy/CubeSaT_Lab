/**
 * Shared presentational pieces: traced stats, charts, verdict cards.
 */

import { useState, type ReactNode } from 'react';
import { formatNumber, type Traced } from '../physics/trace';
import type { VerdictCard as Card } from '../physics/verdict';
import type { SocSample } from '../physics/power';

// ---------------------------------------------------------------------------
// A number you can click to see its derivation. The whole point of the engine
// returning traces is that this component needs no per-value special casing.
// ---------------------------------------------------------------------------

export function Stat({ t, label }: { t: Traced<number>; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className="stat"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="k">{label ?? t.trace.label}</span>
        <span className="v">
          {formatNumber(t.value)}
          <span className="u">{t.unit}</span>
        </span>
        <span className="hint">{open ? 'hide working' : 'show working'}</span>
      </button>
      {open && <TraceView t={t} />}
    </div>
  );
}

export function TraceView({ t }: { t: Traced<number> }) {
  return (
    <div className="trace">
      <span className="formula">{t.trace.formula}</span>
      {t.trace.substitutions.map((s, i) => (
        <span className="sub" key={i}>
          <span className="sym">{s.symbol}</span> = {formatNumber(s.value)} {s.unit}
          {s.note ? <span className="note">   ({s.note})</span> : null}
        </span>
      ))}
      {t.trace.assumptions?.map((a, i) => (
        <span className="assume" key={i}>assumes: {a}</span>
      ))}
      {t.trace.source && <span className="src">source: {t.trace.source}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict card
// ---------------------------------------------------------------------------

const STATUS_LABEL = { go: 'GO', warn: 'WARN', nogo: 'NO-GO' } as const;

export function VerdictCardView({ card }: { card: Card }) {
  return (
    <div className={`card ${card.status}`}>
      <div className="head">
        <span className="title">{card.title}</span>
        <span className="status">{STATUS_LABEL[card.status]}</span>
      </div>
      <div className="headline">{card.headline}</div>
      <div className="diag">{card.diagnosis}</div>
      {card.fix && (
        <div className="fix">
          <strong>Fix: </strong>
          {card.fix}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts - small inline SVG, no library needed at this size
// ---------------------------------------------------------------------------

export function SocChart({
  samples,
  orbitSeconds,
}: {
  samples: SocSample[];
  orbitSeconds: number;
}) {
  const W = 600, H = 170, padL = 34, padB = 20, padT = 10, padR = 8;
  if (!samples.length) return null;

  const tMax = samples[samples.length - 1].t;
  const x = (t: number) => padL + (t / tMax) * (W - padL - padR);
  const y = (s: number) => padT + (1 - s) * (H - padT - padB);

  const path = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.t).toFixed(1)},${y(s.soc).toFixed(1)}`)
    .join('');

  // Shade eclipse spans so the cause of each dip is visible.
  const spans: { a: number; b: number }[] = [];
  let start: number | null = null;
  for (const s of samples) {
    if (!s.sunlit && start === null) start = s.t;
    if (s.sunlit && start !== null) { spans.push({ a: start, b: s.t }); start = null; }
  }
  if (start !== null) spans.push({ a: start, b: tMax });

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Battery state of charge over successive orbits">
        {spans.map((s, i) => (
          <rect key={i} x={x(s.a)} y={padT} width={Math.max(0, x(s.b) - x(s.a))}
                height={H - padT - padB} fill="#1b2433" />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="#243040" strokeWidth="1" />
            <text x={padL - 6} y={y(g) + 3} fill="#5d6f87" fontSize="9" textAnchor="end">
              {(g * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(0.2)} y2={y(0.2)}
              stroke="#ef4e67" strokeWidth="1" strokeDasharray="4 3" />
        <text x={W - padR} y={y(0.2) - 4} fill="#ef4e67" fontSize="9" textAnchor="end">
          brownout floor
        </text>
        <path d={path} fill="none" stroke="#4d9fff" strokeWidth="1.8" />
        {Array.from({ length: Math.ceil(tMax / orbitSeconds) + 1 }, (_, i) => i).map((i) => (
          <text key={i} x={x(i * orbitSeconds)} y={H - 6} fill="#5d6f87"
                fontSize="9" textAnchor="middle">{i}</text>
        ))}
      </svg>
      <div className="chart-cap">
        Orbit number along the bottom. Shaded bands are eclipse. The dashed line is
        the 20% brownout floor.
      </div>
    </>
  );
}

export function GroundTrackChart({
  points,
  station,
}: {
  points: { latDeg: number; lonDeg: number; inView: boolean }[];
  station: { latDeg: number; lonDeg: number; name: string };
}) {
  const W = 600, H = 300;
  const x = (lon: number) => ((lon + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;

  // Break the polyline where it wraps the antimeridian.
  const segs: string[] = [];
  let cur: string[] = [];
  let prevLon: number | null = null;
  for (const p of points) {
    if (prevLon !== null && Math.abs(p.lonDeg - prevLon) > 180) {
      segs.push(cur.join('')); cur = [];
    }
    cur.push(`${cur.length === 0 ? 'M' : 'L'}${x(p.lonDeg).toFixed(1)},${y(p.latDeg).toFixed(1)}`);
    prevLon = p.lonDeg;
  }
  if (cur.length) segs.push(cur.join(''));

  const visible = points.filter((p) => p.inView);

  return (
    <>
      <svg className="chart" style={{ height: 300 }} viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Ground track over 24 hours with ground-station passes marked">
        <rect x="0" y="0" width={W} height={H} fill="#0a0e14" />
        {[-60, -30, 0, 30, 60].map((lat) => (
          <g key={lat}>
            <line x1="0" x2={W} y1={y(lat)} y2={y(lat)}
                  stroke={lat === 0 ? '#2e3d52' : '#1b2433'} strokeWidth="1" />
            <text x="3" y={y(lat) - 3} fill="#5d6f87" fontSize="9">{lat}°</text>
          </g>
        ))}
        {[-120, -60, 0, 60, 120].map((lon) => (
          <line key={lon} x1={x(lon)} x2={x(lon)} y1="0" y2={H} stroke="#1b2433" strokeWidth="1" />
        ))}
        {segs.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#4d9fff" strokeWidth="1" opacity="0.55" />
        ))}
        {visible.map((p, i) => (
          <circle key={i} cx={x(p.lonDeg)} cy={y(p.latDeg)} r="1.6" fill="#35c08a" />
        ))}
        <circle cx={x(station.lonDeg)} cy={y(station.latDeg)} r="4"
                fill="none" stroke="#e8a53d" strokeWidth="1.8" />
        <text x={x(station.lonDeg) + 7} y={y(station.latDeg) + 3}
              fill="#e8a53d" fontSize="10">{station.name.split('(')[0].trim()}</text>
      </svg>
      <div className="chart-cap">
        24 hours of ground track. Green marks where the satellite is above the
        station's elevation mask — those are your passes.
      </div>
    </>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      {children}
    </section>
  );
}
