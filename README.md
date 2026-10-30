# Asadra Digital Twin

> **Standalone** 3-D digital twin of a food-production floor for HACCP visualization.  
> Built for the IBM Bob Israel Hackathon 2026 — all code written inside Bob IDE.

---

## What it is

An independent Next.js 14 web application that renders a 3-D model of a food factory floor, colours every Critical Control Point (CCP) by its latest measurement status, animates material flow paths, and highlights hygiene-separation issues — with no connection to any external database or the Asadra product repo.

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
npm run test         # Vitest
```

## Project structure

```
data/seed/              # Demo JSON datasets (hummus plant)
src/domain/             # Pure functions + Zod schemas (no React, no I/O)
src/adapters/           # TwinDataSource interface + JSON / localStorage impls
src/app/[locale]/       # Next.js pages (server components load + validate data)
src/components/twin/    # React / R3F client components
src/i18n/               # Locale dictionaries (he = Hebrew RTL, en = English)
tests/domain/           # Vitest unit tests
bob_sessions/           # Screenshots of Bob IDE Task Session summaries
docs/                   # SPEC.md · INTEGRATION.md
```

## Data format

See `src/domain/schema.ts` for the full Zod schema (`TwinDataset`).  
A minimal seed is at `data/seed/hummus-plant.json`.

## Future Asadra adapter

`docs/INTEGRATION.md` describes a planned `AsadraApiSource` that will map  
`Station / StationField / StationLog / ProcessNode / ProcessEdge / Allergen`  
from a read-only Asadra export endpoint to `TwinDataset`.  
**No code in this repo currently calls Asadra.**

## Deployment

Deploy as a separate Vercel project (not the Asadra project).  
No secret environment variables are required — the app runs entirely on local data.

## Internationalization

Default locale: **Hebrew (RTL)**. English is also supported.  
All UI strings are in `src/i18n/{he,en}.json`.

---

*Made with IBM Bob IDE · IBM Bob Israel Hackathon 2026*
