import { useState } from 'react';
import { DEFAULT_DESIGN, EXAMPLE_DESIGNS, type Design } from '../physics/design';
import { DesignView } from './DesignView';
import { LearnView } from './LearnView';

type View = 'learn' | 'design';

const TABS: { id: View; label: string; hint: string }[] = [
  { id: 'learn', label: 'Start here', hint: 'What a CubeSat is and how to build one' },
  { id: 'design', label: 'Design one', hint: 'Build a satellite and see if it survives' },
];

export default function App() {
  const [view, setView] = useState<View>('learn');
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const [mission, setMission] = useState<string | null>(null);

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
