# CubeSat Simulation Platform — Requirements

*Derived from [01-landscape-research.md](01-landscape-research.md) and
[03-link-verification.md](03-link-verification.md). Version 0.2, 2026-11-24.*

> **Competitive context (added v0.2).** Two verified competitors exist: **CMAT** (engineering-grade,
> free for students, no teaching layer, **no RF link budget**, no parts builder, closed source) and
> **CubeSTEM MissionLab** (school-level teaching missions, reduced-order physics, **explicitly does
> not model RF**, fixed preset runs rather than free design, closed source, quote-only pricing).
> The v1 scope below survives verification intact, and the link-budget pillar is *strengthened* —
> it is a confirmed hole in both. What must change is positioning: **no "first of its kind" claims.**

## 1. Product definition

A free, zero-install web platform where a student designs a CubeSat, sees physically credible consequences of every design choice across all subsystems simultaneously, operates the resulting mission in simulated time, and is taught while doing it.

**One-line positioning:** *the correct toy* — real physics with a game's accessibility,
open source, and showing its working.

**Differentiated against the two real competitors by:** (1) closing the **RF link** and the
data-volume question that both omit; (2) a **parts-level design cascade** rather than envelope
config or fixed presets; (3) aiming at the **undergraduate/club band** that sits between
MissionLab's schools and CMAT's experts; (4) **open source with every derivation visible.**

### Non-goals (explicit)

- Not a replacement for GMAT / 42 / Basilisk / STK for professional mission analysis.
- Not a flight-software development environment (NOS3 owns that).
- Not a hardware kit or a companion app to one.
- Not a digital twin of any specific real satellite.
- Not a launch-procurement or regulatory-compliance tool.
- Not a claim to be first, unique, or better-validated than CMAT. We compete on the link budget,
  the design cascade, transparency and the undergraduate band — not on breadth of physics.

## 2. Target users

| # | Persona | Context | Needs | Success looks like |
|---|---|---|---|---|
| P1 | **Curious beginner** (14–18) | No orbital mechanics. Found us via search or social. | Immediate visual payoff; no jargon wall; no signup to start | Builds something that orbits within 5 minutes; comes back |
| P2 | **Undergraduate engineering student** (primary) | Taking a space-systems course, or self-teaching for a club. Cannot afford Simulink or a kit. | Correct equations, visible working, subsystem budgets, exportable results for coursework | Completes a guided mission and can explain her power margin |
| P3 | **University CubeSat club member** | On a real team, pre-hardware. Needs to sanity-check a concept and onboard juniors. | Trade-space exploration, shareable designs, numbers they can defend | Uses a design export in a CDR slide |
| P4 | **Educator / club lead** | Teaching 20–40 students with no lab budget. | Assignable missions, progress visibility, no install on lab machines | Sets our mission as homework |

**Primary design target is P2.** P1 is the funnel; P3/P4 are the retention and credibility multipliers.

## 3. Functional requirements

Priority: **M** = must have (v1), **S** = should have (v1 if time), **C** = could have (v2+).

### 3.1 Design — the CubeSat builder

| ID | Requirement | Pri |
|---|---|---|
| F1.1 | Choose form factor: 1U, 1.5U, 2U, 3U, 6U. Drives mass/volume/power envelope limits per CubeSat Design Spec | M |
| F1.2 | Select components from a seeded parts catalogue per subsystem: structure, EPS (battery, solar panels — body-mounted vs deployable), OBC, COMM (radio band, antenna type, Tx power), ADCS (passive magnetic → magnetorquers → reaction wheels), payload (camera, radio beacon, sensor suite) | M |
| F1.3 | Each part carries real, cited parameters: mass, peak/idle power, data rate, efficiency, cost band, operating temp range | M |
| F1.4 | Live **mass budget** with margin vs form-factor limit, and volume packing check | M |
| F1.5 | 3D view of the assembled satellite with deployables; exploded view | S |
| F1.6 | Design validity checker with *explained* errors ("mass 4.3 kg exceeds the 4.0 kg 3U limit — the deployable panels add 180 g each") | M |
| F1.7 | Save / load / fork / share a design via URL | S |
| F1.8 | Custom-part entry for P3 users with their own hardware | C |

### 3.2 Simulate — the physics core

**This is the differentiator. It must be right, and it must show its working.**

| ID | Requirement | Pri |
|---|---|---|
| F2.1 | **Orbit propagation** — SGP4 via `satellite.js`, plus a J2-perturbed Keplerian mode. Orbit chosen by altitude + inclination, or by preset (ISS deployment, dawn-dusk SSO, generic LEO) | M |
| F2.2 | **Eclipse / illumination geometry** — conical shadow model; beta angle; illuminated fraction per orbit | M |
| F2.3 | **Power simulation** — solar flux × panel area × efficiency × cos(incidence) × degradation; load profile by operating mode; battery state of charge over N orbits with depth-of-discharge limits; **energy balance verdict and margin** | M |
| F2.4 | **Link budget** — Friis: EIRP, free-space path loss, pointing/polarisation/atmospheric losses, G/T, required Eb/N0, resulting **margin in dB** and achievable data rate. Per-pass, slant-range-varying | M |
| F2.5 | **Ground station access** — pick stations (or add one by lat/lon), compute pass times, durations, max elevation, total daily contact minutes, and **data downlink volume vs payload data generated** | M |
| F2.6 | **Thermal** — lumped single-node (then multi-node) model: solar + albedo + Earth IR + internal dissipation vs radiated; min/max temps per orbit vs component limits | S |
| F2.7 | **Attitude dynamics** — rigid-body with inertia tensor computed from the actual layout; gravity-gradient, magnetic, aerodynamic and SRP torques; ADCS actuator authority; pointing error and settling time | S |
| F2.8 | **Orbital lifetime / decay** — drag-driven, with atmospheric density model; de-orbit compliance check (25-year rule) | S |
| F2.9 | **Coupling** — every subsystem reads the single shared design state. Changing payload power must visibly cascade into SoC, battery sizing, mass, inertia, and ADCS sizing | **M** |
| F2.10 | **Show the working** — every computed number expandable to formula + substituted values + units + source citation | **M** |
| F2.11 | Deterministic, seeded runs; same design ⇒ same result | M |
| F2.12 | Monte Carlo / parameter sweep over a design variable | C |

### 3.3 Operate — mission mode

| ID | Requirement | Pri |
|---|---|---|
| F3.1 | Time-accelerated mission clock (1×, 60×, 600×) with pause/scrub | M |
| F3.2 | 3D globe: orbit track, ground track, satellite, ground-station visibility cones, day/night terminator | M |
| F3.3 | Live telemetry dashboard: SoC, temps, attitude, mode, data buffer, link status — as a real ground station would show it | M |
| F3.4 | Mode scheduling: the student commands when to image / downlink / charge / idle, and must live within the budgets | M |
| F3.5 | Failure injection: battery degradation, stuck deployable, radio dropout, tumbling after deployment, single-event upset | S |
| F3.6 | Mission scoring: data returned, uptime, margins maintained, failures survived | S |
| F3.7 | Pass-by-pass operations log, exportable | C |

### 3.4 Learn — the teaching layer

| ID | Requirement | Pri |
|---|---|---|
| F4.1 | Guided mission arc, ~6 progressive missions: *First Orbit* → *Keep the Lights On* (power) → *Phone Home* (link) → *Don't Melt* (thermal) → *Point at Something* (ADCS) → *Full Mission*. Each unlocks the matching simulator panel | M |
| F4.2 | Every panel has a concept explainer — what the subsystem is, which equation governs it, why it matters — written at P1/P2 level, cross-referenced to NASA CubeSat 101 chapters | M |
| F4.3 | **Diagnostic feedback on failure**: not "mission failed" but "your SoC hit 12% during eclipse on orbit 4. You're drawing 4.2 W in imaging mode but averaging 2.8 W generated. Either cut imaging duty cycle to 40% or add deployable panels." | **M** |
| F4.4 | Glossary with inline hover definitions for every acronym | M |
| F4.5 | Progress tracking; resume where you left off | S |
| F4.6 | Design report export (PDF/Markdown) with all budgets — coursework-submittable | S |
| F4.7 | Educator mode: assignable missions, class progress view | C |
| F4.8 | Reference designs of real CubeSats (EQUiSat, Dellingr, STF-1) loadable to inspect | S |

### 3.5 Platform

| ID | Requirement | Pri |
|---|---|---|
| F5.1 | Works in a modern browser, no install, no plugin, no account to start | M |
| F5.2 | Anonymous local persistence; optional account only to sync/share | S |
| F5.3 | Shareable design permalink | S |
| F5.4 | Responsive: full experience ≥1024px, usable read/learn experience on mobile | S |
| F5.5 | Offline-capable after first load (PWA) — matters for low-bandwidth users | C |

## 4. Non-functional requirements

| Area | Requirement |
|---|---|
| **Physics credibility** | Every model documented with its equation, assumptions and limits. Key outputs cross-validated against NASA GMAT / 42 / published CubeSat papers; validation results published in-app. A "model fidelity" note on every panel stating what is *not* modelled. |
| **Performance** | Design-panel budget recalculation < 100 ms (feels live). 30 days of orbit propagation < 2 s. 3D view ≥ 30 fps on integrated graphics. |
| **Accessibility** | WCAG 2.1 AA. Keyboard navigable. Not colour-only encoding (margins must not rely on red/green alone). |
| **Cost** | Must be free to users and cheap to run — client-side computation wherever possible; static hosting as the default deployment. No Cesium Ion account requirement. |
| **Honesty** | Never present a simplified model as exact. Never gamify away a real constraint. |
| **Openness** | Open source. Parts catalogue data cited and separable from code. |
| **Internationalisation** | English v1; strings externalised so translation is possible. |

## 5. Architecture direction

```
┌─────────────────────────────────────────────────┐
│  UI layer                                       │
│  Builder · Simulator panels · Globe · Lessons   │
├─────────────────────────────────────────────────┤
│  Design state (single source of truth)          │
│  immutable, serialisable, URL-encodable         │
├─────────────────────────────────────────────────┤
│  Physics engine — pure functions, no UI deps    │
│  orbit │ power │ link │ thermal │ attitude      │
│  each: (design, orbit, time) → result + trace   │
├─────────────────────────────────────────────────┤
│  Data: parts catalogue · ground stations ·      │
│         orbit presets · reference designs       │
└─────────────────────────────────────────────────┘
```

Decisions to make, with current leaning:

- **Physics in pure TypeScript modules**, framework-agnostic, 100% unit-tested against hand-worked textbook examples. Every function returns both a value and a *trace* (the substituted formula) so F2.10 is free rather than bolted on.
- **Client-side only** for v1. No backend ⇒ free static hosting, no scaling cost, works offline. Accounts/sharing can come later via a thin service.
- **Web Workers** for long propagation runs so the UI never blocks.
- **`satellite.js`** for SGP4 (mature, small, correct). **Three.js or CesiumJS** for the globe — Cesium is richer but heavier; prototype both before committing.
- **Validation harness** as a first-class part of the repo, not an afterthought: a `validation/` suite comparing our outputs to GMAT/42 reference cases, with the deltas published.

## 6. Scope for v1 (the demonstrable slice)

Build these and nothing else:

1. Form factor + parts catalogue builder with live **mass** budget (F1.1–F1.4, F1.6)
2. Orbit selection, SGP4 propagation, eclipse geometry (F2.1, F2.2)
3. **Power simulation** with battery SoC over orbits and a margin verdict (F2.3)
4. **Link budget** + ground-station passes and daily data volume (F2.4, F2.5)
5. Full coupling between the above (F2.9) and show-the-working traces (F2.10)
6. 3D globe with orbit/ground track and visibility (F3.2) + telemetry dashboard (F3.3)
7. First three guided missions with diagnostic feedback (F4.1–F4.4)

Deferred to v2: thermal, attitude dynamics, failure injection, decay/lifetime, educator mode, accounts.

**Rationale:** power + link + access is where CubeSat designs actually fail, it is the trade-space students most need to feel, and it is fully computable client-side. It also delivers the coupling story — the one thing no competitor has — with the least physics surface area.

## 7. Validation criteria for the build phase

- A hand-worked power budget for a known 3U mission reproduces our output within 5%.
- A link budget for a published CubeSat downlink reproduces its stated margin within 1 dB.
- Pass times for a known TLE + ground station match an independent predictor within 30 s, and
  ideally match a real **SatNOGS** observation record.
- Spot-check our power and eclipse outputs against **CMAT's** free tier for an identical input case;
  document and explain any divergence rather than hiding it.
- P1 persona test: a student with no background reaches a visibly orbiting satellite in under 5 minutes, unaided.
- P2 persona test: a student completes *Keep the Lights On* and can state, unprompted, why their design failed and what fixed it.

## 8. Open questions

1. **Cesium vs Three.js** — richness vs bundle size and licence friction. Prototype needed.
2. **Parts catalogue sourcing** — real vendor parts (credible, but datasheet-accuracy and permission questions) vs representative archetypes (safe, less motivating). Leaning: archetypes with "typical of" citations in v1.
3. **How far to push realism before it becomes a wall for P1?** Proposed answer: progressive disclosure — every panel has a simple verdict on top and the full derivation one click down.
4. ~~**ESA Academy and KiboCUBE Academy** — confirm what they offer.~~ **ANSWERED:** ESA *Fly Your
   Satellite!* is live at <https://education.esa.int/satellites/> and active through 2026 (ESTEC
   team test Nov 2026, July 2026 test window, Design Booster call). It is a university-team
   programme — a **distribution channel for P3/P4, not a competitor.** Same for KiboCUBE.
   Remaining sub-question: is curriculum alignment or outreach worth pursuing, and when?
5. **Should we integrate SatNOGS?** It is a real global network of open-source ground stations with
   public observation data. Two uses: (a) validate our pass geometry against genuinely observed
   passes; (b) feed realistic telemetry into the dashboard. Also a community route to P2/P3 users.
   Cost is an API dependency and a network call, against real credibility. Leaning: use it offline
   for validation in v1, consider live integration in v2.
6. **How do we position against CMAT without being adversarial?** It is free for students, solo-built,
   and genuinely good. A complementary open-source tool that closes the link budget and teaches is
   more defensible than a competing clone. Worth considering whether to cite it as prior art.
7. **Does an accuracy claim create liability** if a real team uses v1 to make a hardware decision? Mitigation: prominent fidelity notes, and an explicit "not for flight decisions" statement.
