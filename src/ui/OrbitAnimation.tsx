/**
 * The orbit loop.
 *
 * This is the one animation that earns its place: it shows the entire operating
 * cycle of a satellite in about twenty seconds, with no jargon and almost no
 * words. Sunlight charges the battery, Earth's shadow drains it, and data only
 * flows during the few moments the satellite is above the ground station.
 *
 * Deliberately not decorative. Every moving thing on screen corresponds to a
 * number a student will later meet in the simulator.
 */

import { useEffect, useRef, useState } from 'react';
import { DAY_IN_THE_LIFE } from './content/works';

const W = 640, H = 400;
const CX = W / 2, CY = H / 2;
const R_EARTH = 74;
const R_ORBIT = 148;

/** Where the Sun is, in radians. Shadow points the opposite way. */
const SUN_ANGLE = Math.PI; // Sun to the left, shadow to the right

/** Fraction of the lap spent in shadow — matches the real ~37% at this altitude. */
const SHADOW_HALF = Math.PI * 0.37;

function isInShadow(theta: number): boolean {
  // Shadow is centred opposite the Sun.
  let d = Math.abs(((theta - (SUN_ANGLE + Math.PI)) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  return d < SHADOW_HALF;
}

/** The ground station sits on Earth's surface at this angle. */
const STATION_ANGLE = -Math.PI / 2.6;

/** Satellite is "in contact" when it is within this angle of the station. */
const CONTACT_HALF = 0.34;

function isInContact(theta: number): boolean {
  const d = Math.abs(((theta - STATION_ANGLE) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
  return d < CONTACT_HALF;
}

export function OrbitAnimation({
  onPhase,
}: {
  onPhase?: (id: string) => void;
}) {
  const [t, setT] = useState(0);          // 0..1 position round the orbit
  const [playing, setPlaying] = useState(true);
  const [battery, setBattery] = useState(0.7);
  const [stored, setStored] = useState(0);
  const [sent, setSent] = useState(0);
  const raf = useRef<number>(0);
  const last = useRef<number>(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced.current) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const step = (now: number) => {
      if (!last.current) last.current = now;
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;

      setT((prev) => {
        const next = (prev + dt / 22) % 1; // one lap every 22 seconds
        const theta = next * Math.PI * 2;
        const sunlit = !isInShadow(theta);
        const contact = isInContact(theta);

        // Battery: charges in sunlight, drains in shadow.
        setBattery((b) =>
          Math.max(0.08, Math.min(1, b + (sunlit ? 0.055 : -0.085) * dt)),
        );
        // The instrument records for part of the sunlit arc.
        const working = sunlit && next > 0.12 && next < 0.38;
        setStored((s) => {
          let v = s + (working ? 0.17 : 0) * dt;
          if (contact) v = Math.max(0, v - 0.30 * dt);
          return Math.min(1, v);
        });
        if (contact) setSent((v) => Math.min(1, v + 0.30 * dt));
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing]);

  const theta = t * Math.PI * 2;
  const sx = CX + R_ORBIT * Math.cos(theta);
  const sy = CY + R_ORBIT * Math.sin(theta);
  const sunlit = !isInShadow(theta);
  const contact = isInContact(theta);

  const stx = CX + R_EARTH * Math.cos(STATION_ANGLE);
  const sty = CY + R_EARTH * Math.sin(STATION_ANGLE);

  // Which phase of the story are we in?
  const phase =
    contact ? 'pass'
    : !sunlit ? 'shadow'
    : t > 0.12 && t < 0.38 ? 'working'
    : t < 0.12 ? 'sunlight'
    : 'waiting';

  useEffect(() => { onPhase?.(phase); }, [phase, onPhase]);

  const phaseText = DAY_IN_THE_LIFE.find((p) =>
    phase === 'pass' ? p.id === 'pass'
    : phase === 'shadow' ? p.id === 'shadow'
    : phase === 'working' ? p.id === 'working'
    : phase === 'waiting' ? p.id === 'waiting'
    : p.id === 'sunlight',
  );

  // Shadow cone geometry
  const shadowStart = SUN_ANGLE + Math.PI - SHADOW_HALF;
  const shadowEnd = SUN_ANGLE + Math.PI + SHADOW_HALF;
  const coneR = R_ORBIT + 46;
  const p1 = [CX + coneR * Math.cos(shadowStart), CY + coneR * Math.sin(shadowStart)];
  const p2 = [CX + coneR * Math.cos(shadowEnd), CY + coneR * Math.sin(shadowEnd)];

  return (
    <div className="orbit-anim">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
           aria-label="Animated diagram of a satellite orbiting Earth, charging in sunlight, draining in Earth's shadow, and sending data when it passes over the ground station">
        <defs>
          <radialGradient id="earthfill" cx="35%" cy="33%">
            <stop offset="0%" stopColor="#4a7bb8" />
            <stop offset="100%" stopColor="#1e3e6b" />
          </radialGradient>
        </defs>

        {/* Sun, off to the left */}
        <g>
          <circle cx={30} cy={CY} r="15" fill="#e8a53d" />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return (
              <line key={i}
                    x1={30 + 20 * Math.cos(a)} y1={CY + 20 * Math.sin(a)}
                    x2={30 + 26 * Math.cos(a)} y2={CY + 26 * Math.sin(a)}
                    stroke="#e8a53d" strokeWidth="2" strokeLinecap="round" />
            );
          })}
          <text x={30} y={CY + 46} textAnchor="middle" fontSize="11"
                fontFamily="IBM Plex Mono, monospace" fill="#8a5a12">Sun</text>
        </g>

        {/* sunlight rays */}
        {[-1, 0, 1].map((k) => (
          <line key={k} x1={58} y1={CY + k * 40} x2={CX - R_EARTH - 6} y2={CY + k * 40}
                stroke="#e8a53d" strokeWidth="1" strokeDasharray="5 6" opacity="0.4" />
        ))}

        {/* Earth's shadow */}
        <path d={`M ${CX} ${CY} L ${p1[0]} ${p1[1]} A ${coneR} ${coneR} 0 0 1 ${p2[0]} ${p2[1]} Z`}
              fill="rgba(28,26,23,0.13)" />
        <text x={CX + R_ORBIT + 8} y={CY - 4} fontSize="11"
              fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">
          Earth&rsquo;s
        </text>
        <text x={CX + R_ORBIT + 8} y={CY + 10} fontSize="11"
              fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">
          shadow
        </text>

        {/* orbit path */}
        <circle cx={CX} cy={CY} r={R_ORBIT} fill="none"
                stroke="rgba(28,26,23,0.20)" strokeWidth="1" strokeDasharray="3 4" />

        {/* Earth */}
        <circle cx={CX} cy={CY} r={R_EARTH} fill="url(#earthfill)" />
        <ellipse cx={CX - 18} cy={CY - 16} rx="22" ry="13" fill="#3f7a4e" opacity="0.75" />
        <ellipse cx={CX + 22} cy={CY + 18} rx="17" ry="11" fill="#3f7a4e" opacity="0.75" />
        <ellipse cx={CX + 6} cy={CY - 34} rx="13" ry="7" fill="#3f7a4e" opacity="0.6" />

        {/* ground station */}
        <g>
          <line x1={stx} y1={sty} x2={stx + 13} y2={sty + 20}
                stroke="#8a5a12" strokeWidth="2" />
          <circle cx={stx} cy={sty} r="4.5" fill="#8a5a12" />
          <text x={stx + 18} y={sty + 30} fontSize="11"
                fontFamily="IBM Plex Sans, sans-serif" fill="#8a5a12">your antenna</text>
        </g>

        {/* contact beam */}
        {contact && (
          <g>
            <line x1={stx} y1={sty} x2={sx} y2={sy}
                  stroke="#1f6f4a" strokeWidth="2" opacity="0.8" />
            {[0.3, 0.55, 0.8].map((f, i) => (
              <circle key={i}
                      cx={sx + (stx - sx) * ((f + t * 7) % 1)}
                      cy={sy + (sty - sy) * ((f + t * 7) % 1)}
                      r="3" fill="#1f6f4a" />
            ))}
          </g>
        )}

        {/* the satellite */}
        <g transform={`translate(${sx} ${sy}) rotate(${(theta * 180) / Math.PI + 90})`}>
          {/* solar wings */}
          <rect x={-19} y={-4} width={12} height={8} rx="1"
                fill={sunlit ? '#2a4d8f' : '#55617a'} />
          <rect x={7} y={-4} width={12} height={8} rx="1"
                fill={sunlit ? '#2a4d8f' : '#55617a'} />
          {/* body */}
          <rect x={-7} y={-9} width={14} height={18} rx="1.5"
                fill={sunlit ? '#f7f5f0' : '#b9bdc6'}
                stroke="rgba(28,26,23,0.6)" strokeWidth="1.2" />
          <line x1={-7} y1={-3} x2={7} y2={-3} stroke="rgba(28,26,23,0.3)" strokeWidth="0.8" />
          <line x1={-7} y1={3} x2={7} y2={3} stroke="rgba(28,26,23,0.3)" strokeWidth="0.8" />
          {/* glint when sunlit */}
          {sunlit && <circle cx={0} cy={-12} r="2" fill="#e8a53d" />}
        </g>
      </svg>

      {/* live readouts */}
      <div className="orbit-readouts">
        <Gauge label="Battery" value={battery}
               colour={battery < 0.25 ? 'var(--nogo)' : battery < 0.5 ? 'var(--warn)' : 'var(--go)'}
               caption={sunlit ? 'charging in sunlight' : 'draining — no sunlight'} />
        <Gauge label="Data stored on board" value={stored}
               colour={stored > 0.85 ? 'var(--nogo)' : 'var(--accent)'}
               caption={stored > 0.85 ? 'nearly full — new data will be lost' : contact ? 'emptying to the ground' : 'filling up'} />
        <Gauge label="Data safely home" value={sent} colour="var(--go)"
               caption={contact ? 'receiving now' : 'waiting for the next pass'} />
      </div>

      <div className="orbit-caption">
        <div className="now">
          <span className={`dot ${phase}`} />
          <strong>{phaseText?.title}</strong>
        </div>
        <p>{phaseText?.short}</p>
      </div>

      <div className="orbit-controls">
        <button onClick={() => setPlaying((p) => !p)}>
          {playing ? '⏸  Pause' : '▶  Play'}
        </button>
        <button onClick={() => { setT(0); setBattery(0.7); setStored(0); setSent(0); }}>
          Start again
        </button>
        <span className="hint">
          One lap takes 22 seconds here. In reality it takes about 95 minutes, and
          happens roughly 16 times a day.
        </span>
      </div>
    </div>
  );
}

function Gauge({
  label, value, colour, caption,
}: { label: string; value: number; colour: string; caption: string }) {
  return (
    <div className="gauge">
      <span className="g-label">{label}</span>
      <div className="g-track">
        <span className="g-fill" style={{ width: `${value * 100}%`, background: colour }} />
      </div>
      <span className="g-caption">{caption}</span>
    </div>
  );
}
