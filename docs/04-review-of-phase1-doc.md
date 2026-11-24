# Review — "CubeSat Simulation & Learning Platform: Research and Product Discovery"

*Reviewed 2026-11-24, against the independently verified findings in
[03-link-verification.md](03-link-verification.md) plus fresh hands-on testing of Space Systems Lab.*

## Overall assessment

**Structurally strong, factually compromised in two places, and wrong on one priority call.**

The document is a genuine improvement on my own first pass. Three things in it are better than what
I produced:

- **§4.2 (simulations must be interconnected)** is the single best idea in the whole project. The
  worked eclipse → generation drop → discharge → safe mode → telemetry alert chain is exactly the
  right articulation of the product thesis, and it is more concrete than my "coupling" framing.
- **Finding 1 ("we should not position our product as the first")** is correct and arrives at the
  same retraction I had to make after verification. Good instinct.
- **§6.1's rule — "We should not classify a feature as missing just because it is not advertised.
  It needs to be tested."** This is precisely right.

The irony is that §6.1's rule is the one the document itself breaks. The §3 comparison matrix is
populated entirely from marketing copy, and two of its six rows describe products that do not
survive contact with a browser.

---

## Critical corrections

### 1. NanoSatPlay does not exist — remove it entirely

`nanosatplay.com` fails DNS resolution (`getaddrinfo ENOTFOUND`). There is no site.

The document lists it as competitor #6 with five specific features (visual CubeSat designer, orbit
simulator, AI design assistant, interactive tutorials, knowledge assessments), gives it a row in the
§3 matrix with three "Yes" ratings, and concludes it is **"close to the intended product
direction."** All of this is fabricated. It is not a thin or unverifiable product — the domain does
not resolve.

**Action: delete the entry, the matrix row, and the verdict.** This matters beyond one bad row: it
is a live example of why §6.1's testing rule exists.

### 2. Defiant Smallsat is the matrix's top scorer and is probably an AI-generated demo

In §3 it is the **only platform scoring "Yes" in all six columns** — which positions it as the
market leader and implicitly as the hardest competitor to beat.

What verification found: hosted on `abacusai.app` (the Abacus.AI generated-app hosting domain,
unnamed anywhere on the page); no creator, company, team, dates, changelog or version; obfuscated
contact address; two advertised features marked as not yet built; everything behind a signup wall so
nothing is verifiable. The document also says "1U–12U" where the page says 1U–6U — a small
discrepancy, but a tell that the feature list was taken on trust.

**Action: keep it on the §6.1 test shortlist, but reclassify it from "competitor benchmark" to
"verify this is a real product."** Do not let a clean sweep of ticks from an unverified demo shape
the MVP scope.

### 3. Space Systems Lab is not 3D, and its ADCS is single-axis

The matrix gives it "3D design: Yes". I loaded it and inspected the runtime:

- `THREE` is `undefined`. No Cesium. No `satellite.js`. The entire application is **one 36 KB inline
  script with no libraries.**
- The main "3D View" canvas has **no WebGL context** — it is a hand-rolled 2D projection. The two
  WebGL canvases present are incidental 300×150 defaults.
- Module 02's attitude view is labelled "2D Body Frame" — planar single-axis rotation, not three-axis
  attitude.

**Action: change "3D design" to "Pseudo-3D (2D canvas)" and "ADCS" to "single-axis".**

### 4. PyCubed is rated "Very high" relevance; it is neither a simulator nor currently active

PyCubed is CircuitPython **flight firmware for a physical radiation-tested board** — not a
simulation library, and nothing in it runs in a browser. Its GitHub org's newest repo update is
**December 2024**, with most repos last touched 2021–2023.

**Action: downgrade to "Medium — hardware reference only", and note the low activity.** It is a good
source of realistic subsystem parameters for the parts catalogue. It is not a dependency.

---

## The one significant priority error

**Communication (Module 5) and Ground Station (Module 6) are rated "Medium" MVP priority. They
should be the lead feature.**

The RF link is the only capability confirmed absent or fake across *every* real competitor:

| Platform | RF link handling | Evidence |
|---|---|---|
| **CMAT** | **Omitted entirely.** Models ground *access* (pass times, elevation masks) but no radio: no EIRP, path loss, G/T, Eb/N0, margin or data rate | Full app-page feature list |
| **CubeSTEM MissionLab** | **Explicitly not modelled.** Its own engineering hub states "atmosphere, modem and BER effects are not modelled" | Their own disclaimer |
| **Space Systems Lab** | **Cosmetic.** It *displays* a link margin, computed as `tx_dBm + (-139.2) + antennaGain + 12 - (-115)` | Read from its source |

That third row deserves emphasis. **Path loss is the hard-coded constant `-139.2` dB.** It does not
vary with frequency, slant range, or elevation. There is no Friis equation and no range variation
across a pass. The only inputs are transmit power and a binary antenna-failure gain. It looks like a
link budget and is a single arithmetic line.

So the most instructive result in CubeSat engineering — *"my payload generates 40 MB per orbit and I
can downlink 6 MB per day, so the mission does not close"* — **cannot currently be produced by any
platform in the comparison.** That is the sharpest, best-evidenced differentiator available, and the
document files it under Medium.

**Action: promote Modules 5 and 6 to High/Must, and make link closure the headline capability.**

---

## A correction to my own earlier claim

Last turn I said a "parts-level design cascade" was something no competitor had. **Hands-on testing
shows Space Systems Lab already does part of it.** Driving its battery-capacity slider from 20→60 Wh
moved EPS mass 185 g→385 g and the total 835 g→1095 g, via
`mass = 185 + (batt_cap - 20) * 5 + (solar_area - 0.03) * 2000`. Its power generation is real
physics too: `1361 * solar_area * (solar_eff/100) * 0.8`, using the correct solar constant.

So that differentiator is **weaker than I stated** and needs restating precisely. What SSL's cascade
is *not*:

- **Mass-only.** The power column stays fixed at 3.90 W regardless of configuration. Doubling panel
  area changes mass and nothing else in the budget.
- **Archetype-based, not parts-based.** Six hardcoded subsystem blocks, no component catalogue.
- **Internally inconsistent.** The power-flow view hardcodes efficiency as `0.26`
  (`1361*solar_area*0.26`), ignoring the efficiency slider the user just moved. That is a bug.

The honest differentiator is therefore **bidirectional, parts-level coupling across mass *and* power
*and* link**, not "coupling" in general. Narrower, but defensible and now evidence-backed.

---

## Technical flaw in §5.4

Two recommendations in the architecture section contradict each other:

> "start with the simulation engine running locally in the browser wherever possible"

> "we can evaluate existing libraries such as Basilisk, GMAT and Orekit rather than rewriting
> established engineering algorithms"

**These are incompatible.** Basilisk is Python/C++. GMAT is a desktop C++ application. Orekit is
Java. **None of them runs client-side in a browser.** Adopting them means a server backend — which
destroys the zero-cost, zero-install advantage the same paragraph is arguing for. Practical WASM
ports do not exist for these.

**Resolution:**
- **In-browser:** `satellite.js` for SGP4. Hand-port the textbook equations for power, link, thermal.
  These are undergraduate-level formulas, not "established engineering algorithms" needing reuse.
- **Offline:** use GMAT / Basilisk / 42 as **validation references** — generate reference cases,
  compare our outputs, publish the deltas. That converts them from an impossible dependency into a
  credibility asset.

---

## Gaps in the comparison matrix

The §3 matrix is missing four columns that decide the product:

1. **Thermal** — CMAT's strongest feature (per-face optical properties α/ε, hot/cold case sizing,
   flux by source). Omitting the column hides how far ahead it is, and makes thermal look like
   available ground when it is not.
2. **Transparency / shows its working** — where the actual opening is. CMAT does not show formulas
   and paywalls its V&V report to a tier that cannot currently be purchased. MissionLab discloses
   assumptions in prose but is closed source. Both are closed.
3. **Pricing and licensing** — §6.1 asks for it and deliverable D2 promises it, but the matrix has no
   column. Relevant facts: CMAT free tier is 3 analyses/day, student tier 10/day free for 12 months,
   paid tiers $199–$490/yr marked "coming soon, not available to buy"; MissionLab is quote-only with
   no published price; SSL is MIT-licensed and free.
4. **Open vs closed source** — the one advantage a small project can hold against a funded one.

---

## Process concerns

**The gate is too heavy.** Seven deliverables (D1–D7) plus 20–28 interviews before a line of code is
a lot of ceremony for what appears to be a solo or small-team project. The main risk to this project
is not building the wrong thing; it is **never shipping anything.**

The recommendation "do not start coding yet" is right in spirit and wrong in sequence. **Students
cannot tell you what they want from a thing that does not exist.** Asking "which subsystem is hardest
to understand?" in the abstract produces vague answers; putting a rough power-budget slider in front
of someone and watching where they get confused produces specific ones.

**Suggested amendment:** build a deliberately throwaway prototype of *one* coupled slice — payload
power → battery SoC → eclipse → link closure — in 2–3 days, then run the interviews **with it on
screen as a stimulus.** This does not violate the document's logic; it strengthens Phase 2. The
prototype is research apparatus, not the MVP.

**Other process notes:**

- **NFR-03 (desktop, tablet and mobile)** — full mobile parity for a tool built on sliders, charts
  and a 3D view is expensive and probably wrong. Scope it: full experience ≥1024 px, read-and-learn
  on mobile.
- **No licensing decision anywhere in the SRS**, despite open-source being a live differentiator
  against two closed competitors. Add it as an NFR.
- **No mass budget in the functional requirements.** FR-03 ("configure satellite components") does
  not capture the budget cascade that §4.2 correctly identifies as the whole point. Add an explicit
  FR for coupled mass/power budgeting with margin against form-factor limits.
- **No resourcing, timeline or team size** anywhere, which is what should actually determine how many
  of D1–D7 are worth writing.

---

## What to change, in priority order

1. **Delete NanoSatPlay.** It does not exist.
2. **Promote Communication + Ground Station to Must.** Link closure is the best-evidenced gap.
3. **Reclassify Defiant Smallsat** from benchmark to "verify it is real."
4. **Fix the §5.4 contradiction** — satellite.js in-browser; GMAT/Basilisk/Orekit offline as
   validation references only.
5. **Correct Space Systems Lab's row** — pseudo-3D, single-axis ADCS, cosmetic link margin,
   mass-only cascade.
6. **Add four matrix columns** — thermal, transparency, pricing, licence.
7. **Downgrade PyCubed** to a parameter source.
8. **Insert a throwaway prototype before the interviews**, as research apparatus.
9. **Add FRs** for coupled mass/power budgeting and an NFR for licensing.

## What to keep unchanged

§4.2 in full. Finding 1. Finding 2. The phased roadmap structure. The §6.1 testing checklist —
which is excellent and should simply be applied to the entries that bypassed it. The decision to
target undergraduates first. The honesty caveat on the matrix.

## Method note

Space Systems Lab findings above come from actually loading and driving the page: runtime inspection
of libraries and canvas contexts, reading the inline source, and moving sliders and re-reading the
budget table. CMAT, MissionLab and Defiant assessments remain **static-fetch only — none has been
run.** That hands-on test is still the highest-value outstanding research task, and the document is
right to call for it.
