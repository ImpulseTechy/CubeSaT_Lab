/**
 * Watching a CanSat flight happen.
 *
 * The screen is deliberately split in two, because that split is the lesson:
 *
 *   left  — what really happened
 *   right — what arrived on your laptop
 *
 * On a real flight you only ever get the right-hand side. Being able to see
 * both at once, and watch them diverge when a packet is lost or a sensor
 * misreads, is the thing this simulator can do that a field day cannot.
 */

import { useEffect, useRef, useState } from 'react';
import type { MissionResult, Packet, Truth } from '../cansat/mission';

const W = 560, H = 300;
const PAD_L = 46, PAD_B = 28, PAD_T = 14, PAD_R = 12;

export function FlightPlayer({
  result,
  playing,
  speed,
  onFinish,
}: {
  result: MissionResult;
  playing: boolean;
  speed: number;
  onFinish: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  // The loop owns the clock; state exists only to trigger a re-render. Keeping
  // them separate means the finish callback fires from the animation frame
  // rather than from inside a state updater, which React may run mid-render.
  const clock = useRef(0);

  // Reset whenever a new flight is run.
  useEffect(() => { clock.current = 0; setElapsed(0); }, [result]);

  useEffect(() => {
    if (!playing) return;
    // Timing stays local to this effect: React mounts twice in development,
    // and two loops sharing a clock each reset it before the other reads it.
    let id = 0;
    let prev = 0;
    let cancelled = false;

    const step = (now: number) => {
      if (cancelled) return;
      id = requestAnimationFrame(step);
      if (!prev) prev = now;
      const dt = (now - prev) / 1000;
      prev = now;
      clock.current += dt * speed;

      if (clock.current >= result.durationS) {
        clock.current = result.durationS;
        setElapsed(result.durationS);
        cancelled = true;
        cancelAnimationFrame(id);
        onFinish();
        return;
      }
      setElapsed(clock.current);
    };
    id = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(id); };
  }, [playing, speed, result, onFinish]);

  const truthSoFar = result.truth.filter((t) => t.t <= elapsed);
  const sentSoFar = result.sent.filter((p) => p.t <= elapsed);
  const now = truthSoFar[truthSoFar.length - 1] ?? result.truth[0];

  const maxAlt = Math.max(...result.truth.map((t) => t.altitudeM), 1);
  const x = (t: number) => PAD_L + (t / result.durationS) * (W - PAD_L - PAD_R);
  const y = (a: number) => PAD_T + (1 - a / maxAlt) * (H - PAD_T - PAD_B);

  const truthPath = truthSoFar
    .map((t, i) => `${i === 0 ? 'M' : 'L'}${x(t.t).toFixed(1)},${y(Math.max(0, t.altitudeM)).toFixed(1)}`)
    .join('');

  const lost = sentSoFar.filter((p) => !p.received);

  return (
    <div className="flight-player">
      <div className="fp-chart">
        <div className="fp-head">
          <span className="fp-title">What really happened</span>
          <span className="fp-clock">T+{elapsed.toFixed(1)} s</span>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} role="img"
             aria-label="Altitude against time, with lost packets marked">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={PAD_L} x2={W - PAD_R} y1={y(maxAlt * f)} y2={y(maxAlt * f)}
                    stroke="rgba(28,26,23,0.12)" strokeWidth="1" />
              <text x={PAD_L - 6} y={y(maxAlt * f) + 3.5} textAnchor="end" fontSize="10"
                    fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">
                {Math.round(maxAlt * f)}
              </text>
            </g>
          ))}
          <text x={14} y={PAD_T + 4} fontSize="9.5" fontFamily="IBM Plex Mono, monospace"
                fill="rgba(28,26,23,0.42)">m</text>

          {/* the flight path */}
          <path d={truthPath} fill="none" stroke="#2a4d8f" strokeWidth="2" />

          {/* packets that never arrived */}
          {lost.map((p, i) => (
            <circle key={i} cx={x(p.t)} cy={y(Math.max(0, p.computedAltitudeM))} r="2.6"
                    fill="#9e2b36" />
          ))}

          {/* the CanSat itself */}
          {now && (
            <g transform={`translate(${x(now.t)} ${y(Math.max(0, now.altitudeM))})`}>
              {now.chuteOpen && (
                <path d="M -11 -13 Q 0 -25 11 -13 L 4 -3 L -4 -3 Z"
                      fill="#8a5a12" opacity="0.85" />
              )}
              <rect x={-3.5} y={-4} width={7} height={11} rx="1.5"
                    fill="#f7f5f0" stroke="rgba(28,26,23,0.65)" strokeWidth="1.2" />
            </g>
          )}

          {/* ground */}
          <line x1={PAD_L} x2={W - PAD_R} y1={y(0)} y2={y(0)}
                stroke="rgba(28,26,23,0.45)" strokeWidth="1.5" />
          <text x={W - PAD_R} y={H - 8} textAnchor="end" fontSize="10"
                fontFamily="IBM Plex Mono, monospace" fill="rgba(28,26,23,0.42)">
            {result.durationS.toFixed(0)} s
          </text>
        </svg>

        <div className="fp-live">
          <Live label="Height" value={`${Math.max(0, now?.altitudeM ?? 0).toFixed(0)} m`} />
          <Live label="Falling at" value={`${Math.abs(now?.verticalSpeedMS ?? 0).toFixed(1)} m/s`} />
          <Live label="Distance away" value={`${((now?.slantDistanceM ?? 0) / 1000).toFixed(2)} km`} />
          <Live label="Battery" value={`${((now?.batterySoC ?? 1) * 100).toFixed(0)}%`}
                warn={(now?.batterySoC ?? 1) < 0.2} />
        </div>
      </div>

      <GroundStation packets={sentSoFar} elapsed={elapsed} />
    </div>
  );
}

function Live({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`fp-live-item${warn ? ' warn' : ''}`}>
      <span className="l">{label}</span>
      <span className="v">{value}</span>
    </div>
  );
}

/**
 * The laptop view: a scrolling monitor of packets as they arrive.
 *
 * Styled like a serial monitor on purpose. This is what a student will be
 * staring at in a field, and recognising it here makes the real thing less
 * intimidating.
 */
function GroundStation({ packets, elapsed }: { packets: Packet[]; elapsed: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const received = packets.filter((p) => p.received);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [packets.length]);

  const last = received[received.length - 1];
  const silentFor = last ? elapsed - last.t : elapsed;

  return (
    <div className="fp-ground">
      <div className="fp-head">
        <span className="fp-title">What arrived on your laptop</span>
        <span className={`fp-link ${silentFor > 4 ? 'dead' : 'alive'}`}>
          {silentFor > 4 ? `no signal for ${silentFor.toFixed(0)} s` : 'receiving'}
        </span>
      </div>

      <div className="fp-monitor" ref={ref}>
        {packets.length === 0 && (
          <div className="fp-waiting">waiting for the first packet&hellip;</div>
        )}
        {packets.slice(-120).map((p, i) => (
          <div key={i} className={`fp-row${p.received ? '' : ' lost'}`}>
            {p.received ? (
              <>
                <span className="c-t">{p.t.toFixed(1)}</span>
                <span className="c-a">{p.computedAltitudeM.toFixed(0)}m</span>
                <span className="c-p">{(p.pressure.pressurePa / 100).toFixed(1)}hPa</span>
                <span className="c-c">{p.pressure.temperatureC.toFixed(1)}&deg;C</span>
                <span className="c-g">
                  {p.gps.hasFix ? `${p.gps.satellites}sat` : 'no fix'}
                </span>
                <span className="c-m">{p.linkMarginDb.toFixed(0)}dB</span>
              </>
            ) : (
              <span className="c-lost">
                {p.t.toFixed(1)} &mdash; packet lost ({p.linkMarginDb.toFixed(0)} dB, too weak)
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="fp-counts">
        <span><strong>{received.length}</strong> received</span>
        <span className={packets.length - received.length > 0 ? 'bad' : ''}>
          <strong>{packets.length - received.length}</strong> lost
        </span>
      </div>
    </div>
  );
}

/** Everything that went wrong, read out after landing. */
export function FlightReport({ result }: { result: MissionResult }) {
  const ok = result.problems.length === 0;
  const dataLost = result.sent.length - result.received.length;

  return (
    <div className={`fr${ok ? ' ok' : ''}`}>
      <h3>{ok ? 'That flight worked.' : 'That flight had problems.'}</h3>

      <div className="fr-stats">
        <Stat k="Highest point" v={`${result.apogeeM.toFixed(0)} m`} />
        <Stat k="Time in the air" v={`${result.durationS.toFixed(0)} s`} />
        <Stat k="Landing speed" v={`${result.landingSpeedMS.toFixed(1)} m/s`} />
        <Stat k="Walk to recover" v={`${(result.landingDistanceM / 1000).toFixed(2)} km`} />
        <Stat k="Packets home" v={`${result.received.length} of ${result.sent.length}`} />
        <Stat k="Saved on the card" v={`${result.recoveredOnCard.length}`} />
      </div>

      {result.problems.map((p, i) => (
        <div className="fr-problem" key={i}>{p}</div>
      ))}

      {ok && (
        <p className="fr-good">
          Everything came home: {result.received.length} packets by radio and{' '}
          {result.recoveredOnCard.length} on the card.
          {dataLost === 0 && ' Not a single packet was lost.'} Now try breaking
          it &mdash; switch a mistake on below and fly it again.
        </p>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="fr-stat">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  );
}

export type { Truth };
