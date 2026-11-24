# CubeSat Learning & Simulation Landscape — Research Findings

*Compiled 2026-11-24. Sources listed at the end.*

> ⚠️ **PARTLY SUPERSEDED — read [03-link-verification.md](03-link-verification.md) alongside this.**
> This document's central claim (that the "empty middle" is unoccupied) was based on web search
> alone and is **too strong**. Direct verification of a supplied platform list later found two real
> competitors that searches had missed: **CMAT** (free-for-students, zero-install, coupled
> orbit/thermal/power/attitude/ground-pass analysis) and **CubeSTEM MissionLab** (zero-install,
> account-free, 13 pilot missions with a real teaching layer). The cluster analysis and the
> "don't rebuild the physics" conclusions below still hold. **The gap statement in §"The gap,
> stated precisely" does not — use the revised wedge in doc 03 instead.**

## Question

Does a browser-accessible CubeSat simulation/learning platform already exist, and if so, what does it leave uncovered?

## Short answer

**No single platform does this.** The space is fragmented into five clusters, each with a structural gap. The closest things to what we want are either (a) toy games with no real physics, or (b) professional-grade engineering tools with no teaching layer and a steep setup cost. Nothing occupies the middle.

---

## Cluster 1 — Physical/hybrid hardware kits

| Project | What it is | Limitation for us |
|---|---|---|
| **AMSAT CubeSatSim** | Raspberry Pi–based 1U emulator, real UHF telemetry downlink, 3D-printed frame. Fully open source (schematics, gerbers, Pi software) + lesson plans. | Requires hardware purchase/build and an amateur-radio ground station. Great classroom tool, not reachable by a student at home. |
| **MySat** | Commercial student kit for labs, CubeSat courses, capstones. | Paid hardware. Exactly the affordability barrier we're trying to remove. |
| **DoLaunch CubeSat Educational Kit** | "Simulates core subsystems" — repo is in fact ESP32 sensor sketches. | Hardware-dependent; mislabelled as a simulator. |
| **iEDU platform kit** (SmallSat 2024) | Middle/high-school kit with lessons authored by university students. | Hardware + institutional program. |
| **MOSAIC / OreSat / VyomSat** | Open mock-satellite and real-satellite reference designs (CAD, electronics, firmware). | Reference designs, not interactive learning. |

**Takeaway:** the best teaching material in this field is locked behind hardware. This is the gap the brief identified, and it is real.

## Cluster 2 — Professional astrodynamics / simulation software

| Tool | Scope | Barrier |
|---|---|---|
| **NASA GMAT** | Mission design & analysis; flight-proven. | Desktop install, scripting, assumes orbital-mechanics background. |
| **NASA 42** (Goddard) | Attitude + orbit dynamics, multi-body, star trackers, magnetorquers. ADCS design/validation. | C codebase, config-file driven, expert audience. |
| **Basilisk** (AVS Lab) | Python-scripted modular GN&C framework; Monte Carlo, HIL. | Install complexity; research tool. |
| **Orekit** | Java flight-dynamics library. | A library, not an application. |
| **MATLAB/Simulink Aerospace Blockset** | Has a shipped CubeSat simulation project. | **Licence cost** — the single most-cited blocker for students. |
| **NASA NOS3** | Software-only testbed for small sats; runs unmodified cFS flight-software binaries. Includes 42 + COSMOS ground system + NOS Engine simulated buses. | Ubuntu VM via VirtualBox. Powerful "virtual flatsat", near-zero discoverability for a beginner. |
| **OpenSatKit** | cFS + 42 + COSMOS bundled. | Same — bundle of expert tools. |

**Takeaway:** the physics and flight-software simulation problem is *already solved* by free, credible, NASA-authored software. What's missing is an on-ramp. We should wrap/borrow from these, not re-derive orbital mechanics.

## Cluster 3 — Browser visualisation projects (CesiumJS / satellite.js)

Numerous hobby and thesis projects: `satellite-tracker` (TLE/SGP4 + FastAPI, explicitly "inspired by STK workflow, for educational purposes", CesiumJS via CDN, no Ion account needed), `sat-vis` (static, no backend), `cesium-satellite-tracker` (React, "visualize how LEO vs GEO behave"), and several senior-design reports.

**Pattern:** every one of these is a **viewer**. They propagate a TLE and draw it. None has design inputs, subsystem budgets, failure modes, or a curriculum. One senior-design report explicitly notes that STK required requesting permission — evidence that a free browser alternative is a felt need.

**Takeaway:** the rendering/propagation layer is a commodity. `satellite.js` + CesiumJS (or Three.js) gets us orbits cheaply. Don't spend the project's novelty budget here.

## Cluster 4 — Educational games and single-purpose calculators

| Project | Notes |
|---|---|
| **Pixxel Mission Builder** | Browser game: pick mission, balance power/comms/propulsion against a credit budget. Explicitly simplified, not real designs. |
| **Orbit on a Budget** (Space Apps 2026) | Pick instruments with power draw + cost, bus, rocket; score = research points per $M. |
| **Mission Control / space-mission-game** | HTML/JS game stepping through size, payload, power, comms for three real missions. |
| **Satellite Builder (UK)** | Teacher-guided build game, beginner→advanced tiers with budget/power/thrust constraints. |
| **AcubeSAT Link Budget Playground** | Vue.js link-budget scenario simulator. Single-purpose but genuinely engineering-grade. |
| **OrbitLink Studio** | Browser multi-orbit link budget, 3D globe, editable payloads, exportable reports. |

**Takeaway:** games teach *trade-off intuition* well and physics not at all. The two link-budget tools prove a real engineering calculation can live comfortably in a browser. Nobody has joined a configurable satellite builder to live power *and* link *and* thermal *and* attitude budgets.

## Cluster 5 — Curriculum and written material

- **NASA CubeSat 101** (CSLI) — a PDF guide, widely called the single best starting point. Plus three short NASA videos. Not a course; no interactivity; no assessment.
- **KiboCUBE Academy** (UNOOSA/JAXA) — lecture series, mission design → subsystems → operations. Described as the closest thing to a full CubeSat course. Lecture video, not practice.
- **ESA Academy** — nothing surfaced in search; status unconfirmed. Worth a direct check.

**Takeaway:** good *content* exists and is freely licensable/citable. It is passive. A learner reads CubeSat 101 and still cannot try anything.

## Cluster 6 — Digital twins (academic)

TUM theses on CubeSat digital twins (EPS twin with automated compare-to-simulation control loop); a validated 6U EPS twin on Typhoon HIL hardware; a student 1U thermal/orbital twin with public docs and **private code**. No commercial CubeSat digital-twin training subscription surfaced (NanoAvionics / Open Cosmos not confirmed either way — worth checking their sites directly).

**Takeaway:** "digital twin" in this field means *mirroring a specific built satellite*, not *teaching*. Different problem.

---

## The gap, stated precisely

> ⚠️ **RETIRED.** Superseded by the revised wedge in [03-link-verification.md](03-link-verification.md#revised-gap-statement). Kept for the record.

> There is no **free, zero-install, browser-based environment where a student can design a CubeSat, see physically credible consequences of their design choices across all subsystems, operate the resulting mission over time, and be taught while doing it.**

Four things must co-exist, and currently never do:

1. **Zero install** — a URL. (Kills GMAT, 42, Basilisk, NOS3, Simulink, every hardware kit.)
2. **Real physics, not scoring heuristics** — SGP4/J2 orbits, eclipse geometry, real power balance, Friis link budget, lumped thermal, rigid-body attitude. (Kills every game.)
3. **Whole-system coupling** — the point of CubeSat engineering is that a bigger payload costs power, which costs battery mass, which costs structure, which changes inertia, which changes ADCS sizing. (Kills every single-purpose calculator.)
4. **A teaching layer** — guided missions, explanations of *why* a budget failed, scaffolding from "what is a CubeSat" to "my 3U has a positive power margin in a dawn-dusk SSO". (Kills every visualiser and library.)

## Strategic implications for the build

- **Don't rebuild physics from scratch, and don't rebuild it wrong.** Use `satellite.js` (SGP4) for orbits; port the well-documented textbook equations for power/link/thermal. Cite NASA 42 / GMAT as the validation reference — we can cross-check our outputs against them offline and ship the comparison as a credibility asset.
- **Leverage NASA CubeSat 101 and KiboCUBE as the curriculum spine** rather than authoring pedagogy from zero. Our contribution is the *interactive* layer.
- **The differentiator is coupling + explanation, not graphics.** A beautiful Cesium globe is table stakes; six projects already have one.
- **Physics credibility is the moat.** Every competitor is either a toy or a tool. Being a *correct toy* is the unoccupied position.

---

## Sources

Hardware & kits: [AMSAT CubeSatSim](https://cubesatsim.org/Meet-the-CubeSatSim.pdf) · [AMSAT PCB](https://www.amsat.org/product/amsat-cubesatsim-pcb/) · [CubeSatSim classroom report](http://cubesatsim.org/content/CubeSat%20SImulator%20Symposium%202019%2012%20Months%20Handout.pdf) · [MySat](https://www.mysatkit.com/) · [DoLaunch kit](https://github.com/DoLaunch/Do-Launch-Educational-Kit) · [iEDU (SmallSat 2024)](https://digitalcommons.usu.edu/smallsat/2024/all2024/30) · [teaching-analogue design list](https://www.astronomy.me.uk/urls-for-designs-for-cubesat-analogue-for-teaching-purposes)

Simulation software: [Review of free spacecraft simulation software](https://www.researchgate.net/publication/356528973_Review_of_free_software_for_spacecraft_simulation) · [Basilisk framework paper](https://hanspeterschaub.info/PapersPrivate/Kenneally2020a.pdf) · [awesome-space-systems-simulation](https://github.com/aoezhb/awesome-space-systems-simulation) · [astrodynamics tool comparison 2026](https://www.refontelearning.com/blog/astrodynamics-software-tools-gmat-stk-poliastro) · [MATLAB CubeSat modelling](https://www.mathworks.com/help/aeroblks/model-and-simulate-cubesats.html) · [NOS3 overview](https://flightsoftware.jhuapl.edu/files/2015/Day-3/NOS3.pdf) · [NOS3 / STF-1 case study](https://jossonline.com/wp-content/uploads/2019/01/Final-Spolaor-NASA-Operational-Simulator-for-Small-Satellites-NOS3-The-STF-1-CubeSat-Case-Study.pdf) · [nasa/nos3](https://github.com/nasa/nos3/wiki) · [cFS on Dellingr](https://ntrs.nasa.gov/api/citations/20170011566/downloads/20170011566.pdf)

Browser visualisation: [satellite-tracker](https://github.com/2227302-cmyk/satellite-tracker) · [satellite-orbit](https://github.com/UrsaruBoss/satellite-orbit) · [sat-vis](https://github.com/boostedspaceprogram/sat-vis) · [cesium-satellite-tracker](https://github.com/PetrValik/cesium-satellite-tracker) · [browser satellite visualisation thesis](https://www.theseus.fi/server/api/core/bitstreams/f5d6290d-58eb-46c0-9b2d-49f585c6ff8d/content) · [SAOV senior design report](https://csns.cysun.org/department/cs/project/resource/view?projectId=6644179&resourceId=7177254)

Games & calculators: [Pixxel Mission Builder](https://play.pixxel.space/) · [space-mission-game](https://github.com/artemvalko/space-mission-game) · [orbit-on-a-budget](https://github.com/Falafel08/orbit-on-a-budget) · [AcubeSAT Link Budget Playground](https://gitlab.com/acubesat/education/link-budget-playground) · [OrbitLink Studio](https://github.com/theosioulas/LinkBudget) · [Satellite Builder guide](https://satellitebuilder.org.uk/guide/en/satellite-builder-guide.pdf) · [link budget reference](https://pressbooks-dev.oer.hawaii.edu/epet302/chapter/9-6-link-budget/)

Curriculum: [NASA CubeSat 101](https://s3vi.ndc.nasa.gov/ssri-kb/static/resources/nasa_csli_cubesat_101_508.pdf) · [CSLI resources](https://www.nasa.gov/kennedy/launch-services-program/cubesat-launch-initiative/cubesat-launch-initiative-resources/) · [cubesat-resources.space getting started](https://cubesat-resources.space/getting-started/)

Digital twins: [TUM digital twin thesis](https://mediatum.ub.tum.de/doc/1762445/bldjug0n5yg9a9hxo6xh3wqwn.MA_LeonhardKessler.pdf) · [TUM publication](https://portal.fis.tum.de/en/publications/advancing-digital-twin-implementation-for-cubesats-integrating-th/) · [6U EPS digital twin](https://www.researchgate.net/publication/383436661_Implementation_of_a_6U_CubeSat_Electrical_Power_System_Digital_Twin) · [1U CubeSat digital twin](https://github.com/neptune-original/Digital-Twin-of-1U-CubeSat) · [digital engineering test framework](https://itea.org/journals/volume-45-3/development-of-a-digital-engineering-testing-framework-for-cubesat-applications/)
