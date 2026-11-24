# Review — "Landscape Research, Requirements Specification, and Technical Blueprint"

*Reviewed 2026-11-24. Includes independent verification of its physics benchmarks and hands-on
testing of a competitor it surfaced.*

## Verdict

**The best document in this project so far, and it contains one finding that changes our strategy.**

It is quantitatively grounded in a way the earlier documents were not — I spot-checked its physics
and it holds up. It also surfaced competitors we had missed, one of which **substantially occupies
the wedge we had chosen**. That is the most valuable thing any document here has produced, and it is
bad news worth acting on.

Two caveats pull against it: **its citation integrity is weak in exactly the places that carry the
most weight**, and **its scope and timeline are not credible** as written.

---

## What I verified and confirms out

I independently recomputed its headline benchmarks for the 525 km reference mission:

| Claim | Document | My computation | |
|---|---|---|---|
| Orbital period | 95.13 min | 95.13 min | ✅ |
| Orbital velocity | 7.599 km/s | 7.598 km/s | ✅ |
| Max eclipse (β=0) | 35.68 min | 35.68 min | ✅ |
| Slant range at 10° el | 1,755.9 km | 1,756.5 km | ✅ |
| Velocity 400 / 600 km | 7.67 / 7.56 km/s | 7.669 / 7.558 | ✅ |
| Gravity at 380–400 km | ~8.75 m/s² | 8.68–8.73 m/s² | ≈ (slightly high) |

**The physics is real.** That is a meaningful signal about the document's overall care, and it
separates this from the earlier drafts.

Other genuine strengths:

- **The failure-mode grounding is the strongest argument in the entire project.** Swartwout's and
  Langer's census work — 47% of documented failures from configuration and interface breakdowns
  (comms 27%, EPS 14%, processors 6%), a further 33% never contacted after deployment, >40% of
  first-time university CubeSats failing early, success rates climbing sharply on a team's second and
  third missions — is the evidence that *coupling and integration practice* is the product, not
  orbit visualisation. Every previous document asserted coupling mattered. This one proves it.
- **The misconception table** (zero-G, higher orbit = faster, space is cold, visibility = downlink,
  sharper camera = more science, telemetry = truth) is directly implementable pedagogy, and the
  hidden-truth / noisy-sensor / estimator-output split is exactly right.
- **One physics core with three disclosure tiers, never a "toy physics fork"** — correct, and the
  discipline that keeps a product like this coherent.
- **MicroPython-WASM (~303 KB, instant start) over Pyodide (7–11 MB, multi-second start), with
  Pyodide lazy-loaded only for Tier 3 notebooks.** Genuinely sharp engineering judgement.
- **CDS Rev. 14.1 specifics** — 2.00 kg/U (vs. the legacy 1.33 kg/U still widely quoted), CoG limits,
  ≥3 inhibits, 45-min RF silence, TML ≤1.0% / CVCM ≤0.1%, rails ≥8.5 mm. Real, checkable, and the
  note that a dispenser ICD supersedes generic CDS tables is the kind of detail practitioners respect.
- **Guest Mode, COPPA/FERPA/GDPR-K posture, WCAG 2.2 AA, and machine-readable provenance stamps**
  carrying engine version, assumptions and a non-qualification notice. Professional.

---

## The finding that changes our strategy

The document lists "Groundtracks" in its competitive matrix as having *"SGP4/numerical orbit, passes,
link budget, eclipse, decay."* The name is wrong — the tool is **groundsat.com** — but the substance
is right, and I ran it and read its compiled source.

**Groundsat implements a more complete RF link budget than our own v1 specification.** From its
bundle:

- True range-varying free-space path loss: `20·log₁₀(4π · rangeKm·10³ · f / c)`
- Boltzmann constant `−228.6` dB, with EIRP, G/T, C/N₀, Eb/N₀ and margin
- **ITU-R P.618-style rain attenuation** — rain height, rain rate, path tilt, elevation-dependent
  slant path, and the latitude correction term for |lat| < 36°
- Elevation-scaled gaseous/atmospheric attenuation
- **Galactic background noise**: `2.7 + 20·(408×10⁶/f)^2.55`
- Noise figure → noise temperature: `290·(10^(NF/10) − 1)`
- Dish gain from diameter and efficiency, 3 dB beamwidth `70λ/D`, and pointing loss `12·(θ/θ₃dB)²`
- Polarisation handling

It carries **17,125 catalogued satellites** (including CubeSat and SatNOGS groups), 178 ground
stations (31 agency, 147 commercial), pass prediction, and per-satellite RF data. **Free, no
sign-up, SGP4 running locally in the browser.**

**What it does not have** — verified by probing its bundle, all returning zero hits: `batter*`,
`stateOfCharge`, `solarPanel`, `powerBudget`, `massBudget`, `thermal`, `eclipse`, `emissivity`,
`absorptivity`, `reactionWheel`, `magnetorquer`, `detumble`, `lesson`, `tutorial`, `quiz`,
`curriculum`.

It answers *"can I hear this existing satellite from my station?"* It cannot answer *"will the
satellite I just designed close its mission?"*

Separately, **OrbitSmith** (orbitsmith.net, by Seita Iizuka — ex-JAXA, Astroscale ELSA-d programme
manager) is real and does a **single-point screening link budget** at 5° elevation:
`margin = (EIRP + G/T − L_fs − L_band − 2 dB + 228.6) − (4.5 + 10·log₁₀ R_b)`, with nine named loss
categories, alongside quick checks for power, orbit lifetime, mass and thermal. It self-describes as
*"not an operational tool"* using *"OrbitSmith screening conventions, not standards."*

### What this means

**Our wedge #1 — "nobody closes the RF link" — is now largely false, and I am retracting it.**

My previous claim rested on CMAT (omits RF), MissionLab (states it does not model RF) and Space
Systems Lab (hard-codes path loss at −139.2 dB). That survey missed the amateur-radio/operator tool
tier entirely. Groundsat does range-varying link budgets better than we planned to, and OrbitSmith
does screening-grade ones.

**Three consequences:**

1. **Do not chase Groundsat on RF fidelity.** The new document's FR-PHY-05 — atmospheric,
   ionospheric, rain, polarisation and pointing losses — is precisely chasing them on their home
   turf, and would burn months to arrive second. Build an RF model that is **good enough to teach the
   trade** (FSPL, elevation mask, EIRP, G/T, Eb/N₀, margin, data volume) and stop there.
2. **The real wedge is narrower and now well-evidenced: the design → consequence loop, plus
   teaching.** No tool takes *a satellite you configured yourself* and propagates its consequences
   through mass, power, eclipse, link closure and delivered data volume, while teaching you why it
   failed. Groundsat has the RF and the catalogue but no design and no pedagogy. CMAT has the coupled
   physics but no teaching and no RF. MissionLab has the teaching but fixed presets and no RF.
   SSL has a mass cascade and lessons but fake RF and a static power budget.
3. **The scarce asset is the diagnostic explanation, not any single physics model.** Every physics
   model in this space is now a commodity available free somewhere. The thing nobody sells is *"your
   SoC hit 12% on orbit 4 because imaging draws 4.2 W against 2.8 W generated — cut duty cycle to 40%
   or add deployables."*

---

## Citation integrity — the document's real weakness

**Reference 33 is `[unknown_url](http://docs.google.com/unknown_url)` — a dead placeholder.**

That matters enormously, because reference 33 is the citation for nearly every computed engineering
number in the document:

- The entire 525 km benchmark suite
- All transient thermal results (−82.3 °C steady-state, −1.4 to +23.3 °C with C_th ≈ 1,170 J/K, the
  1.5 W heater drawing 0.39 Wh/orbit and the −0.5 °C residual dip)
- All power results (2.32 / 24.05 / 52.91 Wh/orbit for tumbling 1U / 3U dual-wing / 6U dual-wing)
- All decay results (6.04–6.41 years at 550 km; 600 km falling from 13.34 years to 0.95 with a 0.5 m²
  drag sail)
- The cloud unit economics
- Doppler ranges and much of the misconception table

I verified four of these independently and they are **correct**, so these are almost certainly the
document's own calculations. But they are *presented as sourced* when the source is a broken link.

**Fix:** relabel them honestly as own computation, and publish the working — the spreadsheet or
notebook, with equations and constants. Given the "show your working" principle this product is
built on, the research behind it should meet the same standard.

**Reference 32 is `github.com/dlamarre-dev/Perigee/blob/master/CLAUDE.md`** — an AI-agent instruction
file in an unrelated repository. It is the authority for **three load-bearing architectural claims**:
the CelesTrak March 2026 rate-limiting policy, the Cloudflare Worker + R2 caching design, and the
CesiumJS bundle-size and Cesium ion pricing analysis. None of those should be decided on that basis.
Verify against CelesTrak's own policy page and Cesium's own pricing page before they drive
architecture.

**Reference 21** is a Medium blog post, cited for the WebGPU/Three.js performance decision.
**Reference 3** is a Reddit post, and it is the sole citation for the tool that appears in the
competitive matrix under the wrong name.

To be clear about proportion: the document's *primary* sources are excellent — Swartwout's JoSS
paper, the Cal Poly CDS Rev. 14.1 PDF, NASA's 2026 SST-SOA, the NOS3 wiki, CCSDSPy docs. The problem
is concentrated in the secondary and computed material, and it is fixable.

---

## Scope and timeline are not credible

**Phase 0 is specified as six weeks** and calls for a Rust/WASM kernel covering SGP4 + RK4/DOP853 +
WGS84 J2–J4 + NRLMSISE-00 drag + Sun/Moon third-body + EPS with OCV and 0 °C interlock + multi-node
transient thermal ODEs + 6-DoF ADCS with B-dot and reaction-wheel saturation + RF link + ballistic
decay — **validated to under 1 metre over one day against Orekit 13 or GMAT.**

That is not a six-week task. For an experienced astrodynamics engineer it is several months; the
validation gate alone could consume Phase 0 entirely.

The risk register lists "Scope Creep Into a General Space-Agency Suite" as High/High — correctly —
but **the baseline scope already is the creep.** CCSDS packet inspection, XTCE export, LTI 1.3
Advantage across four LMSs, WebSerial hardware-in-the-loop, Monte Carlo notebooks, SPARTA-inspired
spoofing scenarios and NOS3/Basilisk export templates are each a project.

**Three specific recommendations:**

1. **Relax the validation target from <1 m to <1 km over one day.** Matching GMAT to a metre requires
   a full gravity field, a real atmosphere driven by live space weather, and SRP with shadow
   modelling. At the fidelity a student needs, <1 km teaches identically and is reachable with J2 and
   simple exponential drag. This one number may be worth months.
2. **Reconsider Rust→WASM for v1.** The garbage-collection argument is about 60 fps *rendering*, not
   physics; a coupled kernel stepping at 1–10 Hz in a Web Worker does not need Rust. Rust adds a
   toolchain, a language and a JS↔WASM serialisation boundary *before a single equation has been
   validated*. TypeScript reaches a validated core sooner, and hot paths can be ported later if
   profiling demands it. **Counter-consideration, stated fairly:** if you already write Rust
   comfortably, this flips, and the `sgp4` crate's accuracy claims are a real asset.
3. **State the team.** Nowhere does the document say who builds this, how many people, with what
   skills, at what time commitment. Every week-numbered phase is unassessable without that, and it is
   the single piece of information that should determine how much of this plan is real.

---

## What to change

1. **Retract the RF wedge.** Groundsat already does range-varying link budgets better than our spec.
   Reposition on the design→consequence loop plus diagnostic teaching.
2. **Cap RF fidelity deliberately.** Drop atmospheric/ionospheric/rain/polarisation from FR-PHY-05.
   FSPL + elevation mask + EIRP + G/T + Eb/N₀ + margin + data volume is enough to teach the trade.
3. **Fix reference 33** — relabel as own computation and publish the working.
4. **Re-verify references 32, 21 and 3** against primary sources before letting them drive
   architecture; correct "Groundtracks" to **groundsat.com** in the matrix.
5. **Relax validation to <1 km**; keep the cross-validation discipline, drop the metre.
6. **Default to TypeScript** unless Rust is already a strength.
7. **Cut Phase 2–3 scope hard.** CCSDS/XTCE, LTI 1.3, WebSerial HIL and Monte Carlo are each
   post-traction work, not roadmap items for an unvalidated product.
8. **Add team and resourcing** before any week-numbered plan.

## What to keep

The failure-mode grounding. The misconception table. Single core, three tiers, no toy fork. Guest
Mode, privacy posture and WCAG 2.2 AA. Provenance stamps. The MicroPython-over-Pyodide call. The CDS
compliance engine. The PDEODE predict-before-run loop. The roadmap's gated *structure*, with the
content inside each gate cut by roughly half.

## Updated competitive map

| Tool | Design your own? | Coupled bus physics | RF link | Teaching | Free |
|---|---|---|---|---|---|
| **Groundsat** | ✗ catalogue only | ✗ none | ✅ **best in class** (ITU rain, galactic noise, pointing) | ✗ | ✅ |
| **OrbitSmith** | partial | quick checks | ~ single-point screening @5° | ✗ | ✅ |
| **CMAT** | envelope config | ✅ orbit/thermal/power/attitude | ✗ none | ✗ | ✅ students |
| **MissionLab** | ✗ fixed presets | ✅ reduced-order | ✗ explicitly not modelled | ✅ 13 missions | ✅ practice |
| **Space Systems Lab** | partial (mass only) | partial (power static) | ✗ hard-coded −139.2 dB | ✅ 4 modules | ✅ MIT |
| **Our target** | ✅ parts-level | ✅ mass→power→link→data | good-enough | ✅ diagnostic | ✅ |

**The empty column is the last one read across, not any single cell.** No row has design, coupling
and teaching together — and that, not the link budget, is what we build.

## Method note

Groundsat findings are from loading the site and reading its compiled bundle. OrbitSmith is from
fetched page text. Vesper (403) and the Reddit source for Groundsat could not be retrieved. CMAT,
MissionLab and Defiant remain **never actually run** — still the outstanding research task.
