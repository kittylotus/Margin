# Margin

**Margin** is a local-first reading library for turning video transcripts into readable articles you can organize, annotate, and keep.

Paste a YouTube link (or bring your own transcript), format it with an OpenAI-compatible model, then save the result into a private SQLite library. Margin includes collections, reusable tags, favorites, themes, streaming generation, notes and highlights, reader scaling, EPUB/PDF export, encrypted AI connection profiles, LAN access, and an installable PWA shell.

A fresh library starts with `examples/AI Slop is Obvious.md` as a sample article in **Inbox**. Delete it whenever you want; it will not respawn.

## Quick start on Windows

Requirements:

- Node.js 22.13 or newer
- Bun recommended; npm also works

Clone or download the repository, then double-click:

```text
START_MARGIN.cmd
```

The runner installs missing dependencies if needed, then asks whether Margin should listen only on this computer or on the local network. Press **Enter** for the normal localhost mode.

Local mode starts at:

```text
http://127.0.0.1:3000
```

For a phone, tablet, or another computer on the same network, double-click:

```text
START_MARGIN_REMOTE.cmd
```

The runner binds Margin to `0.0.0.0`, prints the usable LAN addresses, and enables the remote access gate by default.

## Remote access

LAN mode prints something similar to:

```text
Local           http://127.0.0.1:3000
Network         http://192.168.1.50:3000
Access code     ABCD-EFGH-IJKL-MNOP
```

Localhost remains trusted without a login. Devices connecting through a LAN/remote hostname are sent to Margin's access screen. Enter the code once and that browser receives an HttpOnly session cookie valid for 30 days.

The generated access code is stored outside the repository alongside Margin's other machine-local configuration:

- Windows: `%LOCALAPPDATA%\Margin\access-code.txt`
- macOS: `~/Library/Application Support/Margin/access-code.txt`
- Linux: `${XDG_CONFIG_HOME:-~/.config}/margin/access-code.txt`

Useful runner flags:

```powershell
node local-tools/launch-margin.mjs --local
node local-tools/launch-margin.mjs --lan
node local-tools/launch-margin.mjs --lan --rotate-code
node local-tools/launch-margin.mjs --lan --no-auth
```

`--no-auth` is intentionally available for trusted/testing networks, but it means anyone who can reach the port can use the library and invoke saved AI connections through Margin.

This access-code gate is deliberately zero-setup rather than provider OAuth. GitHub/Google OAuth can be layered on later if multi-user identity becomes useful.

## PWA / installable app

Margin now ships a web app manifest, application icons, Apple touch icon, and a deliberately network-only service worker. It does **not** cache private articles or API responses in the browser.

On `localhost`, browsers treat the origin as secure and the PWA can be installed normally. A raw LAN URL such as `http://192.168.1.50:3000` is not normally considered a secure context, so service workers/PWA installation require either:

- HTTPS in front of Margin (recommended for phones/tablets and real remote use), or
- a Chromium development flag such as `--unsafely-treat-insecure-origin-as-secure=http://192.168.1.50:3000` on a desktop test profile.

The app itself does not require HTTPS to serve LAN pages; HTTPS is the browser requirement for installable PWA/service-worker behavior away from localhost.

## Manual commands

With Bun:

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
- Can serve the same SQLite library to trusted/authenticated devices over the local network.

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
- `MARGIN_REQUIRE_AUTH=1` — require the remote access cookie for non-loopback requests
- `MARGIN_ACCESS_CODE` — provide an access code instead of using the runner-generated one

## Commands

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the development server on `127.0.0.1`. |
| `bun run dev:lan` | Start the development server on `0.0.0.0`. |
| `bun run build` | Build the production Next.js app. |
| `bun run start` | Run the production build on `127.0.0.1`. |
| `bun run start:lan` | Run the production build on `0.0.0.0`. |
| `bun run typecheck` | Run TypeScript validation. |
| `bun run lint` | Run ESLint over app source. |
| `bun run check:local` | Check Node version and `node:sqlite`. |
| `bun run check:api` | Run provider, streaming, origin, YouTube, and annotation regression checks. |
| `bun run check:reader` | Run Markdown/reader rendering regression checks. |
| `bun run check:access` | Run the remote access/session regression check. |
| `bun run verify` | Run typecheck plus all deterministic local regression checks. |

Replace `bun run` with `npm run` if you use npm.

## Project layout

```text
app/          Next.js UI, PWA manifest, access screen, and API routes
components/   UI components actually used by Margin
hooks/        shared React hooks
lib/          SQLite, provider, transcript, export, annotation, and access logic
local-tools/  launcher + deterministic regression checks
examples/     bundled first-run sample article
public/       PWA icons, service worker, and static assets
vendor/       vendored shadcn Tailwind CSS + license
```

## YouTube transcript note

YouTube can advertise a valid transcript while direct timed-text requests return HTTP 200 with an empty body. Margin first tries the lightweight caption path and falls back to a local BotGuard/PoToken transcript helper when necessary. YouTube can still change internal APIs, rate-limit an IP, or require login for restricted videos, so caption retrieval remains best-effort. No YouTube account cookies are stored by Margin.

## Privacy

Margin binds to `127.0.0.1` in normal local mode. LAN mode must be explicitly selected and enables the access-code gate unless `--no-auth` is supplied. Your articles, annotations, connection profiles, and transcripts live in the host computer's SQLite database. Content is sent to an AI provider only when you explicitly ask Margin to format an article.
