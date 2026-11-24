import { useEffect, useState } from 'react';
import { DEFAULT_DESIGN, EXAMPLE_DESIGNS, type Design } from '../physics/design';
import { DesignView } from './DesignView';
import { LearnView } from './LearnView';
import { CanSatView } from './CanSatView';
import { designFromUrl, loadLocally, saveLocally, syncUrl } from './share';

type View = 'learn' | 'cansat' | 'design';

const TABS: { id: View; label: string; hint: string }[] = [
  { id: 'learn', label: 'Start here', hint: 'What a CubeSat is and how to build one' },
  { id: 'cansat', label: 'Fly a CanSat', hint: 'Build the thing you can actually make this weekend' },
  { id: 'design', label: 'Design one', hint: 'Build a satellite and see if it survives' },
];

export default function App() {
  // A design in the link wins over saved work, and both beat the default.
  // Arriving via a shared link should always show what was shared.
  const shared = designFromUrl();
  const [view, setView] = useState<View>(shared ? 'design' : 'learn');
  const [design, setDesign] = useState<Design>(shared ?? loadLocally() ?? DEFAULT_DESIGN);
  const [mission, setMission] = useState<string | null>(null);

  // Keep the address bar and local storage in step, so a refresh or a copied
  // URL never loses what someone worked out.
  useEffect(() => {
    saveLocally(design);
    if (view === 'design') syncUrl(design);
  }, [design, view]);

  // Pasting a shared link into a tab that is already open changes the hash
  // without reloading, so without this the link would appear to do nothing.
  useEffect(() => {
    const onHash = () => {
      const d = designFromUrl();
      if (!d) return;
      setDesign(d);
      setView('design');
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const loadExample = (id: string) => {
    const d = EXAMPLE_DESIGNS[id];
    if (!d) return;
    setDesign(d);
    setMission(null);
    setView('design');
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          <h1>CubeSat Lab</h1>
          <span className="sub">
            learn how satellites work, then build one that survives
          </span>
        </div>

        <nav className="tabs" aria-label="Sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              aria-pressed={view === t.id}
              onClick={() => setView(t.id)}
              title={t.hint}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <span className="spacer" />
        <span className="stamp">teaching model — do not fly hardware on it</span>
      </header>

      {view === 'cansat' ? (
        <div className="learn-scroll">
          <CanSatView />
        </div>
      ) : view === 'learn' ? (
        <div className="learn-scroll">
          <LearnView onLoadExample={loadExample} />
          <div className="handoff">
            <p>
              That is the whole picture. Now go and build something &mdash; break
              it, read why it broke, and fix it. A CanSat is where almost every
              real satellite team starts, and it is the one you could actually
              make this weekend.
            </p>
            <button onClick={() => { setView('cansat'); window.scrollTo({ top: 0 }); }}>
              Fly a CanSat &rarr;
            </button>
            <button className="secondary"
                    onClick={() => { setView('design'); window.scrollTo({ top: 0 }); }}>
              Design a satellite
            </button>
          </div>
        </div>
      ) : (
        <DesignView
          design={design}
          setDesign={setDesign}
          mission={mission}
          setMission={setMission}
        />
      )}
    </div>
  );
}
