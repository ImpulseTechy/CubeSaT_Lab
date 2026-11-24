# CubeSat Lab

**Learn how satellites work, then build one that survives.**

**Live: https://impulsetechy.github.io/CubeSaT_Lab/**

A free, open-source, zero-install web platform that takes someone who has never heard of a CubeSat
all the way to designing one — with real physics that shows its working.

It opens on **Start here**: what a CubeSat is, a clickable cutaway of what is inside one, why real
student satellites fail, three worked examples, and the actual path from curiosity to orbit. Only
then does it offer **Design one**.

Owning or prototyping a CubeSat costs money and equipment most students don't have. The existing
options are mostly either toy games with no real physics, or professional tools (GMAT, 42, Basilisk,
NOS3, Simulink) that need a desktop install and the background the learner is trying to acquire.

Five tools already occupy parts of the middle ground:

| Tool | Design your own? | Coupled bus physics | RF link | Teaching |
|---|---|---|---|---|
| [Groundsat](https://groundsat.com) | ✗ catalogue only | ✗ | ✅ **best in class** | ✗ |
| [OrbitSmith](https://orbitsmith.net) | partial | quick checks | ~ screening only | ✗ |
| [CMAT](https://cubesatmission.com) | envelope config | ✅ orbit/thermal/power/attitude | ✗ | ✗ |
| [CubeSTEM MissionLab](https://cubestem.com) | ✗ fixed presets | ✅ reduced-order | ✗ | ✅ |
| [Space Systems Lab](https://arnavvenkatesh.com) | mass only | partial | ✗ faked | ✅ |

**No row has design, coupling and teaching together.** That gap — not any single physics model — is
what we build:

1. **A parts-level design → consequence loop** — pick components, watch mass → power → eclipse →
   link closure → delivered data volume cascade. Nobody takes *a satellite you configured* and tells
   you whether it closes its mission.
2. **Diagnostic teaching** — not "mission failed" but *"your SoC hit 12% on orbit 4: imaging draws
   4.2 W against 2.8 W generated — cut duty cycle to 40% or add deployables."*
3. **The undergraduate/club band** — between MissionLab's schools and CMAT's domain experts.
4. **Open source, with every number expanding to its substituted formula and citation.**

We do **not** compete on RF fidelity — Groundsat already does range-varying link budgets with ITU-R
rain and galactic noise. Ours needs to be good enough to teach the trade, no more. No claim to be
first or unique.

## Status

**v1 is running.** Physics core validated (81 tests), UI complete, three guided missions.

```bash
npm install && npm run dev
```

Every push to `main` runs the type check and the full test suite, then publishes
the site. A red build blocks the deploy — which matters here, because the tests
check the physics against closed-form values and the copy against a jargon list.

Run the tests with `npm test`. Production build is 62 kB gzipped, no backend, no accounts.

### What works today

**Start here** — six chapters for a complete beginner, no prior knowledge assumed:
1. **What is it?** — size, history, and why a standard shape made student satellites possible
2. **How does it work?** — an animated orbit showing the whole operating loop: charging in
   sunlight, draining in Earth's shadow, and the few minutes a day it can send data home.
   Plus a release-and-detumble animation showing why a satellite has to stop spinning first
3. **What types are there?** — five sizes drawn to scale as rotating 3D cubes, plus six kinds
   of mission and what makes each one hard
4. **What is inside?** — an interactive cutaway; click any part for what it does and how it
   fails. Build a 3U yourself part by part and watch the weight climb. Then open up any of the
   eight subsystems as its own tree — 61 topics in all, from why a cold battery is ruined by
   charging to why a tape-measure aerial has to spring out first time — plus an animated power
   flow whose direction reverses in Earth's shadow
5. **Why do they fail?** — the real numbers, and the finding that justifies this whole project
6. **How do I build one?** — an eight-stage roadmap with honest timescales, costs, what goes
   wrong at each stage, and how to tell when you have finished it

**Fly a CanSat** — the thing a student can actually build this weekend:
- Pick a launch (drone, 1 km drop, weather balloon), size the parachute, choose a
  radio setting and a battery
- Watch the flight happen, split between **what really happened** and **what arrived
  on your laptop** — because on a real flight you only ever get the second one
- Switch on a real mistake and fly again: wrong sensor address, unflushed SD card,
  half-charged battery, GPS left in its default mode
- Read the report: landing speed, how far you have to walk, packets home, and what
  went wrong in plain language

**Design one** — the orbital simulator (every design is a shareable link):
- Configure a 1U–6U CubeSat from a parts catalogue; live mass budget against CDS Rev. 14.1
- Orbit selection with eclipse geometry, beta angle and J2 nodal regression
- Battery state-of-charge over six orbits with eclipse bands and the brownout floor
- 24-hour ground track with passes counted from real geometry
- Range-varying link budget and the data-closure verdict
- **Mass / Power / Data verdict cards** with quantified diagnosis and cross-subsystem fixes
- Every number expands to formula, substituted values, assumptions and source
- Three guided missions with predict-before-run and completion detection

### Validated against

| Check | Result |
|---|---|
| Period, velocity, eclipse at 525 km | Exact against closed form (95.13 min, 7.599 km/s, 35.68 min) |
| Slant range at 10° elevation | 1,755.9 km — independently matches the blueprint figure |
| Solar array output | Calibrated to real CubeSat figures (3U body ~3.6 W orbit-average) |
| Pass counts | 4/day mid-latitude, 11/day polar station — both match real-world values |
| FSPL | Closed-form checks at 437.5 MHz; +6 dB per range doubling |

## Documents

| Doc | What's in it |
|---|---|
| [docs/01-landscape-research.md](docs/01-landscape-research.md) | Survey of CubeSat learning/simulation tools across 6 clusters. ⚠️ Its gap statement is retired — see doc 03 |
| [docs/02-requirements.md](docs/02-requirements.md) | Personas, prioritised requirements, architecture direction, v1 scope, validation criteria, open questions |
| [docs/03-link-verification.md](docs/03-link-verification.md) | URL-by-URL verification of a supplied platform list; assessment of the real competitors; **revised gap statement**; hands-on teardown of Space Systems Lab |
| [docs/04-review-of-phase1-doc.md](docs/04-review-of-phase1-doc.md) | Critique of the Phase 1 research & product discovery document — corrections, the link-budget priority error, and the §5.4 architecture contradiction |
| [docs/05-review-of-technical-blueprint.md](docs/05-review-of-technical-blueprint.md) | Critique of the technical blueprint — verified physics, the Groundsat finding that **retracted our RF wedge**, citation-integrity problems, and scope realism |
| **[docs/06-v1-spec.md](docs/06-v1-spec.md)** | **The build contract — what v1 is, what it explicitly is not, architecture, libraries, validation gates, build order** |

## v1 scope in one paragraph

Pick a form factor (1U–6U) and components; see a live mass budget. Pick an orbit; see it propagated
with eclipse geometry. Get a power simulation with battery state-of-charge over orbits and a margin
verdict, a **link budget** with ground-station passes and achievable daily data volume — all fully
coupled, so changing the payload cascades through power, mass and inertia. Every number expands to
show its formula and substituted values. Three guided missions teach it, with diagnostic feedback
instead of "mission failed".

Thermal, attitude dynamics, decay/lifetime, failure injection and educator mode are v2 — and are
parity features, not differentiators, since CMAT already does several of them well.

## The baseline to beat

**Space Systems Lab** (free, MIT, one 36 KB file, single author) is the closest existing product and
has been tested hands-on: a working mission sim with fault injection, a live cascading mass budget,
and correct solar-constant power physics. But it is pseudo-3D (no WebGL), single-axis ADCS, its power
budget does not respond to configuration, and its "link margin" hard-codes path loss at −139.2 dB.

That generalised to an RF wedge, which has since been **retracted**: groundsat.com closes the link
properly, with ITU-R rain attenuation and galactic background noise. The wedge is the design →
consequence loop plus diagnostic teaching, not the link budget.

## Next research step

CMAT, MissionLab and Defiant have still only been *fetched*, never *run*. Using CMAT's free tier
(3 analyses/day) and MissionLab's account-free practice missions is the highest-value remaining
research task.
