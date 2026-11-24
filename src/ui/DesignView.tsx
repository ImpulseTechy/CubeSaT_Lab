import { useMemo } from 'react';
import { bySubsystem, CATALOGUE_SOURCE, byId, type Subsystem } from '../data/catalogue';
import { FORM_FACTORS, type FormFactor } from '../physics/constants';
import {
  STATIONS,
  payloadDataPerOrbitMb,
  radioConfig,
  stationById,
  type Design,
} from '../physics/design';
import { BANDS, groundTrack } from '../physics/link';
import {
  betaAngle, eclipseDuration, orbitalPeriod, orbitalVelocity, orbitsPerDay,
} from '../physics/orbit';
import { ATTITUDE_ASSUMPTIONS, type AttitudeMode } from '../physics/power';
import { evaluate } from '../physics/verdict';
import { formatNumber } from '../physics/trace';
import {
  GroundTrackChart, Section, SocChart, Stat, Term, VerdictCardView,
} from './components';
import { MISSIONS } from './missions';

const SUBSYSTEM_ORDER: Subsystem[] = [
  'structure', 'eps', 'battery', 'solar', 'obc', 'adcs', 'comms', 'payload',
];

/** Plain names, with the engineering word in the help text underneath. */
const PART_LABEL: Record<Subsystem, { name: string; help: string }> = {
  structure: { name: 'Frame', help: 'The metal skeleton everything bolts onto.' },
  eps: { name: 'Power board', help: 'Takes electricity from the panels and shares it out.' },
  battery: { name: 'Battery', help: 'Stores energy for the time spent in Earth’s shadow.' },
  solar: { name: 'Solar panels', help: 'Turn sunlight into electricity. Bigger panels make more power but weigh more.' },
  obc: { name: 'Computer', help: 'Runs the satellite and decides what happens when.' },
  adcs: { name: 'Pointing system', help: 'Controls which way the satellite faces.' },
  comms: { name: 'Radio', help: 'Sends your data to the ground. Faster radios weigh more.' },
  payload: { name: 'Instrument', help: 'The thing your mission is actually for — a camera, a sensor, a beacon.' },
};

const ORBIT_PRESETS = [
  { id: 'iss', label: 'From the Space Station', altitudeKm: 420, inclinationDeg: 51.6, raanDeg: 0,
    help: 'Where most student satellites start — pushed out of the ISS.' },
  { id: 'leo', label: 'Typical low orbit', altitudeKm: 500, inclinationDeg: 51.6, raanDeg: 0,
    help: 'A common general-purpose orbit.' },
  { id: 'sso', label: 'Always-same-lighting', altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 0,
    help: 'Passes over at the same local time every day. Good for cameras.' },
  { id: 'dawn', label: '永 Permanent sunlight', altitudeKm: 525, inclinationDeg: 97.5, raanDeg: 90,
    help: 'Rides the line between day and night. Almost never enters shadow.' },
];

const OVERALL_LEAD: Record<string, string> = {
  go: 'This satellite would work.',
  warn: 'This satellite would probably work.',
  nogo: 'This satellite would fail.',
};

export function DesignView({
  design,
  setDesign,
  mission,
  setMission,
}: {
  design: Design;
  setDesign: React.Dispatch<React.SetStateAction<Design>>;
  mission: string | null;
  setMission: (id: string | null) => void;
}) {
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
  const failing = verdict.cards.filter((c) => c.status === 'nogo');

  const changeFormFactor = (ff: FormFactor) => {
    setDesign((d) => {
      const next: Design['components'] = {};
      for (const s of SUBSYSTEM_ORDER) {
        const current = d.components[s];
        const fits = bySubsystem(s, ff);
        next[s] = current && fits.some((c) => c.id === current) ? current : fits[0]?.id;
      }
      return { ...d, formFactor: ff, components: next };
    });
  };

  return (
    <div className="main">
      <aside className="sidebar">
        <div className="group">
          <h2>1 · How big</h2>
          <p className="lede">
            CubeSats are built from 10&nbsp;cm cubes called units. A 3U is three
            stacked into a loaf. Bigger means more room and more weight allowed,
            but costs more to launch.
          </p>
          <div className="seg">
            {FORM_FACTORS.map((ff) => (
              <button key={ff} aria-pressed={design.formFactor === ff}
                      onClick={() => changeFormFactor(ff)}>{ff}</button>
            ))}
          </div>
        </div>

        <div className="group">
          <h2>2 · What goes inside</h2>
          <p className="lede">
            Every part adds weight and uses electricity. Watch the three cards on
            the right change as you swap things.
          </p>
          {SUBSYSTEM_ORDER.map((s) => {
            const options = bySubsystem(s, design.formFactor);
            if (!options.length) return null;
            const selected = design.components[s];
            const comp = selected ? byId(selected) : undefined;
            return (
              <div className="field" key={s}>
                <label htmlFor={`sel-${s}`}>{PART_LABEL[s].name}</label>
                <select id={`sel-${s}`} value={selected ?? ''}
                        onChange={(e) => setComponent(s, e.target.value)}>
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} — {o.massG} g
                      {o.powerW > 0 ? `, ${o.powerW} W` : ''}
                    </option>
                  ))}
                </select>
                <div className="help">
                  {PART_LABEL[s].help}
                  {comp ? ` Based on: ${comp.typicalOf}` : ''}
                </div>
              </div>
            );
          })}
        </div>

        <div className="group">
          <h2>3 · How you fly it</h2>
          <div className="field">
            <label htmlFor="duty">
              Run the instrument <span className="val">{(design.payloadDuty * 100).toFixed(0)}% of each lap</span>
            </label>
            <input id="duty" type="range" min={0} max={0.95} step={0.01}
                   value={design.payloadDuty}
                   onChange={(e) => set({ payloadDuty: Number(e.target.value) })} />
            <div className="help">
              More time switched on means more science — and more electricity used
              and more data to send home. This one slider is usually the difference
              between a mission that works and one that does not.
            </div>
          </div>

          <div className="field">
            <label htmlFor="att">Which way it points</label>
            <select id="att" value={design.attitude}
                    onChange={(e) => set({ attitude: e.target.value as AttitudeMode })}>
              {Object.values(ATTITUDE_ASSUMPTIONS).map((a) => (
                <option key={a.mode} value={a.mode}>{a.label}</option>
              ))}
            </select>
            <div className="help">{ATTITUDE_ASSUMPTIONS[design.attitude].rationale}</div>
          </div>

          <div className="field">
            <label htmlFor="rate">How fast the radio sends</label>
            <select id="rate" value={design.dataRateBps}
                    onChange={(e) => set({ dataRateBps: Number(e.target.value) })}>
              {BANDS[radio.band].typicalRatesBps.map((r) => (
                <option key={r} value={r}>
                  {r >= 1e6 ? `${r / 1e6} Mbps` : `${r / 1000} kbps`}
                </option>
              ))}
            </select>
            <div className="help">
              Sending faster gets more data home per minute — but makes the signal
              weaker and harder to hear. Ten times faster costs you ten times the
              signal strength.
            </div>
          </div>

          <div className="field">
            <label htmlFor="cont">
              Spare weight set aside <span className="val">{(design.contingency * 100).toFixed(0)}%</span>
            </label>
            <input id="cont" type="range" min={0} max={0.3} step={0.05}
                   value={design.contingency}
                   onChange={(e) => set({ contingency: Number(e.target.value) })} />
            <div className="help">
              Real builds always come out heavier than the plan — wiring, screws,
              brackets. Engineers add <Term k="contingency">spare weight</Term> on
              purpose to cover it.
            </div>
          </div>
        </div>

        <div className="group">
          <h2>4 · Where it flies</h2>
          <div className="seg wrap" style={{ marginBottom: 10 }}>
            {ORBIT_PRESETS.map((p) => (
              <button key={p.id} title={p.help}
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
                      })}>{p.label.replace('永 ', '')}</button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="alt">
              Height above Earth <span className="val">{design.orbit.altitudeKm} km</span>
            </label>
            <input id="alt" type="range" min={300} max={1400} step={25}
                   value={design.orbit.altitudeKm}
                   onChange={(e) => set({
                     orbit: { ...design.orbit, altitudeKm: Number(e.target.value) },
                   })} />
            <div className="help">
              Higher up means longer laps and more time in view of your antenna —
              but a weaker signal, because it is further away.
            </div>
          </div>
          <div className="field">
            <label htmlFor="inc">
              How tilted the orbit is <span className="val">{design.orbit.inclinationDeg.toFixed(0)}°</span>
            </label>
            <input id="inc" type="range" min={0} max={110} step={0.5}
                   value={design.orbit.inclinationDeg}
                   onChange={(e) => set({
                     orbit: { ...design.orbit, inclinationDeg: Number(e.target.value) },
                   })} />
            <div className="help">
              0° circles the equator; 90° goes over the poles. A satellite can never
              fly further north than its tilt, so this decides which antennas on
              Earth can ever see it.
            </div>
          </div>
          <div className="field">
            <label htmlFor="stn">Your antenna on the ground</label>
            <select id="stn" value={design.stationId}
                    onChange={(e) => set({ stationId: e.target.value })}>
              {STATIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <div className="help">
              Where you listen from. A bigger dish hears a fainter satellite, and
              is usually far cheaper than improving the satellite itself.
            </div>
          </div>
        </div>

        <div className="note">
          <strong>Where the parts come from:</strong> {CATALOGUE_SOURCE}
        </div>
      </aside>

      <main className="content">
        <div className="verdict-intro">
          <span className="lead">{OVERALL_LEAD[verdict.overall]}</span>
          {failing.length > 0 ? (
            <>
              A satellite has to pass three tests at once: it must be light enough
              to launch, make enough electricity to stay alive, and get its data
              home. Yours {failing.length === 1 ? 'fails one of them' : `fails ${failing.length} of them`}.
            </>
          ) : (
            <>
              It is light enough to launch, makes more electricity than it uses, and
              can send all its data home. Now try breaking it — push the instrument
              slider up and watch what gives way first.
            </>
          )}
        </div>

        <div className="verdicts">
          {verdict.cards.map((c) => <VerdictCardView key={c.id} card={c} />)}
        </div>

        <div className="grid2">
          <Section
            title="The battery, lap by lap"
            lede="Your satellite goes round Earth about every 95 minutes. Each lap it charges in sunlight and drains in shadow.">
            <div className="panel">
              <SocChart samples={verdict.soc.samples} orbitSeconds={period.value} />
              <div className="stats" style={{ marginTop: 14 }}>
                <Stat t={verdict.energy.generationWh} label="Energy made each lap" />
                <Stat t={verdict.energy.loadWh} label="Energy used each lap" />
                <Stat t={verdict.energy.marginWh} label="Left over" />
              </div>
            </div>
          </Section>

          <Section
            title="When you can talk to it"
            lede="You can only send data while the satellite is above the horizon from your antenna. That is a few minutes, a few times a day.">
            <div className="panel">
              <GroundTrackChart points={track} station={station} />
              <div className="stats" style={{ marginTop: 14 }}>
                <Stat t={verdict.passes.passesPerDay} label="Chances to talk per day" term="pass" />
                <Stat t={verdict.passes.contactMinutesPerDay} label="Minutes of contact a day" />
                <Stat t={verdict.link.marginDb} label="Spare signal strength" term="linkMargin" />
              </div>
            </div>
          </Section>
        </div>

        <div className="grid2">
          <Section
            title="What it weighs"
            lede="Launch providers enforce a hard weight limit. Go over it and your satellite does not fly.">
            <div className="panel">
              <table>
                <thead>
                  <tr><th>Part</th><th style={{ textAlign: 'right' }}>Weight</th></tr>
                </thead>
                <tbody>
                  {verdict.mass.items.map((i) => (
                    <tr key={i.name}>
                      <td>
                        {i.name}
                        <div className="bar">
                          <span style={{ width: `${(i.massG / (verdict.mass.limitKg * 1000)) * 100}%` }} />
                        </div>
                      </td>
                      <td className="num">{i.massG} g</td>
                    </tr>
                  ))}
                  <tr className="sub">
                    <td>Spare weight set aside ({(design.contingency * 100).toFixed(0)}%)</td>
                    <td className="num">{Math.round(verdict.mass.contingencyG)} g</td>
                  </tr>
                  <tr className="total">
                    <td>Total, against a {design.formFactor} limit</td>
                    <td className="num">
                      {Math.round(verdict.mass.totalMassG.value).toLocaleString()} /{' '}
                      {(verdict.mass.limitKg * 1000).toLocaleString()} g
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="stats" style={{ marginTop: 14 }}>
                <Stat t={verdict.mass.totalMassG} label="What it weighs" />
                <Stat t={verdict.mass.marginG} label="Weight to spare" term="massMargin" />
              </div>
              {verdict.mass.legacyLimitKg && (
                <div className="note">
                  <strong>Worth knowing:</strong> the <Term k="cds">CubeSat rulebook</Term>{' '}
                  now allows 2.00 kg per unit. Plenty of older guides still say{' '}
                  {verdict.mass.legacyLimitKg} kg — you will meet that number out there.
                </div>
              )}
            </div>
          </Section>

          <Section
            title="The orbit itself"
            lede="These numbers come straight out of the orbit you chose. Click any of them to see the maths.">
            <div className="panel">
              <div className="stats">
                <Stat t={period} label="Time for one lap" />
                <Stat t={orbitalVelocity(design.orbit)} label="How fast it travels" />
                <Stat t={eclipseDuration(design.orbit)} label="Time in Earth's shadow" term="eclipse" />
                <Stat t={betaAngle(design.orbit)} label="Sun angle on the orbit" term="betaAngle" />
                <Stat t={payloadDataPerOrbitMb(design)} label="Data recorded per lap" />
                <Stat t={verdict.data.generatedMbPerDay} label="Data recorded per day" />
                <Stat t={verdict.data.downlinkedMbPerDay} label="Data you get home" term="dataClosure" />
                <Stat t={verdict.link.pathLossDb} label="Signal lost to distance" term="pathLoss" />
              </div>
              <div className="note">
                It goes round Earth <strong>{formatNumber(orbitsPerDay(design.orbit))}</strong>{' '}
                times a day, talking on {BANDS[radio.band].label.split('(')[0].trim()} at{' '}
                {radio.dataRateBps >= 1e6
                  ? `${radio.dataRateBps / 1e6} Mbps`
                  : `${radio.dataRateBps / 1000} kbps`}.
              </div>
            </div>
          </Section>
        </div>

        <Section
          title="Three things to try"
          lede="Each one takes a few minutes and is designed to break an idea most people get wrong at first. Guess the answer before you run it — being wrong is the part that teaches you.">
          {MISSIONS.map((m) => {
            const active = mission === m.id;
            const done = active && missionDone;
            return (
              <div className={`mission${done ? ' done' : active ? ' active' : ''}`} key={m.id}>
                <h4>{m.title}{done ? '  ✓' : ''}</h4>
                <p>{m.brief}</p>
                {active ? (
                  <>
                    <div className="predict">
                      <span className="lbl">Guess first</span>
                      {m.predict}
                    </div>
                    <div className="goal"><strong>Aim for:</strong> {m.goal}</div>
                    <div className="myth">Most people believe: {m.misconception}</div>
                    {done && (
                      <div className="won">
                        You did it. Now try to break it again a different way.
                      </div>
                    )}
                  </>
                ) : (
                  <button onClick={() => { setMission(m.id); setDesign(m.setup); }}>
                    Start this
                  </button>
                )}
              </div>
            );
          })}
        </Section>

        <div className="limits">
          <h3>What this does not know</h3>
          <p>
            Being honest about limits is part of engineering, so here are ours.
            This model does <strong>not</strong> work out how hot or cold the
            satellite gets, does not simulate it spinning and steadying itself,
            and does not calculate when it will eventually fall back to Earth.
            The radio maths ignores rain and interference.
          </p>
          <p>
            Which way the satellite points is treated as something you{' '}
            <strong>choose</strong>, not something we simulate — the help text under
            that setting explains what each choice assumes.
          </p>
          <p>
            Everything here is a teaching model. Every number will show you its
            formula and where it came from, so you can judge it for yourself —
            but do not build real hardware from it.
          </p>
        </div>
      </main>
    </div>
  );
}
