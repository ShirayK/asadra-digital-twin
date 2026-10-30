# Asadra Digital Twin — Agent Rules (AGENTS.md)

> These rules are enforced for every Task Session in Bob IDE.

## 1. Standalone — no Asadra coupling
- **Never** import, copy, or reference code from the Asadra repo (`ShirayK/Asadra`).
- **Never** make network calls to any Asadra service, Supabase instance, or shared database.
- **Never** use Prisma or NextAuth; **never** add Supabase client libraries.
- Data shapes may _mirror_ Asadra concepts (Station, StationLog, etc.) but **must be defined here** — no `import from 'asadra'`.

## 2. Local JSON data only
- Source of truth: `data/seed/*.json` validated by the Zod schemas in `src/domain/schema.ts`.
- User edits are stored as an **overlay in localStorage** via `src/adapters/local-overlay.ts`.
- Seed files must never be modified by runtime code.
- **Readings are append-only**: no delete/update operations on readings, either in the UI or in data helpers.

## 3. Every change must pass tsc + vitest
- After each non-trivial change, run `npm run typecheck` and `npm run test` before committing.
- No `any` suppressions unless accompanied by a comment explaining why type inference cannot work.
- Never suppress TypeScript errors with `@ts-ignore` without a documented reason.

## 4. Hebrew-first RTL with English
- Default locale is `he` (Hebrew, RTL).
- All user-facing strings live in `src/i18n/he.json` and `src/i18n/en.json`.
- The 3D scene itself is not mirrored — only surrounding UI panels respect RTL.
- Do not hard-code UI strings outside the i18n dictionaries.

## 5. Secrets & environment variables
- **Never** commit `.env`, `.env.local`, `.env.*`, or any file containing API keys, tokens, or passwords.
- `.env*` is in `.gitignore`.
- The app must run in demo mode with zero environment variables (all config via local JSON).
- For future Vercel deploy: only public, non-secret `NEXT_PUBLIC_*` vars are acceptable.

## 6. Folder conventions
| Path | Purpose |
|------|---------|
| `data/seed/` | Immutable demo JSON datasets |
| `src/domain/` | Pure functions and Zod schemas — no React, no I/O |
| `src/adapters/` | Data source abstraction (`TwinDataSource` interface + implementations) |
| `src/app/[locale]/` | Next.js App Router pages (server components load data) |
| `src/components/twin/` | React / R3F client components |
| `src/i18n/` | Locale JSON dictionaries |
| `tests/domain/` | Vitest unit tests for domain functions |
| `bob_sessions/` | Screenshots of Bob IDE Task Session summaries (do not delete) |

## 7. Integration adapter pattern
- `src/adapters/types.ts` defines `TwinDataSource { load(): Promise<TwinDataset> }`.
- MVP implements `JsonFileSource` and `LocalOverlaySource`.
- A future `AsadraApiSource` is **documented** in `docs/INTEGRATION.md` but has **no code** in this repo that calls Asadra.

## 8. Performance
- The Three.js Canvas is loaded with `dynamic(..., { ssr: false })`.
- Use `frameloop="demand"` except when animations are running.
- Keep geometry simple (no heavy GLTF models in MVP).
