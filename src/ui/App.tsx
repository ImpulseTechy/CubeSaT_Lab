import { useMemo, useState } from 'react';
import { bySubsystem, CATALOGUE_SOURCE, byId, type Subsystem } from '../data/catalogue';
import { FORM_FACTORS, type FormFactor } from '../physics/constants';
import {
  DEFAULT_DESIGN,
  STATIONS,
  payloadDataPerOrbitMb,
  radioConfig,
  stationById,
  type Design,
} from '../physics/design';
import { BANDS, groundTrack } from '../physics/link';
import { eclipseDuration, orbitalPeriod, orbitalVelocity, orbitsPerDay, betaAngle } from '../physics/orbit';
import { ATTITUDE_ASSUMPTIONS, type AttitudeMode } from '../physics/power';
import { evaluate } from '../physics/verdict';
import { formatNumber } from '../physics/trace';
import {
  GroundTrackChart,
  Panel,
  SocChart,
  Stat,
  VerdictCardView,
} from './components';
import { MISSIONS } from './missions';

const SUBSYSTEM_ORDER: Subsystem[] = [
  'structure', 'eps', 'battery', 'solar', 'obc', 'adcs', 'comms', 'payload',
];
const SUBSYSTEM_LABEL: Record<Subsystem, string> = {
  structure: 'Structure', eps: 'Power board', battery: 'Battery', solar: 'Solar array',
  obc: 'Onboard computer', adcs: 'Attitude control', comms: 'Radio', payload: 'Payload',
};

const ORBIT_PRESETS = [
  { id: 'iss', label: 'ISS deploy', altitudeKm: 420, inclinationDeg: 51.6, raanDeg: 0 },
  { id: 'leo', label: '500 km LEO', altitudeKm: 500, inclinationDeg: 51.6, raanDeg: 0 },
  { id: 'sso', label: 'SSO noon', altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 0 },
  { id: 'dawn', label: 'Dawn-dusk SSO', altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 90 },
];

export default function App() {
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [mission, setMission] = useState<string | null>(null);

  const set = (patch: Partial<Design>) => setDesign((d) => ({ ...d, ...patch }));
  const setComponent = (s: Subsystem, id: string) =>
    setDesign((d) => ({ ...d, components: { ...d.components, [s]: id } }));

  const verdict = useMemo(() => evaluate(design), [design]);
  const station = stationById(design.stationId);
  const track = useMemo(
    () => groundTrack(design.orbit, station, 86400, 60),
    [design.orbit, station],
  );
  const radio = radioConfig(design);
  const period = orbitalPeriod(design.orbit);
  const activeMission = MISSIONS.find((m) => m.id === mission);
  const missionDone = activeMission ? activeMission.isComplete(design) : false;

  // Changing form factor invalidates parts that do not fit it.
  const changeFormFactor = (ff: FormFactor) => {
    setDesign((d) => {
      const next: Design['components'] = {};
      for (const s of SUBSYSTEM_ORDER) {
        const current = d.components[s];
        const fits = bySubsystem(s, ff);
        next[s] = current && fits.some((c) => c.id === current)
          ? current
          : fits[0]?.id;
      }
      return { ...d, formFactor: ff, components: next };
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Does My CubeSat Close?</h1>
        <span className="tag">mass · power · data</span>
        <span className="spacer" />
        <span className="tag" style={{ color: 'var(--dim)' }}>
          educational model — not flight-qualified
        </span>
      </header>

      <div className="main">
        <aside className="sidebar">
          <div className="group">
            <h2>Form factor</h2>
            <div className="seg">
              {FORM_FACTORS.map((ff) => (
                <button key={ff} aria-pressed={design.formFactor === ff}
                        onClick={() => changeFormFactor(ff)}>{ff}</button>
              ))}
            </div>
          </div>

          <div className="group">
            <h2>Components</h2>
            {SUBSYSTEM_ORDER.map((s) => {
              const options = bySubsystem(s, design.formFactor);
              if (!options.length) return null;
              const selected = design.components[s];
              const comp = selected ? byId(selected) : undefined;
              return (
                <div className="field" key={s}>
                  <label htmlFor={`sel-${s}`}>{SUBSYSTEM_LABEL[s]}</label>
                  <select id={`sel-${s}`} value={selected ?? ''}
                          onChange={(e) => setComponent(s, e.target.value)}>
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} — {o.massG} g
                      </option>
                    ))}
                  </select>
                  {comp && (
                    <div className="note" style={{ marginTop: 3 }}>{comp.typicalOf}</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="group">
            <h2>Operations</h2>
            <div className="field">
              <label htmlFor="duty">
                Payload duty cycle <span className="val">{(design.payloadDuty * 100).toFixed(0)}%</span>
              </label>
              <input id="duty" type="range" min={0} max={0.95} step={0.01}
                     value={design.payloadDuty}
                     onChange={(e) => set({ payloadDuty: Number(e.target.value) })} />
            </div>
            <div className="field">
              <label htmlFor="att">Attitude mode (an assumption, not a simulation)</label>
              <select id="att" value={design.attitude}
                      onChange={(e) => set({ attitude: e.target.value as AttitudeMode })}>
                {Object.values(ATTITUDE_ASSUMPTIONS).map((a) => (
                  <option key={a.mode} value={a.mode}>
                    {a.label} — incidence {a.incidenceFactor}
                  </option>
                ))}
              </select>
              <div className="note" style={{ marginTop: 3 }}>
                {ATTITUDE_ASSUMPTIONS[design.attitude].rationale}
              </div>
            </div>
            <div className="field">
              <label htmlFor="rate">Downlink rate</label>
              <select id="rate" value={design.dataRateBps}
                      onChange={(e) => set({ dataRateBps: Number(e.target.value) })}>
                {BANDS[radio.band].typicalRatesBps.map((r) => (
                  <option key={r} value={r}>
                    {r >= 1e6 ? `${r / 1e6} Mbps` : `${r / 1000} kbps`}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cont">
                Mass contingency <span className="val">{(design.contingency * 100).toFixed(0)}%</span>
              </label>
              <input id="cont" type="range" min={0} max={0.3} step={0.05}
                     value={design.contingency}
                     onChange={(e) => set({ contingency: Number(e.target.value) })} />
            </div>
          </div>

          <div className="group">
            <h2>Orbit</h2>
            <div className="seg" style={{ marginBottom: 8 }}>
              {ORBIT_PRESETS.map((p) => (
                <button key={p.id}
                        aria-pressed={
                          design.orbit.altitudeKm === p.altitudeKm &&
                          design.orbit.inclinationDeg === p.inclinationDeg &&
                          (design.orbit.raanDeg ?? 0) === p.raanDeg
                        }
                        onClick={() => set({
                          orbit: {
                            altitudeKm: p.altitudeKm, inclinationDeg: p.inclinationDeg,
                            raanDeg: p.raanDeg, solarLongitudeDeg: 0,
                          },
                        })}>{p.label}</button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="alt">
                Altitude <span className="val">{design.orbit.altitudeKm} km</span>
              </label>
              <input id="alt" type="range" min={300} max={1400} step={25}
                     value={design.orbit.altitudeKm}
                     onChange={(e) => set({
                       orbit: { ...design.orbit, altitudeKm: Number(e.target.value) },
                     })} />
            </div>
            <div className="field">
              <label htmlFor="inc">
                Inclination <span className="val">{design.orbit.inclinationDeg.toFixed(1)}°</span>
              </label>
              <input id="inc" type="range" min={0} max={110} step={0.5}
                     value={design.orbit.inclinationDeg}
                     onChange={(e) => set({
                       orbit: { ...design.orbit, inclinationDeg: Number(e.target.value) },
                     })} />
            </div>
            <div className="field">
              <label htmlFor="stn">Ground station</label>
              <select id="stn" value={design.stationId}
                      onChange={(e) => set({ stationId: e.target.value })}>
                {STATIONS.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="note">
            <strong>Parts catalogue:</strong> {CATALOGUE_SOURCE}
          </div>
        </aside>

        <main className="content">
          <div className="verdicts">
            {verdict.cards.map((c) => <VerdictCardView key={c.id} card={c} />)}
          </div>

          <div className="grid2">
            <Panel title="Battery over 6 orbits">
              <SocChart samples={verdict.soc.samples} orbitSeconds={period.value} />
              <div className="stats" style={{ marginTop: 12 }}>
                <Stat t={verdict.energy.generationWh} />
                <Stat t={verdict.energy.loadWh} />
                <Stat t={verdict.energy.marginWh} />
              </div>
            </Panel>

            <Panel title="Ground track and passes">
              <GroundTrackChart points={track} station={station} />
              <div className="stats" style={{ marginTop: 12 }}>
                <Stat t={verdict.passes.passesPerDay} />
                <Stat t={verdict.passes.contactMinutesPerDay} />
                <Stat t={verdict.link.marginDb} />
              </div>
            </Panel>
          </div>

          <div className="grid2">
            <Panel title="Mass budget">
              <table>
                <thead>
                  <tr><th>Component</th><th style={{ textAlign: 'right' }}>Mass</th></tr>
                </thead>
                <tbody>
                  {verdict.mass.items.map((i) => (
                    <tr key={i.name}>
                      <td>
                        {i.name}
                        <div className="bar">
                          <span style={{
                            width: `${(i.massG / verdict.mass.limitKg / 1000) * 100}%`,
                          }} />
                        </div>
                      </td>
                      <td className="num">{i.massG} g</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ color: 'var(--muted)' }}>
                      Contingency ({(design.contingency * 100).toFixed(0)}%)
                    </td>
                    <td className="num" style={{ color: 'var(--muted)' }}>
                      {Math.round(verdict.mass.contingencyG)} g
                    </td>
                  </tr>
                  <tr className="total">
                    <td>Total / limit ({design.formFactor})</td>
                    <td className="num">
                      {Math.round(verdict.mass.totalMassG.value)} / {verdict.mass.limitKg * 1000} g
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="stats" style={{ marginTop: 12 }}>
                <Stat t={verdict.mass.totalMassG} />
                <Stat t={verdict.mass.marginG} />
              </div>
              {verdict.mass.legacyLimitKg && (
                <div className="note">
                  CDS Rev. 14 raised the 1U allowance to 2.00 kg. Older material still
                  quotes {verdict.mass.legacyLimitKg} kg — you will meet that figure in
                  the wild.
                </div>
              )}
            </Panel>

            <Panel title="Orbit and data">
              <div className="stats">
                <Stat t={period} label="Period" />
                <Stat t={orbitalVelocity(design.orbit)} />
                <Stat t={eclipseDuration(design.orbit)} />
                <Stat t={betaAngle(design.orbit)} />
                <Stat t={payloadDataPerOrbitMb(design)} />
                <Stat t={verdict.data.generatedMbPerDay} />
                <Stat t={verdict.data.downlinkedMbPerDay} />
                <Stat t={verdict.link.pathLossDb} />
              </div>
              <div className="note">
                {formatNumber(orbitsPerDay(design.orbit))} orbits per day ·{' '}
                {BANDS[radio.band].label} at{' '}
                {radio.dataRateBps >= 1e6
                  ? `${radio.dataRateBps / 1e6} Mbps`
                  : `${radio.dataRateBps / 1000} kbps`}
              </div>
            </Panel>
          </div>

          <Panel title="Guided missions">
            {MISSIONS.map((m) => {
              const active = mission === m.id;
              const done = active && missionDone;
              return (
                <div className={`mission${done ? ' done' : ''}`} key={m.id}>
                  <h4>{m.title}{done ? ' ✓' : ''}</h4>
                  <p>{m.brief}</p>
                  {active ? (
                    <>
                      <p style={{ color: 'var(--accent)' }}>{m.predict}</p>
                      <div className="goal">Goal: {m.goal}</div>
                      <div className="note">Targets the belief: {m.misconception}</div>
                      {done && (
                        <div className="note" style={{ color: 'var(--go)' }}>
                          Done — you met the goal. Try breaking it again a different way.
                        </div>
                      )}
                    </>
                  ) : (
                    <button onClick={() => { setMission(m.id); setDesign(m.setup); }}>
                      Start mission
                    </button>
                  )}
                </div>
              );
            })}
          </Panel>

          <Panel title="What this model does not do">
            <div className="note">
              <p style={{ margin: '0 0 6px' }}>
                No thermal model, no attitude dynamics, no orbital decay, and no rain,
                ionospheric or polarisation losses on the radio link. Attitude is a
                documented assumption rather than a simulation. Drag, solar radiation
                pressure and third-body gravity are not modelled.
              </p>
              <p style={{ margin: 0 }}>
                Those are deliberate v1 omissions, not oversights — every number here
                expands to show its formula and source so you can judge it yourself.
                This is a teaching model. Do not fly hardware on it.
              </p>
            </div>
          </Panel>
        </main>
      </div>
    </div>
  );
}
