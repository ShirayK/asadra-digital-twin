# Asadra Integration Adapter — Future Design

> **Status: Documentation only.** No code in this repo currently calls Asadra.
> This document describes the planned `AsadraApiSource` for post-MVP integration.
>
> **Verified (Prompt 11 QA):** `git grep -r "supabase\|ShirayK/Asadra"` finds no references
> in `src/` or `tests/` — only in this documentation file and `docs/SPEC.md`.
> Zero `.env` files tracked in git. All checks pass: `tsc --noEmit`, `vitest run`, `next build`.

## Overview

The MVP loads data from `data/seed/*.json` via `JsonFileSource`.  
In a future milestone, an `AsadraApiSource` will be added to `src/adapters/` that reads a
**read-only export endpoint** from the Asadra product and maps its types to `TwinDataset`.

The interface contract is already defined:

```ts
// src/adapters/types.ts
interface TwinDataSource {
  load(): Promise<TwinDataset>;
}
```

Swapping the source requires zero changes to domain logic or UI components.

## Field Mapping (Asadra → TwinDataset)

| Asadra type | TwinDataset field | Notes |
|-------------|------------------|-------|
| `Station.id` | `stations[].id` | Direct |
| `Station.name` | `stations[].name` | Direct |
| `Station.controlType` (`CCP`/`CP`/`PRP`) | `stations[].controlType` | Direct enum |
| `Station.position` | `stations[].position {x, z}` | Asadra uses `{x, y}` → map y→z |
| `StationField.key` | `stations[].fields[].key` | Direct |
| `StationField.label` | `stations[].fields[].label` | Direct |
| `StationField.unit` | `stations[].fields[].unit` | Direct |
| `StationField.minValue` | `stations[].fields[].min` | Rename |
| `StationField.maxValue` | `stations[].fields[].max` | Rename |
| `StationField.monitoringFrequency` | `stations[].fields[].monitoringFrequency` | Direct |
| `StationField.correctiveActionText` | `stations[].fields[].correctiveActionText` | Direct |
| `StationLog.id` | `readings[].id` | Direct |
| `StationLog.stationId` | `readings[].stationId` | Direct |
| `StationLog.loggedAt` | `readings[].recordedAt` | Rename |
| `StationLog.values` | `readings[].values` | Direct |
| `StationLog.correctiveAction` | `readings[].correctiveAction` | Direct |
| `ProcessNode.id` | `process.steps[].id` | Direct |
| `ProcessNode.name` | `process.steps[].name` | Direct |
| `ProcessNode.type` | `process.steps[].type` | Enum mapping |
| `ProcessNode.sortOrder` | `process.steps[].sortOrder` | Direct |
| `ProcessEdge.from` | `process.edges[].from` | Direct |
| `ProcessEdge.to` | `process.edges[].to` | Direct |
| `Allergen.code` | `allergens[].code` | Direct |
| `Allergen.name` | `allergens[].name` | Direct |

## Constraints

- The `AsadraApiSource` will use a **read-only** Asadra export endpoint (no writes back).
- It must never share a database connection with Asadra; all data is fetched over HTTP.
- `externalRef: { system: 'asadra', stationId }` on each station allows round-trip tracing.
- Readings remain **append-only** — the adapter will never delete or update `readings`.

## Environment variables (future, non-secret)

```
NEXT_PUBLIC_ASADRA_EXPORT_URL=https://...   # public export URL, no auth token
```

No secret tokens or API keys should ever be committed or required for the MVP.
