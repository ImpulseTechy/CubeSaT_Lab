/**
 * The three new chapters: how it works, what types there are, and the build
 * roadmap.
 */

import { useState } from 'react';
import { OrbitAnimation } from './OrbitAnimation';
import { Cube, CUBE_SHAPES, SizeComparison } from './CubeStack';
import { DAY_IN_THE_LIFE, THREE_JOBS, WORKS_INTRO } from './content/works';
import { MISSION_TYPES, SIZE_TYPES, TYPES_INTRO } from './content/types';
import { ROADMAP_INTRO, STAGES } from './content/roadmap';

// ---------------------------------------------------------------------------
// How does it work?
// ---------------------------------------------------------------------------

export function HowItWorks() {
  const [open, setOpen] = useState<string | null>('shadow');

  return (
    <div className="chapter">
      <h2>How does a CubeSat actually work?</h2>

      <p className="big">{WORKS_INTRO.lead}</p>
      <p>{WORKS_INTRO.body}</p>
      <div className="aside">
        <span className="aside-label">A thing people get wrong</span>
        {WORKS_INTRO.weightless}
      </div>

      <h3 className="sub">Watch one lap</h3>
      <p className="lede">
        Here is the whole job, on a loop. Keep an eye on the three bars underneath
        &mdash; they are the same three things the Design section later asks you to
        balance.
      </p>

      <OrbitAnimation />

      <h3 className="sub">The three jobs, all at once</h3>
      <div className="jobs">
        {THREE_JOBS.map((j, i) => (
          <div className="job" key={j.title}>
            <span className="job-n">{i + 1}</span>
            <h4>{j.title}</h4>
            <p>{j.body}</p>
          </div>
        ))}
      </div>
      <p>
        A satellite that does any two of these and not the third is a failure. One
        that makes plenty of power and takes beautiful photographs but cannot send
        them home has achieved nothing anybody on Earth will ever see.
      </p>

      <h3 className="sub">A day in the life, step by step</h3>
      <ol className="phases">
        {DAY_IN_THE_LIFE.map((p) => {
          const on = open === p.id;
          return (
            <li key={p.id} className={on ? 'on' : ''}>
              <button onClick={() => setOpen(on ? null : p.id)} aria-expanded={on}>
                <span className="ph-title">{p.title}</span>
                <span className="ph-short">{p.short}</span>
                <span className="ph-chev">{on ? '−' : '+'}</span>
              </button>
              {on && (
                <div className="ph-body">
                  <p>{p.body}</p>
                  {p.analogy && (
                    <p className="analogy">
                      <span className="an-label">Think of it like this</span>
                      {p.analogy}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// What types are there?
// ---------------------------------------------------------------------------

export function Types({ onLoadExample }: { onLoadExample: (id: string) => void }) {
  const [size, setSize] = useState('3U');
  const chosen = SIZE_TYPES.find((s) => s.name === size) ?? SIZE_TYPES[2];

  return (
    <div className="chapter">
      <h2>What types of CubeSat are there?</h2>
      <p className="big">{TYPES_INTRO}</p>

      <h3 className="sub">Sorted by size</h3>
      <p className="lede">
        All drawn to the same scale, so you can see what you actually gain. Click
        one to spin it.
      </p>

      <SizeComparison selected={size} onSelect={setSize} />

      <div className="size-detail">
        <div className="sd-cube">
          <Cube spec={CUBE_SHAPES[chosen.name]} wings={chosen.units >= 6} />
        </div>
        <div className="sd-text">
          <h4>{chosen.name} &mdash; about the size of {chosen.everydayComparison}</h4>
          <dl className="spec">
            <div><dt>Dimensions</dt><dd>{chosen.size}</dd></div>
            <div><dt>Weight limit</dt><dd>{chosen.maxMass}</dd></div>
            <div><dt>How common</dt><dd>{chosen.popularity}</dd></div>
          </dl>
          <p><strong>Usually used for:</strong> {chosen.typicalUse}</p>
          <p>{chosen.goodFor}</p>
          <div className="catch">
            <span className="catch-label">The catch</span>
            {chosen.catch}
          </div>
        </div>
      </div>

      <h3 className="sub">Sorted by what job it does</h3>
      <p className="lede">
        Size tells you what is possible. The job tells you what will be hard.
      </p>

      <div className="missions-grid">
        {MISSION_TYPES.map((m) => (
          <div className="mission-type" key={m.id}>
            <h4>{m.name}</h4>
            <p className="mt-one">{m.oneLiner}</p>
            <span className="mt-size">{m.typicalSize}</span>
            <p>{m.what}</p>
            <div className="mt-hard">
              <span className="mt-label">Hardest part</span>
              {m.hardPart}
            </div>
            <p className="mt-example">{m.realExample}</p>
            {m.loads && (
              <button onClick={() => onLoadExample(m.loads!)}>
                Open a design like this &rarr;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The build roadmap
// ---------------------------------------------------------------------------

export function Roadmap() {
  const [open, setOpen] = useState<string>('learn');

  return (
    <div className="chapter">
      <h2>How do I actually build one?</h2>
      <p className="big">{ROADMAP_INTRO.lead}</p>
      <p>{ROADMAP_INTRO.body}</p>
      <div className="aside">
        <span className="aside-label">Worth knowing before you start</span>
        {ROADMAP_INTRO.honest}
      </div>

      <div className="roadmap">
        {STAGES.map((s) => {
          const on = open === s.id;
          return (
            <div className={`stage${on ? ' on' : ''}`} key={s.id}>
              <div className="spine">
                <span className="node">{s.n}</span>
              </div>

              <div className="stage-body">
                <button className="stage-head" onClick={() => setOpen(on ? '' : s.id)}
                        aria-expanded={on}>
                  <span className="st-title">{s.title}</span>
                  <span className="st-meta">
                    <span className="chip time">{s.time}</span>
                    <span className="chip cost">{s.cost}</span>
                    <span className={`chip ${s.alone ? 'solo' : 'team'}`}>
                      {s.alone ? 'you can start alone' : 'needs a team'}
                    </span>
                  </span>
                </button>

                {on && (
                  <div className="stage-detail">
                    <p>{s.what}</p>

                    <div className="do-now">
                      <span className="dn-label">What to do</span>
                      <ul>
                        {s.doNow.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>

                    <div className="wrong">
                      <span className="w-label">What usually goes wrong here</span>
                      {s.goesWrong}
                    </div>

                    <div className="milestone">
                      <span className="m-label">You have finished this step when</span>
                      {s.milestone}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="aside wide">
        <span className="aside-label">Where this site fits</span>
        Steps 1 and 2 &mdash; and it is free. Design a satellite here, break it,
        read why it broke, and fix it before anybody spends a penny. That practice
        at making the parts work together is exactly what first-time teams never
        get, and it is what nearly half of all failures come down to.
      </div>
    </div>
  );
}
