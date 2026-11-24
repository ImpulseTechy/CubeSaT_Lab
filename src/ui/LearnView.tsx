import { useState } from 'react';
import { Anatomy } from './Anatomy';
import { AssemblyAnimation } from './AssemblyAnimation';
import { PowerFlow, SubsystemTree } from './PowerSystem';
import { findNode, TREES } from './content/trees';
import { HowItWorks, Roadmap, Types } from './chapters';
import { EXAMPLES, FACTS, FAILURE_FACTS, SUBSYSTEMS } from './learn';

type Chapter = 'what' | 'works' | 'types' | 'inside' | 'fail' | 'build';

const CHAPTERS: { id: Chapter; label: string; q: string }[] = [
  { id: 'what', label: 'What is it?', q: 'What is a CubeSat?' },
  { id: 'works', label: 'How does it work?', q: 'How does a CubeSat work?' },
  { id: 'types', label: 'What types are there?', q: 'What types of CubeSat are there?' },
  { id: 'inside', label: 'What is inside?', q: 'What is inside one?' },
  { id: 'fail', label: 'Why do they fail?', q: 'Why do satellites fail?' },
  { id: 'build', label: 'How do I build one?', q: 'How do I actually build one?' },
];

export function LearnView({ onLoadExample }: { onLoadExample: (id: string) => void }) {
  const [chapter, setChapter] = useState<Chapter>('what');

  const go = (c: Chapter) => {
    setChapter(c);
    document.querySelector('.learn-scroll')?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0 });
  };

  const idx = CHAPTERS.findIndex((c) => c.id === chapter);
  const next = CHAPTERS[idx + 1];

  return (
    <div className="learn">
      <nav className="chapter-nav" aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <button key={c.id} aria-pressed={chapter === c.id} onClick={() => go(c.id)}>
            <span className="cn-n">{i + 1}</span>
            {c.label}
          </button>
        ))}
      </nav>

      {chapter === 'what' && <WhatIsIt />}
      {chapter === 'works' && <HowItWorks />}
      {chapter === 'types' && <Types onLoadExample={onLoadExample} />}
      {chapter === 'inside' && <Inside />}
      {chapter === 'fail' && <WhyFail />}
      {chapter === 'build' && <Roadmap />}

      {next && (
        <div className="next-chapter">
          <span>Next</span>
          <button onClick={() => go(next.id)}>{next.q} &rarr;</button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function WhatIsIt() {
  return (
    <div className="chapter">
      <h2>What is a CubeSat?</h2>
      <p className="big">
        A CubeSat is a satellite built from 10&nbsp;centimetre cubes. One cube,
        about the size of a Rubik&rsquo;s cube, weighs up to 2&nbsp;kg. You can
        stack them &mdash; three in a row is the most common size students build.
      </p>
      <p>
        Before 1999, every satellite was a one-off, and only governments and large
        companies could afford one. Then two universities, Stanford and Cal Poly,
        agreed on a standard shape and weight. Because every CubeSat is the same
        shape, the same launcher can carry any of them, and suddenly a university
        could put something in orbit for the price of a research grant rather than
        the price of a building.
      </p>
      <p>
        More than two thousand have launched since, a great many built by students.
        They photograph Earth, measure radiation, test new radios and carry biology
        experiments. Some were built by school pupils.
      </p>
      <div className="facts">
        {FACTS.map((f) => (
          <div className="fact" key={f.k}>
            <span className="n">{f.k}</span>
            <span className="d">{f.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Inside() {
  const [part, setPart] = useState<string>('eps');
  const [nodeId, setNodeId] = useState('eps');
  const chosen = SUBSYSTEMS.find((s) => s.id === part) ?? SUBSYSTEMS[1];
  const tree = TREES[part] ?? TREES.eps;
  const node = findNode(tree, nodeId) ?? tree;

  // Selecting a different part of the satellite opens that part's tree.
  const choosePart = (id: string) => {
    setPart(id);
    setNodeId(id);
  };

  return (
    <div className="chapter">
      <h2>What is inside one?</h2>
      <p className="lede">
        Every satellite, from a student CubeSat to a space telescope, needs the same
        handful of things. Click a part of the diagram to find out what it does and
        what happens when it goes wrong.
      </p>

      <div className="anatomy-layout">
        <div className="anatomy-wrap">
          <Anatomy selected={part} onSelect={choosePart} />
        </div>
        <div className="part-detail">
          <div className="part-tabs">
            {SUBSYSTEMS.map((s) => (
              <button key={s.id} aria-pressed={part === s.id} onClick={() => choosePart(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
          <h3>{chosen.name}</h3>
          <p className="one-liner">{chosen.oneLiner}</p>
          <p className="like">Think of it as <strong>{chosen.likeA}</strong>.</p>
          <p>{chosen.what}</p>
          <div className="fail-box">
            <span className="lbl">If it fails</span>
            {chosen.ifItFails}
            {chosen.failureShare && <span className="share">{chosen.failureShare}</span>}
          </div>
        </div>
      </div>

      <h3 className="sub">Build one yourself</h3>
      <p className="lede">
        Add the parts one at a time and watch the weight climb. A 3U is allowed
        6&nbsp;kg, and going over means it does not fly.
      </p>
      <AssemblyAnimation />

      <h3 className="sub">Opening up the {chosen.name.toLowerCase()}</h3>
      <p className="lede">
        Each of those parts is a whole subject of its own. Here is the{' '}
        {chosen.name.toLowerCase()} broken down &mdash; click anything in the tree to
        read about it, or pick a different part above to open its own tree.
      </p>

      <div className="deep-dive">
        <SubsystemTree tree={tree} selected={nodeId} onSelect={setNodeId} />
        <div className="dd-detail">
          <h4>{node.label}</h4>
          <p className="dd-short">{node.short}</p>
          <p>{node.detail}</p>
        </div>
      </div>

      {part === 'eps' && (
        <>
          <h3 className="sub">How the electricity actually moves</h3>
          <p className="lede">
            Switch between sunlight and shadow. Watch which way the dots travel
            &mdash; that reversal is the whole problem the power system exists to
            solve.
          </p>
          <PowerFlow />
        </>
      )}
    </div>
  );
}

function WhyFail() {
  return (
    <div className="chapter">
      <h2>Why do satellites fail?</h2>
      <p className="lede">
        This is the uncomfortable part, and it is the reason this whole site exists.
        Researchers have tracked what actually happened to student CubeSats once they
        reached orbit.
      </p>
      <div className="failure-grid">
        <div className="fnum">
          <span className="n">40%+</span>
          <span className="d">of first-time university CubeSats fail early</span>
        </div>
        <div className="fnum">
          <span className="n">1 in 3</span>
          <span className="d">are never heard from at all after release</span>
        </div>
        <div className="fnum">
          <span className="n">~half</span>
          <span className="d">
            of failures come from parts that each worked alone but not together
          </span>
        </div>
      </div>
      <p>
        Read that last one again, because it is the important one. The frame almost
        never breaks. The parts are usually fine. What goes wrong is the
        <strong> joins</strong> &mdash; a radio that needs more power than the panels
        can make, a battery wired to the wrong thing, a camera that produces more
        pictures than the radio can ever send home.
      </p>
      <p>
        And the clearest finding of all: teams succeed far more often on their second
        and third attempts. The missing ingredient is not better hardware. It is
        <strong> practice at making the parts work together</strong> &mdash; which is
        exactly what you cannot get when a satellite costs years and thousands of
        pounds.
      </p>
      <p className="attrib">{FAILURE_FACTS.source}</p>

      <h3 className="sub">Three satellites to look at</h3>
      <p className="lede">
        The quickest way to understand the trade-offs is to open a real design and
        see what it had to give up.
      </p>
      <div className="examples">
        {EXAMPLES.map((e) => (
          <div className="example" key={e.id}>
            <span className="size">{e.size}</span>
            <h4>{e.name}</h4>
            <p>{e.story}</p>
            <p className="lesson">{e.lesson}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
