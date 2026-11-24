/**
 * The CanSat section: build it, fly it, see what you got back.
 *
 * The faults are switches you turn on deliberately. That is the opposite of
 * how a real project goes wrong, and that is the point — a student can choose
 * to make a mistake, watch exactly what it costs, and recognise it later when
 * it happens to them by accident.
 */

import { useMemo, useState } from 'react';
import { defaultMission, flyMission, type MissionConfig } from '../cansat/mission';
import { BATTERIES, COMPONENTS, electronicsMassG, powerBudget } from '../cansat/power';
import { bitrateBps, rangeInEnvironment, type SpreadingFactor } from '../cansat/radio';
import { requiredChuteDiameter } from '../cansat/descent';
import type { Faults } from '../cansat/sensors';
import { FlightPlayer, FlightReport } from './FlightPlayer';

const FAULT_LABELS: { key: keyof Faults; label: string; hint: string }[] = [
  {
    key: 'pressureSensorNotFound',
    label: 'Wire the sensor wrong',
    hint: 'The classic first-day mistake: wrong address, so it never answers.',
  },
  {
    key: 'neverFlushSdCard',
    label: 'Forget to save the file properly',
    hint: 'Write to the card but never flush it. Looks fine until you open it.',
  },
  {
    key: 'batteryHalfCharged',
    label: 'Fly on a half-charged battery',
    hint: 'Nobody means to. Everybody does it once.',
  },
  {
    key: 'gpsDefaultDynamicModel',
    label: 'Leave the GPS in its default mode',
    hint: 'It quietly stops working above 18 km. Only matters on a balloon.',
  },
  {
    key: 'skipWarmUp',
    label: 'Read the sensor immediately',
    hint: 'No warm-up, so the first seconds are nonsense.',
  },
];

const LAUNCHES = [
  { id: 'drop', label: 'Drop from a drone', alt: 120, method: 'drop' as const },
  { id: 'high', label: 'Drop from 1 km', alt: 1000, method: 'drop' as const },
  { id: 'balloon', label: 'Weather balloon', alt: 20000, method: 'balloon' as const },
];

export function CanSatView() {
  const [cfg, setCfg] = useState<MissionConfig>(defaultMission());
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [runId, setRunId] = useState(0);

  const result = useMemo(() => flyMission(cfg), [cfg, runId]);

  const mass = electronicsMassG(cfg.usage, cfg.battery) + 180; // can, chute, wiring
  const budget = powerBudget(cfg.usage, cfg.battery, result.durationS);
  const suggested = requiredChuteDiameter(mass, 7);

  const set = (patch: Partial<MissionConfig>) => {
    setCfg((c) => ({ ...c, ...patch }));
    setPlaying(false); setDone(false);
  };
  const setFault = (k: keyof Faults, v: boolean) =>
    set({ faults: { ...cfg.faults, [k]: v } });

  const launch = () => { setRunId((n) => n + 1); setDone(false); setPlaying(true); };

  return (
    <div className="cansat">
      <div className="cs-intro">
        <h2>Fly a CanSat</h2>
        <p className="big">
          A CanSat is a satellite the size of a drinks can, dropped from a drone,
          a balloon or a small rocket. It is how almost every satellite team
          starts, because you get it back afterwards and can see what went wrong.
        </p>
        <p>
          Build one here first. Every mistake below is one that real teams make,
          and making it costs you nothing but a few seconds.
        </p>
      </div>

      <div className="cs-main">
        <aside className="cs-build">
          <div className="group">
            <h2>Where from</h2>
            {LAUNCHES.map((l) => (
              <button key={l.id} className={`cs-opt${cfg.profile.releaseAltitudeM === l.alt ? ' on' : ''}`}
                      onClick={() => set({
                        profile: { method: l.method, releaseAltitudeM: l.alt, ascentRateMS: 5 },
                        battery: l.alt > 5000 ? BATTERIES.lipo2000 : cfg.battery,
                      })}>
                <span className="o-l">{l.label}</span>
                <span className="o-h">{l.alt >= 1000 ? `${l.alt / 1000} km` : `${l.alt} m`}</span>
              </button>
            ))}
          </div>

          <div className="group">
            <h2>Parachute</h2>
            <div className="field">
              <label htmlFor="chute">
                Width <span className="val">{(cfg.vehicle.parachute?.diameterM ?? 0).toFixed(2)} m</span>
              </label>
              <input id="chute" type="range" min={0} max={1.6} step={0.05}
                     value={cfg.vehicle.parachute?.diameterM ?? 0}
                     onChange={(e) => {
                       const d = Number(e.target.value);
                       set({
                         vehicle: {
                           ...cfg.vehicle,
                           parachute: d === 0 ? null
                             : { diameterM: d, dragCoefficient: 1.1, deployAltitudeM: 10000 },
                         },
                       });
                     }} />
              <div className="help">
                For {mass.toFixed(0)} g, about <strong>{suggested.toFixed(2)} m</strong> gives
                a safe 7 m/s landing. Slide it to zero to find out what happens with none.
              </div>
            </div>
          </div>

          <div className="group">
            <h2>Radio</h2>
            <div className="field">
              <label htmlFor="sf">
                Setting <span className="val">SF{cfg.radio.spreadingFactor}</span>
              </label>
              <input id="sf" type="range" min={7} max={12} step={1}
                     value={cfg.radio.spreadingFactor}
                     onChange={(e) => set({
                       radio: { ...cfg.radio, spreadingFactor: Number(e.target.value) as SpreadingFactor },
                     })} />
              <div className="help">
                {bitrateBps(cfg.radio).toFixed(0)} bits per second, reaching about{' '}
                {(rangeInEnvironment(cfg.radio, 'flying') / 1000).toFixed(0)} km in the air
                (only {(rangeInEnvironment(cfg.radio, 'openField') / 1000).toFixed(1)} km
                across a field). Higher numbers go further but much slower.
              </div>
            </div>
            <div className="field">
              <label htmlFor="rate">
                Send a packet every <span className="val">{cfg.telemetryIntervalS} s</span>
              </label>
              <input id="rate" type="range" min={0.5} max={10} step={0.5}
                     value={cfg.telemetryIntervalS}
                     onChange={(e) => set({ telemetryIntervalS: Number(e.target.value) })} />
            </div>
          </div>

          <div className="group">
            <h2>Battery</h2>
            <div className="field">
              <select value={cfg.battery.name}
                      onChange={(e) => set({
                        battery: Object.values(BATTERIES).find((b) => b.name === e.target.value)!,
                      })}>
                {Object.values(BATTERIES).map((b) => (
                  <option key={b.name} value={b.name}>{b.name} — {b.massG} g</option>
                ))}
              </select>
              <div className="help">
                Drawing {budget.averageMA.toFixed(0)} mA, so it lasts about{' '}
                <strong>{budget.enduranceMin.toFixed(0)} minutes</strong>. The flight
                takes {(result.durationS / 60).toFixed(1)}. Biggest drain:{' '}
                {budget.breakdown[0]?.name}.
              </div>
            </div>
          </div>

          <div className="group">
            <h2>Make a mistake on purpose</h2>
            <p className="lede">
              Each of these is something real teams have done. Switch one on and
              fly again.
            </p>
            {FAULT_LABELS.map((f) => (
              <label className="cs-fault" key={f.key}>
                <input type="checkbox" checked={cfg.faults[f.key]}
                       onChange={(e) => setFault(f.key, e.target.checked)} />
                <span>
                  <strong>{f.label}</strong>
                  <em>{f.hint}</em>
                </span>
              </label>
            ))}
          </div>

          <div className="group">
            <h2>What it weighs</h2>
            <div className="cs-mass">
              {cfg.usage.map((u) => (
                <div key={u.componentId}>
                  <span>{COMPONENTS[u.componentId].name}</span>
                  <span className="g">{COMPONENTS[u.componentId].massG} g</span>
                </div>
              ))}
              <div><span>{cfg.battery.name}</span><span className="g">{cfg.battery.massG} g</span></div>
              <div><span>Can, chute and wiring</span><span className="g">180 g</span></div>
              <div className="tot"><span>Total</span><span className="g">{mass.toFixed(0)} g</span></div>
            </div>
          </div>
        </aside>

        <main className="cs-flight">
          <div className="cs-controls">
            <button className="cs-launch" onClick={launch}>
              {done ? 'Fly it again' : 'Launch'}
            </button>
            {playing && (
              <button onClick={() => setPlaying(false)}>Pause</button>
            )}
            {!playing && !done && runId > 0 && (
              <button onClick={() => setPlaying(true)}>Resume</button>
            )}
            <span className="cs-hint">
              Sped up {Math.round(20)}&times;. A real drop takes a few minutes.
            </span>
          </div>

          <FlightPlayer
            key={runId}
            result={result}
            playing={playing}
            speed={20}
            onFinish={() => { setPlaying(false); setDone(true); }}
          />

          {done && <FlightReport result={result} />}
        </main>
      </div>
    </div>
  );
}
