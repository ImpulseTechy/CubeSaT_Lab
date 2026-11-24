import { useState } from 'react';
import { Anatomy } from './Anatomy';
import {
  EXAMPLES, FACTS, FAILURE_FACTS, GETTING_STARTED, SUBSYSTEMS,
} from './learn';

export function LearnView({ onLoadExample }: { onLoadExample: (id: string) => void }) {
  const [part, setPart] = useState<string>('eps');
  const chosen = SUBSYSTEMS.find((s) => s.id === part) ?? SUBSYSTEMS[1];

  return (
    <div className="learn">
      {/* ---------------------------------------------------------------- */}
      <section className="hero">
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
          They take photographs of Earth, measure radiation, test new radios, and
          carry biology experiments. Some were built by school pupils.
        </p>

        <div className="facts">
          {FACTS.map((f) => (
            <div className="fact" key={f.k}>
              <span className="n">{f.k}</span>
              <span className="d">{f.v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="learn-section">
        <h2>What is inside one?</h2>
        <p className="lede">
          Every satellite, from a student CubeSat to a space telescope, needs the
          same handful of things. Click a part of the diagram to find out what it
          does and what happens when it goes wrong.
        </p>

        <div className="anatomy-layout">
          <div className="anatomy-wrap">
            <Anatomy selected={part} onSelect={setPart} />
          </div>

          <div className="part-detail">
            <div className="part-tabs">
              {SUBSYSTEMS.map((s) => (
                <button
                  key={s.id}
                  aria-pressed={part === s.id}
                  onClick={() => setPart(s.id)}
                >
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
              {chosen.failureShare && (
                <span className="share">{chosen.failureShare}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="learn-section">
        <h2>Why do satellites fail?</h2>
        <p className="lede">
          This is the uncomfortable part, and it is the reason this whole site
          exists. Researchers have tracked what actually happened to student
          CubeSats once they reached orbit.
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
          And the clearest finding of all: teams succeed far more often on their
          second and third attempts. The missing ingredient is not better hardware.
          It is <strong>practice at making the parts work together</strong> &mdash;
          which is exactly what you cannot get when a satellite costs years and
          thousands of pounds.
        </p>
        <p className="attrib">{FAILURE_FACTS.source}</p>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="learn-section">
        <h2>Three satellites to look at</h2>
        <p className="lede">
          The quickest way to understand the trade-offs is to open a real design and
          see what it had to give up. Each of these loads into the Design section.
        </p>
        <div className="examples">
          {EXAMPLES.map((e) => (
            <div className="example" key={e.id}>
              <span className="size">{e.size}</span>
              <h4>{e.name}</h4>
              <p>{e.story}</p>
              <p className="lesson">{e.lesson}</p>
              <button onClick={() => onLoadExample(e.loads)}>
                Open this design &rarr;
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="learn-section">
        <h2>How would I actually build one?</h2>
        <p className="lede">
          Nobody goes straight from curiosity to orbit. This is the path almost every
          successful team has taken, roughly in order.
        </p>
        <ol className="steps">
          {GETTING_STARTED.map((s) => (
            <li key={s.n}>
              <span className="num">{s.n}</span>
              <div>
                <h4>
                  {s.title}
                  {s.time && <span className="time">{s.time}</span>}
                </h4>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="where-next">
          <strong>Where this site fits:</strong> step 5. You can try every one of
          those design decisions here, break things, and find out why they broke
          &mdash; before anyone spends money. That is the practice that first-time
          teams never get.
        </div>
      </section>
    </div>
  );
}
