# Verification of a Supplied Platform List

*Checked 2026-11-24 by fetching each URL directly. The supplied list carried `utm_source=chatgpt.com` tags, i.e. it was LLM-generated, so every entry was treated as unverified.*

## Verdict summary

| # | Platform | Claim | Verified status |
|---|---|---|---|
| 1 | Space Systems Lab | Interactive CubeSat learning | ✅ **Real, and more capable than first assessed** — 4 working modules, live mass cascade, fault injection. But **pseudo-3D (2D canvas, no WebGL/Three.js), single-axis ADCS, cosmetic link margin**. 36 KB, no libraries |
| 2 | AMSAT CubeSatSim | Physical simulator | ✅ **Real** — already in our research |
| 3 | **CMAT** | Mission analysis | ✅ **Real and a serious competitor** — see below |
| 4 | **CubeSTEM MissionLab** | Education + simulation | ✅ **Real and the closest competitor** — see below |
| 5 | Defiant Smallsat | Design & simulation | ⚠️ **Likely AI-generated demo** — hosted on `abacusai.app`, no provenance |
| 6 | **NanoSatPlay** | Design & learning | ❌ **DOES NOT EXIST** — DNS `ENOTFOUND` |
| 7 | NASA GMAT | Orbital mechanics | ✅ Real, but link is a **publishing mirror**, not primary dev repo |
| 8 | Basilisk | Dynamics/ADCS | ✅ Real — already in our research |
| 9 | 42 | Spacecraft simulation | ✅ Real — already in our research |
| 10 | Orekit | Orbital mechanics library | ✅ Real — already in our research |
| 11 | PyCubed | Open CubeSat avionics | ✅ Real org, but **low activity** (last repo update Dec 2024) |
| 12 | SatNOGS | Ground station network | ✅ Real — not previously in our research, **relevant** |
| 13 | NASA CubeSat 101 | Educational resource | ✅ Real — already in our research |
| 14 | ESA Fly Your Satellite! | University programme | ✅ Real and **active in 2026**, but **URL 301-redirects** to a category listing |

**Score: 11 of 14 accurate, 1 fabricated, 1 dubious, 2 with wrong or stale URLs.**

## Corrections to the list

- **#6 NanoSatPlay — fabricated.** `nanosatplay.com` fails DNS resolution (`getaddrinfo ENOTFOUND`). The domain does not exist. This is a hallucinated entry.
- **#5 Defiant Smallsat — treat with suspicion.** Loads, but hosted on `abacusai.app` (the Abacus.AI generated-app hosting domain, unnamed on the page). No creator, company, team, dates, changelog or version. Obfuscated contact address. Claims a 3D designer, link budget, BOM calculator, "AI Design Copilot" and a 56-part catalogue priced in GBP, with two features marked unbuilt. Signup-gated, so none of it was verifiable. Reads as a vibe-coded demo, not a maintained platform.
- **#7 GMAT URL.** `github.com/nasa/GMAT` is real and recently active (last commit 2026-11-10), but its history is 8 squashed commits merged from `internal:gmat/gmat-main` — a publishing copy of an internal NASA repo, not the primary development history. The only official pointer on it is the Atlassian wiki. For canonical docs use the GMAT wiki rather than the repo.
- **#11 PyCubed is quiet.** Valid GitHub org (verified domain `pycubed.org`, Stanford), 9 repos — but the newest update is Dec 2024 and most are 2021–2023. Usable as a hardware reference; do not assume an active upstream.
- **#14 ESA URL is stale.** `www.esa.int/Education/CubeSats_-_Fly_Your_Satellite` 301-redirects to a bare "Satellites" category listing. The live programme page is **<https://education.esa.int/satellites/>**. FYS is confirmed active through 2026 (team test at ESTEC 2026-11-05; teams selected for the July 2026 window; Design Booster call). This answers open question #4 from the requirements: **ESA FYS is running**, and is a university-team programme — i.e. a source of P3-persona users, not a competitor.
- **#12 SatNOGS was missing from our research** and matters: a real global network of open-source ground stations with public observation data. Relevant as a *data source* (real pass geometry, real telemetry to compare against) and as a credibility anchor for the ground-station half of our simulation.

---

## The two real competitors

### CMAT — `cubesatmission.com` (Dr Firas Jarrar, solo developer)

**This is the closest thing to our v1 engineering core that exists, and it is free for students.**

Verified from its own app page, it runs in-browser with no install and performs, in one integrated model:

- Orbit from 6 classical elements *or* TLE import; F10.7 solar-activity regime for the drag model
- Orbital history: altitude, beta angle, node, eccentricity; **decay rate, lifetime, reentry date**
- Eclipse entry/exit angles and shadow duration per orbit
- **Thermal**: lumped-mass temperature per orbit, heat load by source, hot/cold case sizing, incident/absorbed flux per face, per-face optical properties (α, ε)
- **Power** per orbit, PV extraction, deployable wing power and temperature
- Ground track with animation, **ground-station passes for up to 3 stations** with WGS-84 elevation masks, contact timeline
- **Attitude dynamics**: gravity-gradient, aerodynamic, residual magnetic and SRP torques; magnetorquer or reaction wheels; detumble, nadir-point, LQR fine pointing; passive magnets with hysteresis rods
- Solar radiation pressure with Cr and sunlit area
- 3D orbital viewport + live attitude preview with gauges
- Geometry: standard envelopes 1U–27U with per-face area, surface type and deployable wing layouts

Free tier: 3 analyses/day, 1 saved mission, full mission window, results explicitly licensed for use "in theses and publications". Student tier (academic email): 10/day, 3 missions, free for 12 months renewable. Paid tiers $199–$490/yr are listed **"Coming soon — not available to buy yet"**.

**What CMAT does not have:**

1. **No teaching layer at all.** No lessons, no curriculum, no guided tutorials. Inline field help explains modelling assumptions. It is an engineering tool for someone who already knows the domain.
2. **No RF link budget.** Ground *access* is modelled; the radio link is not. No EIRP, path loss, G/T, Eb/N0, margin, or achievable data rate.
3. **No parts-level builder.** Geometry is envelope + per-face surface type. There is no component catalogue, no mass budget, no cascade from component choice to system consequence.
4. **Does not show its working.** Prose assumptions, vague citations ("published CubeSat measurements put the omission at up to ~15%"), no formulas. The V&V report is paywalled to the unavailable Commercial tier.
5. Closed source, single maintainer, no changelog or version visible (version/build fields render blank).

### CubeSTEM MissionLab — `cubestem.com` (commercial, Pakistan-based)

**This is the closest competitor to the whole concept — it has the teaching layer *and* simulation.**

- Free to practise, **no account required**, work stays in-browser
- **13 runnable pilot missions** (10 disclosed at Grade 7), explicitly "educator review pending": panel orientation vs power, eclipse survival, ground-pass planning, telemetry trust, launcher-to-first-contact bottlenecks, reaction-wheel pointing, detumbling, thermal, image-and-downlink, fault diagnosis
- Lesson structure: prediction before running → two fixed comparison runs → recommendation → limits → knowledge check → reflection. Formative, never graded. Local-only completion record.
- Claimed reduced-order models: two-body + J2 propagation with ground track/eclipse/LVLH; ADCS twin with disturbance presets and baseline-vs-variant comparison; lumped thermal and battery transient; geometric ground access and contact scheduling; payload imaging and storage/downlink trade; declared fault and safe-mode experiments
- An 8-week scheme of work sequencing 8 missions
- KidSAT one-axis reaction-wheel hardware trainer as an optional extension (PKR 400k–3.5M, institutional)
- Software pricing is **quote-only** — no published price

**What MissionLab does not have:**

1. **Explicitly does not model RF.** Its own engineering hub states "atmosphere, modem and BER effects are not modelled."
2. **Heavy self-disclaimers**: every model "not calibrated, flight-qualified or correlated with measured hardware"; thermal is "not a view-factor model"; battery "not a hardware-correlated battery model."
3. **Fixed runs, not free design.** Lessons run two pre-set configurations to compare. A learner is not designing a satellite of their own from parts.
4. **School-level, not undergraduate.** Grade-7 disclosure, formative assessment, teacher-managed classes. The Digital Twin tier aims at institutions via sales.
5. Closed source; pilot stage; institutional sales motion with no self-serve price; account services were showing as temporarily unavailable.

---

## Revised gap statement

My original claim in [01-landscape-research.md](01-landscape-research.md) was:

> *There is no free, zero-install, browser-based environment where a student can design a CubeSat, see physically credible consequences across all subsystems, operate the mission, and be taught while doing it.*

**That is now too strong and must be retired.** CMAT delivers zero-install + credible coupled multi-subsystem physics. MissionLab delivers zero-install + reduced-order physics + a real teaching layer. The "empty middle" is occupied — thinly, recently, and imperfectly, but occupied.

The honest remaining wedge is narrower and more specific. Four things no one does:

1. ~~**RF link closure.**~~ **RETRACTED 2026-11-24 — see [05-review-of-technical-blueprint.md](05-review-of-technical-blueprint.md).** This survey missed the amateur-radio/operator tool tier. **groundsat.com** implements a range-varying link budget (true FSPL, ITU-R rain, galactic noise, gaseous attenuation, pointing loss, EIRP/G\_T/Eb-N0/margin) across 17,125 catalogued satellites, free and sign-up-free — better than our own v1 spec. The original reasoning, now superseded, was: Both leading tools model *when* you can see a ground station and neither models *whether the radio actually closes the link or returns the data*. CMAT omits RF entirely; MissionLab states it does not model it. **Space Systems Lab displays a link margin but hard-codes path loss as the constant `-139.2` dB** — no frequency, no slant range, no elevation dependence, no Friis. Confirmed by reading its source. For a real CubeSat this is a top-three failure mode, and "my payload generates 40 MB/orbit and I can downlink 6 MB/day" is the single most instructive result in the field. **This is a genuine, confirmed hole in the two closest competitors — and it was already v1 pillar F2.4/F2.5.**
2. **Parts-level design cascade — narrower than first stated.** CMAT configures an envelope; MissionLab runs fixed presets. **Space Systems Lab does implement a partial cascade** (verified hands-on: battery 20→60 Wh moves EPS mass 185 g→385 g, total 835 g→1095 g), so this is less novel than claimed in the first draft. But its cascade is **mass-only** — the power column is static regardless of configuration — **archetype-based rather than parts-based**, and internally inconsistent (its power-flow view hard-codes efficiency at 0.26, ignoring the user's own efficiency slider). The defensible claim is **bidirectional coupling across mass *and* power *and* link**, not coupling in general.
3. **The undergraduate band.** MissionLab aims at schools with formative, non-graded lessons; CMAT assumes domain expertise. The undergrad or club member who needs *both* instruction and output they can defend at a design review is served well by neither. That is our P2/P3, and it is the least-contested segment.
4. **Transparency.** Both are closed source. Neither shows derivations — CMAT paywalls its V&V report to a tier you cannot buy. Open source, with every number expanding to its substituted formula and citation, is unoccupied and is the one advantage a solo/small project can actually hold against a commercial one.

### What this changes in the plan

- **Keep** v1 scope: builder + mass budget, orbit, eclipse, power, **link budget**, ground passes, coupling, show-the-working, guided missions. The verification *strengthened* the case for link budget as the lead feature rather than weakening it.
- **Drop any "first of its kind" framing.** It isn't, and positioning against CMAT and MissionLab on honesty is better than a claim a visitor can falsify in one search.
- **De-prioritise thermal and attitude further.** CMAT already does both better than a v1 could, and they are not where we win. They were already v2; keep them there, and treat them as parity features, not differentiators.
- **Reconsider decay/lifetime (F2.8).** CMAT does this well and it is a common student question — but it is a parity feature. Stay v2.
- **Add SatNOGS as a validation and data source.** Real observed passes to check our geometry against; real telemetry for realistic dashboards. Also a community to reach P2/P3 users through.
- **ESA Fly Your Satellite! is a distribution channel, not a rival.** Active in 2026, university teams, pre-hardware phases — exactly P3. Same for KiboCUBE.
- **Watch CMAT.** Solo developer, paid tiers not yet live, no teaching layer. If he adds lessons, the overlap becomes serious. Conversely, a free open-source tool that complements rather than duplicates him is a plausible position.

## Method note

All findings above come from fetching the pages' static HTML. JavaScript was not executed, so no app was actually *run*. Model fidelity, numerical correctness, and whether the apps work in practice are **unverified** for CMAT, MissionLab, Space Systems Lab and Defiant. Before committing to the plan, someone should sit down and actually use CMAT's free tier and MissionLab's open practice missions — the single highest-value next research step, and one that needs a human in a browser, not a fetch.


---

## Addendum: Space Systems Lab tested hands-on (2026-11-24)

Unlike the other entries, this one was **actually run** in a browser, not just fetched.

**What it genuinely has:**
- Module 03 is a working mission simulator: six subsystem blocks (EPS/COMMS/OBC/ADCS/THERMAL/PAYLOAD),
  live telemetry (PWR/BATT/TEMP), a T+ timer, a system log, arm-able failure scenarios
  (e.g. antenna deploy failure), and a 60-second survival objective.
- A **live mass budget that cascades**: `mass = 185 + (batt_cap - 20)*5 + (solar_area - 0.03)*2000`.
  Verified by driving the sliders and re-reading the table.
- **Real power physics**: `1361 * solar_area * (solar_eff/100) * 0.8` — correct solar constant.
- Module 04 is a 5-step mission-design wizard with trade-study tables, a feasibility index, and MDD
  and certificate downloads.

**What it is not:**
- **Not 3D.** `THREE` is undefined; the main view's canvas has no WebGL context. Hand-rolled 2D
  projection. The whole app is one 36 KB inline script with no libraries at all.
- **Not a link budget.** `margin = tx_dBm + (-139.2) + antennaGain + 12 - (-115)`. Path loss is a
  frozen constant.
- **Not fully coupled.** Power column stays at 3.90 W total no matter the configuration.
- **Not consistent.** The efficiency slider is ignored by the power-flow view, which hard-codes 0.26.
- **Not a parts catalogue.** Six fixed archetypes, no component selection.

**Implication:** this is the closest thing to the proposed product that exists, it was built by one
person in a single file, and it is free and MIT-licensed. It should be treated as the real baseline
to beat — and as evidence that the engineering bar for a *credible first version* is lower than it
looks. Beating it on link closure, true coupling and transparency is tractable.
