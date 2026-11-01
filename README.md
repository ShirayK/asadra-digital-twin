# Asadra Digital Twin

> **Standalone** 3-D digital twin of a food-production floor for HACCP visualization.  
> Built for the IBM Bob Israel Hackathon 2026 — all code written inside Bob IDE.

---

## What it is

An independent Next.js 14 web application that renders a 3-D model of a food factory floor, colours every Critical Control Point (CCP) by its latest measurement status, animates material flow paths, and highlights hygiene-separation issues — with no connection to any external database or the Asadra product repo.

Features:

- **3-D factory floor** with zones coloured by hygiene class (RAW / LOW_RISK / HIGH_CARE / PACKAGING / STORAGE)
- **CCP status ring** — green (OK), red with pulse (OUT_OF_RANGE), amber (STALE), grey (NO_DATA)
- **Material flow arrows** with animated dash offset showing direction
- **Separation checks** — RAW→HIGH_CARE without a kill step, and allergen cross-contact
- **Side panel** — station name, type, last 5 readings, out-of-range highlights, corrective action, hash badge
- **Layout editor** — drag stations, auto-save to localStorage, Export/Import JSON, Reset
- **Guided tour** — camera walk-through of all process steps in order
- **Live simulator + KPI header** — readings every 3 s, cooling breach → corrective action → breach again, brief STALE dropouts; live clock and KPI strip
- **i18n** — Hebrew RTL (default) and English
- **Empty state** — clear message when no dataset is loaded

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| 3-D | Three.js · @react-three/fiber 8 · @react-three/drei 9 |
| Validation | Zod |
| Tests | Vitest |
| Linting | ESLint (eslint-config-next) |
| Package manager | npm |

## Standalone by design

- **No Prisma, no Supabase, no auth** in the MVP.
- Data lives in `data/seed/*.json` (validated by Zod schemas in `src/domain/schema.ts`).
- User layout edits are stored as an overlay in `localStorage` — the seed is never mutated.
- Readings are append-only (delete/update is not exposed in the UI).
- No `.env` files required — the app runs entirely on local data with zero environment variables.
- No secrets, API keys, or tokens are committed to the repo.
- See `AGENTS.md` for the full list of agent rules.

## Getting started

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # ESLint
npm run test         # Vitest (87 tests)
```

## Project structure

```
data/seed/              # Demo JSON datasets (hummus plant)
src/domain/             # Pure functions + Zod schemas (no React, no I/O)
  schema.ts             # TwinDataset zod schema + inferred types
  status.ts             # getStationStatus → OK / OUT_OF_RANGE / NO_DATA / STALE
  flow.ts               # buildFlowPaths → {from, to, edge}[]
  separation.ts         # findSeparationIssues → RAW_TO_HIGH_CARE_WITHOUT_CCP, ALLERGEN_CROSS_CONTACT
  chain.ts              # verifyReadingChain → SHA-256 integrity check
src/adapters/           # TwinDataSource interface + JSON / localStorage impls
  types.ts              # interface TwinDataSource { load(): Promise<TwinDataset> }
  json-file-source.ts   # Reads data/seed/*.json on the server
  local-overlay.ts      # Stores layout edits in localStorage
src/app/[locale]/       # Next.js pages (server components load + validate data)
src/components/twin/    # React / R3F client components
src/i18n/               # Locale dictionaries (he = Hebrew RTL, en = English)
tests/domain/           # Vitest unit tests (99 tests)
bob_sessions/           # Screenshots of Bob IDE Task Session summaries (00–18; sessions 15–18 ran on a second team budget, TECHZONE)
docs/                   # SPEC.md · INTEGRATION.md
```

## Data format

The source of truth is `TwinDataset` defined in `src/domain/schema.ts` and validated by Zod.  
A demo seed is at `data/seed/hummus-plant.json` — a 30×20 m hummus factory with:

- 6 zones (RAW → LOW_RISK → HIGH_CARE → PACKAGING → STORAGE)
- 6 stations (receiving PRP, soaking CP, cooking CCP 90 °C, cooling CCP 5 °C, metal detector CCP, packaging PRP)
- 20 readings with a valid SHA-256 hash chain, including one out-of-range cooling reading (9 °C)
- Edges that trigger both separation checks (RAW→HIGH_CARE without CCP; sesame allergen cross-contact)

Key rules enforced by the schema:
- All `stationId`, `zoneId`, `allergenCode`, and edge endpoint references must exist.
- Step `sortOrder` values must be unique within a process.
- `readings` are append-only — no delete or update operations in the UI.

## Future Asadra adapter

`docs/INTEGRATION.md` describes a planned `AsadraApiSource` that will map  
`Station / StationField / StationLog / ProcessNode / ProcessEdge / Allergen`  
from a read-only Asadra export endpoint to `TwinDataset`.  
**No code in this repo currently calls Asadra.** The interface is already defined:

```ts
// src/adapters/types.ts
interface TwinDataSource {
  load(): Promise<TwinDataset>;
}
```

Swapping the source requires zero changes to domain logic or UI components.

## Deployment

Deploy as a **separate** Vercel project (not the Asadra project):

1. Connect the `ShirayK/asadra-digital-twin` repo to a new Vercel project.
2. No environment variables are required — the app runs on local seed data.
3. No secret tokens should ever be added to the Vercel project settings.

## Internationalization

Default locale: **Hebrew (RTL)**. English is also supported.  
All UI strings are in `src/i18n/{he,en}.json` — both files must have identical key sets  
(enforced by `tests/domain/i18n.test.ts`).

## Security checklist

- [ ] No `.env` or `.env.*` files in the repo (covered by `.gitignore`)
- [ ] No API keys, tokens, or passwords in any source file
- [ ] No imports from, network calls to, or shared database with `ShirayK/Asadra`
- [ ] `AsadraApiSource` is documentation-only — no code that calls Asadra exists

---

*Made with IBM Bob IDE · IBM Bob Israel Hackathon 2026*

## Built with IBM Bob

| # | Bob session | Commit |
|---|---|---|
| 0–11 | Spec prompts 0–11 (scaffold → QA); see docs/SUBMISSION.md | `646297b`…`4a06dce` |
| 12 | Realistic factory equipment, building, lighting | `214ec77` |
| 13 | Cinematic dark industrial look with bloom | `3aa3a6c` |
| 14 | Live CCP simulator, breach toast, English names, compact labels, camera fit. The session hit the team's 50-Bobcoin budget before it could commit, so the code it wrote was committed by hand | `36bcf38` |

**Bob session 15 (second team budget, TECHZONE-TS023239691):** Asadra purple/white palette, readable constant-size labels, toast stack, scrollable side panel, zoom-out + Fit/Top view.

**Bob session 16 (same budget):** true bounding-box Fit/Top view, collapsible legend, label collision handling, 12px zone labels, purple lighting.

**Bob session 17 (same budget):** light bright theme (white/light-purple glass UI, light epoxy floor), new lighting, less bloom, 13px labels, Hebrew label wrap, tighter fit view.

**Bob session 18 (same budget):** recognizable detailed equipment (receiving dock, steam kettles, stone mill, blast chiller, metal-detector arch on conveyor, packaging line), thin floor outlines, warnings beside stations.

**Manual work (not in Bob, done by hand after session 14 used up the first Bobcoin budget):**
- `d2610c1`: pinned @react-three/postprocessing 2.x so it works with fiber 8 (the page crashed without it).
- `d6a8b07`: breach threshold now matches the seed's 5 °C limit (before, the toast fired at 4.1 °C); the side panel refreshes live and shows English labels; analytic camera framing instead of drei Bounds; app opens in Live mode; decorative racks, pallets, pipes and conveyor.
- `c5df2dc`: round-3 UI polish: dark glass theme, a header with logo, live clock and KPI strip (CCPs OK, open deviations, chain integrity), English guided tour on /en, simulator cycles (cooling breaches again about 45 s after a corrective action, and the cooking CCP briefly goes STALE every minute; 2 new tests), more detailed equipment (ladders, gauges, chiller fans, packaging conveyor with moving rollers), worker figures, thicker glowing pipes with flow pulses, compact zone tags, a bold separation overlay (glowing dashed path, warning beacon, badge) and a 3 s camera fly-in on load.
- Final polish commit: the two separation badges are offset so both can be read, and the worker figures are larger.

### How to demo (about 60 seconds)
1. Open https://asadra-digital-twin.vercel.app/en/twin. The app opens in **Live** mode: every station reads fresh simulated data and shows a green ring.
2. Wait about 10–20 s. The **Cooling (CCP)** temperature drifts past its 5 °C critical limit. Its ring turns red and pulses, and a red **CCP breach** toast appears.
3. Click the Cooling station (3D or chip) to open the side panel: last 5 readings, with out-of-range values in red, and the limits.
4. Click **✓ Apply corrective action**. The cooling CCP is reset to 3 °C, the toast closes and the ring turns green again. The header KPIs update live. If you keep watching, cooling drifts and breaches again about 45 s later, and the cooking CCP sometimes shows STALE for a few seconds (a simulated sensor dropout).
5. **Live / Paused** toggles the simulation. Also try **Separation check** (raw→high-care and sesame cross-contact), **Edit mode** (drag stations), **Guided tour**, and the **עב/EN** switch.
