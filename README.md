# Margin — localhost edition

This is the complete editable source for **Margin — From video to reading**, converted from the ChatGPT Sites/Cloudflare deployment into a normal local Next.js application.

The UI and application behavior are preserved. The hosted D1 database has been replaced by Node's built-in SQLite driver, so Margin now creates and manages its own local database automatically.

## Run it

Requirements:

- Node.js 22.13.0 or newer
- npm, pnpm, or Bun

With npm:

```powershell
npm install
npm run dev
```

With Bun:

```powershell
bun install
bun run dev
```

Open:

```text
http://127.0.0.1:3000
```

That's it. There is no D1 migration step, Wrangler process, Cloudflare account, `.env` file, or external database service required.

## Local data

Margin creates its database on first API request at:

```text
data/margin.sqlite
```

The database folder and SQLite WAL files are ignored by Git. To store the database somewhere else, set `MARGIN_DB_PATH` to an absolute or relative path before starting Margin.

To back up your library, stop Margin and copy `data/margin.sqlite`.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` / `bun run dev` | Start the local development server with hot reload. |
| `npm run build` / `bun run build` | Build the production Next.js application. |
| `npm run start` / `bun run start` | Run the production build locally. |
| `npm run typecheck` / `bun run typecheck` | Run TypeScript validation. |
| `npm run lint` / `bun run lint` | Run ESLint over the editable app source. |
| `npm run check:local` / `bun run check:local` | Verify the required Node version and built-in SQLite support without starting the app. |
| `npm run check:api` / `bun run check:api` | Run deterministic origin/provider/YouTube caption regression checks. |
| `npm run verify` / `bun run verify` | Typecheck plus both local regression checks. |

## What changed from the Sites build

- Cloudflare D1 runtime storage was replaced with local SQLite using `node:sqlite`.
- Database tables initialize automatically at startup.
- Development and production use normal `next dev`, `next build`, and `next start` commands.
- The AI formatter now accepts user-selected `http://` or `https://` OpenAI-compatible endpoints, including localhost/LAN providers. The hosted build rejected private/local endpoints because its server was internet-facing and needed SSRF protection.
- AI settings now hydrate model IDs from the provider’s `/models` endpoint (for a base URL such as `http://127.0.0.1:1234/v1`, Margin requests `http://127.0.0.1:1234/v1/models`). Manual model IDs still work.
- Same-origin validation uses the browser-facing Host/forwarded host and treats `localhost`, `127.0.0.1`, and loopback IPv6 as equivalent on the same port, avoiding false rejections from Next.js host normalization.
- YouTube caption retrieval handles JSON3, WebVTT, and XML timed-text responses. When YouTube returns the current PoToken-gated `200 OK` + empty-body response, Margin falls back to a local BotGuard/PoToken transcript fetch instead of falsely reporting that captions are unavailable.
- All original Sites-specific source/configuration remains in this tree for reference, but it is no longer part of the local runtime or TypeScript build.
- The ChatGPT `document.modelContext` integration in `app/page.tsx` is intentionally retained. It is inert in ordinary browsers and preserves compatibility if the app is ever opened in an environment that implements it.

## Features preserved

- YouTube caption retrieval, including current PoToken-gated caption tracks on ordinary public videos
- pasted transcript and SRT/VTT/TXT import
- article editor
- collections, tags, favorites, search, and sorting
- local article persistence
- OpenAI-compatible transcript formatting
- manual ChatGPT handoff mode
- PDF print view
- EPUB export


## YouTube transcript note

YouTube increasingly protects caption downloads with a browser proof token (PoToken). The public video page can still advertise a valid transcript while a direct timed-text request returns HTTP 200 with an empty body. Margin first uses the lightweight direct caption path when it is usable, then falls back to the `get-youtube-transcript` helper, which mints the proof token locally through BotGuard and fetches the caption JSON from your own IP.

The first v1.2 launch may install this additional dependency. `START_MARGIN.cmd` checks for it even when an older `node_modules` directory already exists, so upgrading an existing local copy does not silently keep the old broken caption path.

This remains best-effort: YouTube can change internal APIs, rate-limit an IP, or require login for restricted videos. No YouTube account cookies are stored or sent by Margin.

## Original Sites source

The source handoff identified the deployed Sites commit as:

```text
724dc6af1cd192958640f75d868e3fa441a6c25c
```

Original deployment/configuration files such as `.openai/hosting.json`, `vite.config.ts`, `cloudflare-env.d.ts`, the Drizzle schema/migration, and Sites helper scripts have been preserved rather than deleted. They are historical/reference material for the original hosted build; the localhost runtime does not use them.

The pre-migration versions of the files changed for the localhost conversion are also preserved under `.migration-backup/`, with SHA-256 hashes in `changed-files.before.sha256`.

## Security notes

The API still checks same-origin browser requests. Provider API keys remain only in the current browser tab and are sent only when you explicitly format an article. They are not stored in SQLite or localStorage.

Because this edition intentionally supports local AI providers, only run Margin on a machine/network you trust. The dev/start scripts bind to `127.0.0.1` by default rather than exposing the server to your LAN.
