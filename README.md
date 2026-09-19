# Margin

**Margin** is a local reading library for turning video transcripts into readable articles you can organize, annotate, and keep.

Paste a YouTube link (or bring your own transcript), format it with an OpenAI-compatible model, then save the result into a private SQLite library. Margin includes collections, reusable tags, favorites, themes, streaming generation, notes and highlights, reader scaling, EPUB/PDF export, and encrypted AI connection profiles.

A fresh library starts with `examples/AI Slop is Obvious.md` as a sample article in **Inbox**. Delete it whenever you want; it will not respawn.

## Quick start on Windows

Requirements:

- Node.js 22.13 or newer
- Bun recommended; npm also works

Clone or download the repository, then double-click:

```text
START_MARGIN.cmd
```

Margin installs missing dependencies if needed and starts at:

```text
http://127.0.0.1:3000
```

Or run it manually:

```powershell
bun install
bun run dev
```

With npm:

```powershell
npm install
npm run dev
```

## What Margin does

- Retrieves YouTube captions, including a PoToken/BotGuard fallback for caption tracks that return an empty `200 OK` response.
- Imports pasted transcripts and SRT/VTT/TXT files.
- Connects to OpenAI-compatible APIs, including local HTTP endpoints such as LM Studio or llama.cpp servers.
- Hydrates available models from the provider's `/models` endpoint while still allowing manual model IDs.
- Streams article generation with optional reasoning visibility, cancellation, sampler controls, and partial-draft recovery.
- Saves articles locally with collections, tags, favorites, card colors, search, sorting, and bulk moves.
- Supports Markdown reading, fullscreen mode, adjustable text size and reading width.
- Adds persistent highlights, passage notes, and article notes.
- Includes customizable themes, border geometry, and highlight colors.
- Exports individual articles or collections to EPUB; PDF export uses the browser print flow.

## AI connections and secrets

Margin can save multiple provider connection profiles. API keys are encrypted with AES-256-GCM before they are stored in SQLite. The encryption key is machine-local and is never stored in the repository.

Default key locations:

- Windows: `%LOCALAPPDATA%\Margin\secrets.key`
- macOS: `~/Library/Application Support/Margin/secrets.key`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/margin/secrets.key`

The browser only receives whether a saved profile **has** a key; saved key material is not returned to the UI. Changing a profile to a different endpoint also prevents the old saved key from being silently reused against the new host.

This is encryption at rest, not protection from malware running as your user account: software that can read both the SQLite database and the machine-local key can decrypt saved secrets.

## Local data

Margin creates its SQLite database automatically at:

```text
data/margin.sqlite
```

The database, WAL files, environment files, and common local build/editor artifacts are ignored by Git.

To back up your library, stop Margin and copy `data/margin.sqlite`. To place it somewhere else, set `MARGIN_DB_PATH`.

Useful optional environment variables:

- `MARGIN_DB_PATH` — custom SQLite database path
- `MARGIN_CONFIG_DIR` — custom directory for Margin's machine-local configuration
- `MARGIN_SECRET_KEY_PATH` — custom AES key-file path
- `MARGIN_SECRET_KEY` — provide a 32-byte key as 64 hex characters or base64 instead of using a key file

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the local development server with hot reload. |
| `bun run build` | Build the production Next.js app. |
| `bun run start` | Run the production build on `127.0.0.1`. |
| `bun run typecheck` | Run TypeScript validation. |
| `bun run lint` | Run ESLint over app source. |
| `bun run check:local` | Check Node version and `node:sqlite`. |
| `bun run check:api` | Run provider, streaming, origin, YouTube, and annotation regression checks. |
| `bun run check:reader` | Run Markdown/reader rendering regression checks. |
| `bun run verify` | Run typecheck plus all deterministic local regression checks. |

Replace `bun run` with `npm run` if you use npm.

## Project layout

```text
app/          Next.js UI and API routes
components/   UI components actually used by Margin
hooks/        shared React hooks
lib/          SQLite, provider, transcript, export, and annotation logic
local-tools/  deterministic regression checks
examples/     bundled first-run sample article
public/       favicon/static assets
vendor/       vendored shadcn Tailwind CSS + license
```

## YouTube transcript note

YouTube can advertise a valid transcript while direct timed-text requests return HTTP 200 with an empty body. Margin first tries the lightweight caption path and falls back to a local BotGuard/PoToken transcript helper when necessary. YouTube can still change internal APIs, rate-limit an IP, or require login for restricted videos, so caption retrieval remains best-effort. No YouTube account cookies are stored by Margin.

## Privacy

Margin binds its development/production server to `127.0.0.1` by default. Your articles, annotations, connection profiles, and transcripts live in your local SQLite database. Content is sent to an AI provider only when you explicitly ask Margin to format an article.
