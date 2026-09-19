# Localhost migration notes

## Goal

Remove the runtime dependency on ChatGPT Sites / Cloudflare while preserving the complete editable Margin application.

## Runtime changes

- `package.json`: normal Next.js dev/build/start scripts; Cloudflare/Vinext runtime packages removed from the active dependency list.
- `lib/database.ts`: D1 adapter replaced with a tiny compatibility wrapper over Node 22's built-in `node:sqlite`.
- `app/api/*/route.ts`: explicitly pinned to the Node.js runtime.
- `app/api/format/route.ts`: provider URLs may now be HTTP or HTTPS, so local OpenAI-compatible servers are usable from localhost.
- `tsconfig.json`: active typechecking scope no longer includes preserved Sites/Cloudflare scaffolding.
- `.gitignore`: local SQLite data is ignored.
- `START_MARGIN.cmd`: optional Windows launcher; prefers Bun and falls back to npm.

## Preserved upstream material

No Sites source was discarded. The original platform files remain available in the tree, including `.openai/`, `build/`, `db/`, `drizzle/`, `scripts/`, `vite.config.ts`, and `cloudflare-env.d.ts`. Files directly replaced during migration are backed up under `.migration-backup/`. The original Sites `pnpm-lock.yaml` is preserved there as `pnpm-lock.sites-original.yaml` because it no longer matches the active local-only package manifest.

## Validation performed in the conversion environment

- Node runtime: `v22.16.0`.
- `node:sqlite` availability: confirmed.
- Local database initialization: confirmed.
- `collections` insert/select: confirmed.
- `articles` insert/select/delete: confirmed.
- SQLite file creation: confirmed.
- Full dependency install / Next build: **not run to completion** because outbound npm registry access in the conversion sandbox timed out before packages could be downloaded. The source package therefore does not claim a completed framework build validation.

On a normal connected development machine, run:

```powershell
bun install
bun run typecheck
bun run build
bun run dev
```

or the npm equivalents.

## v1.1 localhost follow-up

The first local run exposed two portability assumptions from the hosted build. This revision fixes both and adds provider discovery:

- `lib/database.ts`: same-origin validation now keys off the browser-facing `Host` / `X-Forwarded-Host` before falling back to the internal request URL, and accepts loopback aliases on the same port. This fixes localhost vs. `127.0.0.1` false positives such as **Request origin is not allowed**.
- `app/api/captions/route.ts` + `lib/youtube.ts`: caption-track extraction is bracket-aware, YouTube timed-text is tried as JSON3, VTT, and XML, and empty bodies are handled explicitly instead of surfacing raw JSON parser errors.
- `app/api/models/route.ts` + `lib/provider.ts`: OpenAI-compatible model discovery now requests `<base URL>/models`, including local HTTP providers.
- `app/page.tsx`: model IDs auto-hydrate while the AI settings panel is open, remain manually editable, and can be refreshed explicitly. API responses are read defensively so an empty/non-JSON server response produces a useful error.
- `local-tools/check-api-contracts.ts`: deterministic local mocks cover loopback origin handling, provider URL construction, YouTube URL parsing, caption-track extraction, and JSON3/VTT/XML caption parsing.

Validation for this follow-up in the conversion environment:

```text
node local-tools/check-localhost.mjs
  PASS — Node 22.16.0 and node:sqlite round-trip

node --experimental-strip-types local-tools/check-api-contracts.ts
  PASS — origin, provider URL, YouTube ID/track extraction, JSON3/VTT/XML parsing

TypeScript transpile syntax pass
  PASS — app/page.tsx and all new/changed route/helper/test files
```

A full Next.js dependency-backed `tsc`/build remains a machine-side validation item because the conversion sandbox does not have this project’s npm dependencies installed.


## v1.2 YouTube PoToken follow-up

A public video used for local validation visibly exposed a transcript in YouTube's own UI while Margin received `200 OK` with an empty body from the caption `timedtext` URL. This is YouTube's current PoToken/BotGuard gating behavior rather than an absent transcript.

This revision changes the acquisition chain:

- `lib/youtube.ts`: detects `exp=xpe` caption URLs, which are known to be proof-token gated.
- `lib/youtube-pot.ts`: adds a small normalization seam plus a lazy server-only adapter around `get-youtube-transcript` 1.0.0.
- `app/api/captions/route.ts`: keeps the lightweight direct JSON3/VTT/XML path where it still works, skips known-gated direct requests, and falls back to the PoToken-capable helper on empty/failed direct caption bodies.
- `next.config.ts`: keeps the BotGuard transcript helper external to the Next.js server bundle so its Node/jsdom runtime remains intact.
- `START_MARGIN.cmd`: re-runs dependency installation when upgrading from a pre-v1.2 `node_modules` tree that does not contain the new transcript helper.
- `local-tools/check-api-contracts.ts`: deterministic mocks now cover PoToken-gate detection and transcript-result normalization in addition to the existing caption parsers.

Validation in the conversion environment:

```text
node --experimental-strip-types local-tools/check-api-contracts.ts
  PASS — includes PoToken gating/fallback normalization mocks

node local-tools/check-localhost.mjs
  PASS — Node 22.16.0 and node:sqlite round-trip

node --experimental-strip-types --check app/api/captions/route.ts
node --experimental-strip-types --check lib/youtube-pot.ts
node --experimental-strip-types --check lib/youtube.ts
  PASS — syntax
```

A live YouTube PoToken round-trip and full Next.js build cannot be executed inside the conversion sandbox because outbound package/network access is unavailable there. They should be exercised on the normal connected localhost machine.
