import { useEffect, useState } from 'react';
import { DEFAULT_DESIGN, EXAMPLE_DESIGNS, type Design } from '../physics/design';
import { DesignView } from './DesignView';
import { LearnView } from './LearnView';
import { designFromUrl, loadLocally, saveLocally, syncUrl } from './share';

type View = 'learn' | 'design';

const TABS: { id: View; label: string; hint: string }[] = [
  { id: 'learn', label: 'Start here', hint: 'What a CubeSat is and how to build one' },
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

      {view === 'learn' ? (
        <div className="learn-scroll">
          <LearnView onLoadExample={loadExample} />
          <div className="handoff">
            <p>
              That is the whole picture. When you are ready, go and build one
              &mdash; break it, read why it broke, and fix it. Nothing here costs
              anything, and nothing you do is permanent.
            </p>
            <button onClick={() => { setView('design'); window.scrollTo({ top: 0 }); }}>
              Design a satellite &rarr;
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
