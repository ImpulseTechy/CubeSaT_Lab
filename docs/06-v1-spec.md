# v1 Specification — "Does My CubeSat Close?"

*Version 1.0, 2026-11-24. Derived from docs 01–05. This is the build contract: if it is not in
§2, it is not in v1.*

---

## 1. The product in one sentence

**You design a CubeSat, and we tell you whether it closes — in mass, in power, and in data — and
exactly why it doesn't.**

### Why this and not something else

Five tools already exist in this space. None of them does this:

| Tool | Design your own? | Coupled physics | RF link | Teaching |
|---|---|---|---|---|
| Groundsat | ✗ catalogue only | ✗ | ✅ best in class | ✗ |
| OrbitSmith | partial | quick checks | ~ screening | ✗ |
| CMAT | envelope only | ✅ | ✗ | ✗ |
| CubeSTEM MissionLab | ✗ fixed presets | ✅ | ✗ | ✅ |
| Space Systems Lab | mass only | partial | ✗ faked | ✅ |
| **This** | ✅ parts-level | ✅ mass→power→data | good-enough | ✅ diagnostic |

The gap is the **row**, not any single cell. We are not the best orbit propagator, not the best link
budget (Groundsat wins that outright), and not the broadest physics (CMAT wins that). We are the only
place where *a satellite you configured yourself* produces a verdict with a diagnosis.

Evidence this is the right target: Swartwout's CubeSat census attributes **47% of documented failures
to configuration and interface breakdowns — comms 27%, EPS 14%, processors 6%** — with a further 33%
never contacted after deployment. Mass, power and data closure is precisely where student CubeSats
die. Success rates climb sharply on a team's second mission, which says the missing ingredient is
**experiential integration practice**, not exotic hardware.

---

## 2. v1 scope — the build contract

### 2.1 Configure

- **Form factor**: 1U, 1.5U, 2U, 3U, 6U. Drives mass and volume limits from **CDS Rev. 14.1**
  (2.00 kg/U — not the legacy 1.33 kg/U).
- **Components**, chosen from a seeded archetype catalogue, each carrying mass, power (peak/idle),
  data rate and a cited "typical of" provenance:
  - Structure, EPS (battery Wh, solar: body-mounted vs deployable, cell efficiency)
  - OBC, ADCS archetype, COMMS (band, Tx power, antenna gain, data rate), Payload
- **Operating modes** with duty cycles: Idle / Payload / Downlink / Safe.
- **Attitude as an assumption, not a simulation** — pick Tumbling, Nadir-pointing or Sun-tracking.
  Each applies a documented average solar-incidence factor. *(This is the key simplification: it buys
  the power coupling without 6-DoF dynamics.)*

### 2.2 Orbit and ground

- Altitude + inclination, or a preset: ISS deployment, dawn-dusk SSO, generic 500 km LEO.
- SGP4 propagation via `satellite.js`; conical eclipse model; beta angle.
- Ground station: preset list (including SatNOGS stations) or your own lat/lon, with elevation mask.

### 2.3 The three coupled budgets

Everything reads one shared design state. Change the payload and all three move.

1. **MASS** — roll-up vs CDS limit, with user-set contingency margin.
2. **POWER** — per-orbit generation (solar constant × area × efficiency × incidence factor ×
   illuminated fraction) vs mode-weighted load; battery SoC time series over N orbits; depth of
   discharge; energy balance verdict.
3. **DATA** — passes per day, contact minutes, link margin per pass (FSPL at slant range, EIRP, G/T,
   Eb/N₀), achievable bits per pass, **downlinked vs generated per day**, buffer fill.

### 2.4 The Mission Closure Verdict — *this is the product*

One screen. Three cards: **MASS / POWER / DATA**, each GO / WARN / NO-GO, each with a diagnosis and a
concrete fix:

> **POWER — NO-GO.** Battery reached 12% SoC on orbit 4. Payload mode draws 4.2 W against
> 2.8 W orbit-average generation. Fix: cut payload duty cycle to 40%, or add deployable panels
> (+180 g each, which costs you 360 g of your 1,165 g mass margin).

Note the last clause — the diagnosis names the *cross-subsystem* cost. That sentence is the whole
product.

### 2.5 Show the working

Every number expands to: formula → substituted values → units → source citation. Non-negotiable;
it is our only durable advantage over two closed competitors.

### 2.6 Teach

Three guided missions, each with predict-before-run:

1. **First Orbit** — altitude, period, eclipse. Breaks "higher orbit = faster".
2. **Keep the Lights On** — power closure. Breaks "solar panels just work".
3. **Phone Home** — link and data closure. Breaks "if it's overhead, my data downloads".

### 2.7 Platform

Static site. No backend, no accounts, no install. Design state URL-encoded for sharing;
`localStorage` for resume. MIT licensed, public repo from day one.

### 2.8 Visual

2D ground track + orbit plot + SoC/link time-series charts. **One simple Three.js globe** (textured
sphere, orbit line, ground-station cone) — a day or two of work, not a 3D CAD builder.

---

## 3. Explicitly NOT in v1

Each of these is cut for a stated reason, not forgotten:

| Cut | Why |
|---|---|
| Thermal modelling | CMAT does it better; parity feature, not a differentiator |
| 6-DoF ADCS dynamics | Large effort; attitude-as-assumption gives the coupling we need |
| Orbital decay / lifetime | Parity with CMAT and OrbitSmith |
| ITU rain / ionospheric / polarisation losses | **Chasing Groundsat on its home turf.** Our RF only needs to teach the trade |
| 3D satellite builder, exploded view | Pretty, not the wedge; SSL already has pseudo-3D |
| Fault injection | v2 — the sim must be trusted before failures teach anything |
| MicroPython flight-software sandbox | v3 |
| CCSDS packets, XTCE export | v3; post-traction |
| Accounts, LTI 1.3, educator dashboards | Only after traction proves demand |
| Rust → WASM kernel | Premature. TypeScript reaches a *validated* core sooner |
| Monte Carlo sweeps | v2 |

---

## 4. Architecture

```
UI (React + Vite + TypeScript)
  Configurator · Verdict cards · Charts · Globe · Missions
          ↓ reads ↑ writes
Design State  — single source of truth, immutable, URL-encodable
          ↓
Physics core — pure TypeScript, zero UI dependencies
  orbit · eclipse · power · link · passes · data
  every function returns { value, unit, trace }   ← makes §2.5 free
          ↓
Data — parts catalogue · ground stations · orbit presets (static JSON)
```

**Why `{ value, unit, trace }` on every function:** "show your working" becomes a property of the
engine rather than a UI feature someone has to remember to add. This is the single most important
architectural decision in v1.

**Why TypeScript over Rust/WASM:** the GC-jitter argument applies to 60 fps rendering, not to a
coupled kernel stepping at 1–10 Hz in a Web Worker. Rust adds a toolchain, a language and a
serialisation boundary *before a single equation is validated*. Port hot paths later if profiling
demands it. (If you already write Rust fluently, this call flips.)

**Why no backend:** free static hosting, zero scaling cost, works offline, no privacy surface, no
accounts to build. Cloud economics only matter once there is something to scale.

---

## 5. Open source we build on

Reuse, properly licensed and credited:

| Library / source | Use | Licence |
|---|---|---|
| **satellite.js** | SGP4, TLE/OMM, look angles, passes | MIT |
| **Three.js** | Globe | MIT |
| **uPlot** | Fast time-series charts | MIT |
| **Vite + React + TypeScript** | App shell | MIT |
| **HaralDev/nasa-smallsat-soa** | Component parameters from NASA SST-SOA | check repo |
| **SatNOGS DB API** | Real ground stations; pass validation | open |
| **CelesTrak OMM** | Orbit data, cached snapshot (never direct client fetch) | terms apply |
| **Natural Earth** | Offline map tiles | public domain |
| **Cal Poly CDS Rev. 14.1** | Constraint ruleset | public spec |
| **GMAT / Orekit / 42** | **Offline validation references only** — never runtime deps | — |

Last row matters: these cannot run client-side. Using them as validation oracles turns an impossible
dependency into a credibility asset.

---

## 6. Validation gates — v1 does not ship until these pass

| Check | Target |
|---|---|
| Orbital period, velocity, eclipse fraction | Match analytic solution exactly |
| Orbit position vs GMAT/Orekit over 1 day | **< 1 km** (not 1 m — see doc 05) |
| Pass times vs a real SatNOGS observation | < 30 s |
| Link margin vs a published CubeSat downlink | < 1 dB |
| Power budget vs hand-worked 3U case | < 5% |
| P1 test: novice reaches an orbiting satellite unaided | < 5 min |
| P2 test: student states why their design failed and what fixed it | unprompted |

Published in-app as a validation page. Being *demonstrably correct* is the moat.

---

## 7. Build order

1. **Physics core + tests** — pure TS, no UI. Validation gates green before any pixel.
2. **Configurator + mass budget** — the first visible cascade.
3. **Orbit + eclipse + ground track.**
4. **Power simulation + SoC chart.**
5. **Passes + link + data closure.**
6. **Verdict cards + diagnosis engine.**
7. **Three guided missions.**
8. **Globe, polish, validation page.**

Physics first, deliberately: it is the part that must be right, and the part that makes the rest
meaningful.

---

## 8. What success looks like

An undergraduate who has never designed a satellite builds a 3U, watches it brown out on orbit 4,
reads *why*, fixes it by trading duty cycle against panel mass, and can then explain the trade to
someone else. In under thirty minutes, in a browser, for free.

If v1 does that, it is the only place on the internet where it can be done.
