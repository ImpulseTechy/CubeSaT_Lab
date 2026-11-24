import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatNumber, type Traced } from '../physics/trace';
import type { VerdictCard as Card } from '../physics/verdict';
import type { SocSample } from '../physics/power';
import { GLOSSARY } from './glossary';

// ---------------------------------------------------------------------------
// A word you can click to find out what it means.
// Jargon is never hidden - it is taught.
// ---------------------------------------------------------------------------

export function Term({
  k,
  children,
}: {
  k: keyof typeof GLOSSARY;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const t = GLOSSARY[k];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="term"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); setOpen((o) => !o); }}
      >
        {children ?? t.plain}
      </button>
      {open && (
        <span className="term-pop" role="dialog">
          <span className="jargon">engineers call this: {t.technical}</span>
          {t.definition}
          {t.matters && <span className="matters">{t.matters}</span>}
          {t.analogy && <span className="analogy">{t.analogy}</span>}
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// A number you can click to see exactly where it came from.
// ---------------------------------------------------------------------------

export function Stat({
  t,
  label,
  term,
}: {
  t: Traced<number>;
  label?: string;
  term?: keyof typeof GLOSSARY;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="stat-wrap">
      <button className="stat" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="k">{label ?? t.trace.label}</span>
        <span className="v">
          {formatNumber(t.value)}
          <span className="u">{t.unit}</span>
        </span>
        <span className="hint">{open ? '− hide the maths' : '+ show the maths'}</span>
      </button>
      {term && (
        <div style={{ padding: '0 12px 9px', fontSize: 12.5 }}>
          <Term k={term} />
        </div>
      )}
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
          {s.note ? <span className="note">  — {s.note}</span> : null}
        </span>
      ))}
      {t.trace.assumptions?.map((a, i) => (
        <span className="assume" key={i}>this assumes: {a}</span>
      ))}
      {t.trace.source && <span className="src">method: {t.trace.source}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict card
// ---------------------------------------------------------------------------

const STATUS_LABEL = { go: 'WORKS', warn: 'RISKY', nogo: 'FAILS' } as const;

export function VerdictCardView({ card }: { card: Card }) {
  const [tech, setTech] = useState(false);
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
          <span className="lbl">How to fix it</span>
          {card.fix}
        </div>
      )}
      {card.technical && (
        <>
          <button className="tech-toggle" onClick={() => setTech((v) => !v)}>
            {tech ? 'hide the engineering version' : 'say that in engineering terms'}
          </button>
          {tech && <div className="tech">{card.technical}</div>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------

export function SocChart({
  samples,
  orbitSeconds,
}: {
  samples: SocSample[];
  orbitSeconds: number;
}) {
  const W = 620, H = 182, padL = 40, padB = 26, padT = 12, padR = 10;
  if (!samples.length) return null;

  const tMax = samples[samples.length - 1].t;
  const x = (t: number) => padL + (t / tMax) * (W - padL - padR);
  const y = (s: number) => padT + (1 - s) * (H - padT - padB);

  const path = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${x(s.t).toFixed(1)},${y(s.soc).toFixed(1)}`)
    .join('');

  const spans: { a: number; b: number }[] = [];
  let start: number | null = null;
  for (const s of samples) {
    if (!s.sunlit && start === null) start = s.t;
    if (s.sunlit && start !== null) { spans.push({ a: start, b: s.t }); start = null; }
  }
  if (start !== null) spans.push({ a: start, b: tMax });

  const laps = Math.round(tMax / orbitSeconds);

  return (
    <>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="How full the battery is over successive laps around Earth">
        {spans.map((s, i) => (
          <rect key={i} x={x(s.a)} y={padT} width={Math.max(0, x(s.b) - x(s.a))}
                height={H - padT - padB} fill="#efece4" />
        ))}
        {[0, 0.5, 1].map((gv) => (
          <g key={gv}>
            <line x1={padL} x2={W - padR} y1={y(gv)} y2={y(gv)}
                  stroke="rgba(28,26,23,0.14)" strokeWidth="1" />
            <text x={padL - 7} y={y(gv) + 3.5} fill="rgba(28,26,23,0.42)"
                  fontSize="10" textAnchor="end" fontFamily="IBM Plex Mono, monospace">
              {(gv * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - padR} y1={y(0.2)} y2={y(0.2)}
              stroke="#9e2b36" strokeWidth="1" strokeDasharray="3 3" />
        <text x={W - padR} y={y(0.2) - 5} fill="#9e2b36" fontSize="10" textAnchor="end"
              fontFamily="IBM Plex Mono, monospace">
          satellite dies below here
        </text>
        <path d={path} fill="none" stroke="#2a4d8f" strokeWidth="1.8" />
        {Array.from({ length: laps + 1 }, (_, i) => i).map((i) => (
          <text key={i} x={x(i * orbitSeconds)} y={H - 9} fill="rgba(28,26,23,0.42)"
                fontSize="10" textAnchor="middle" fontFamily="IBM Plex Mono, monospace">{i}</text>
        ))}
        <text x={(W + padL) / 2} y={H - 0} fill="rgba(28,26,23,0.42)" fontSize="10"
              textAnchor="middle">laps around Earth</text>
      </svg>
      <div className="chart-cap">
        The blue line is how full the battery is. Shaded stripes are the minutes
        spent in Earth&rsquo;s shadow, where the solar panels make nothing — that is
        why the line dips. If it ever touches the red line, the satellite shuts down
        for good.
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
  const W = 620, H = 300;
  const x = (lon: number) => ((lon + 180) / 360) * W;
  const y = (lat: number) => ((90 - lat) / 180) * H;

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
           aria-label="The path the satellite traces over Earth in one day, with times it can talk to the antenna marked">
        <rect x="0" y="0" width={W} height={H} fill="#efece4" />
        {[-60, -30, 30, 60].map((lat) => (
          <line key={lat} x1="0" x2={W} y1={y(lat)} y2={y(lat)}
                stroke="rgba(28,26,23,0.10)" strokeWidth="1" />
        ))}
        <line x1="0" x2={W} y1={y(0)} y2={y(0)} stroke="rgba(28,26,23,0.28)" strokeWidth="1" />
        <text x="5" y={y(0) - 5} fill="rgba(28,26,23,0.42)" fontSize="10"
              fontFamily="IBM Plex Mono, monospace">equator</text>
        {[-120, -60, 0, 60, 120].map((lon) => (
          <line key={lon} x1={x(lon)} x2={x(lon)} y1="0" y2={H}
                stroke="rgba(28,26,23,0.10)" strokeWidth="1" />
        ))}
        {segs.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#2a4d8f" strokeWidth="0.9" opacity="0.4" />
        ))}
        {visible.map((p, i) => (
          <circle key={i} cx={x(p.lonDeg)} cy={y(p.latDeg)} r="2" fill="#1f6f4a" />
        ))}
        <circle cx={x(station.lonDeg)} cy={y(station.latDeg)} r="5"
                fill="none" stroke="#8a5a12" strokeWidth="1.8" />
        <text x={x(station.lonDeg) + 9} y={y(station.latDeg) + 3.5}
              fill="#8a5a12" fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
          your antenna
        </text>
      </svg>
      <div className="chart-cap">
        One day of flying, drawn on a flat map of Earth. Each blue line is one lap.
        They shift left because Earth keeps turning underneath. Green dots are the only
        moments the satellite is high enough above your antenna to talk to it.
      </div>
    </>
  );
}

export function Section({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="section">
      <h3>{title}</h3>
      {lede && <p className="lede">{lede}</p>}
      {children}
    </section>
  );
}
