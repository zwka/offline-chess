# Offline Chess

## 1. Overview

**Offline Chess** is a single installable, offline-first chess **Suite** served from one origin. It brings together a minimal **Landing Page** at `/` and four self-contained chess **Tools** mounted at flat subpaths:

- **`/` — Landing Page**: The Suite's home screen linking to all four Tools in fixed order with the unified Sun/Moon Theme toggle.
- **`/blind-chess/` — Blind Chess**: Six 60-second blindfold board-vision drills (Square Colors, Same Color, Coordinates, Diagonals, Quadrant, and Knight) with local attempt history and personal bests.
- **`/pgn-reader/` — PGN Reader**: Offline PGN study Tool for importing `.pgn` files, searching games, stepping through moves and variations, and viewing board annotations.
- **`/woodpecker-generator/` — Woodpecker Generator**: Filters the local Lichess puzzle index by rating and Tactic Theme with reproducible seeds to build Puzzle Sets.
- **`/woodpecker-trainer/` — Woodpecker Trainer**: Solves offline Puzzle Sets with first-try scoring and tracks training Runs and Archived Puzzle Sets locally.

### Key Suite Features

- **Single PWA Install & Root Service Worker**: Only the Suite exposes a web app manifest (`/manifest.webmanifest`), and a single root service worker (`/sw.js`) precaches the Landing Page and all four Tools on the first online visit so every Tool works completely offline—even before that individual Tool has been opened.
- **Unified Two-State Theme (Dark Default)**: The Landing Page and all four Tools share a two-state Theme (`light` and `dark`, defaulting to `dark`) stored under `localStorage["offline-chess.theme.v1"]` and controlled by a consistent Sun/Moon header toggle.
- **Direct "Do Puzzles" Handoff**: After generating a Puzzle Set in Woodpecker Generator, clicking **Do Puzzles** hands the Puzzle Set directly to Woodpecker Trainer on the same origin (via a shared IndexedDB handoff inbox) and starts or resumes a Run without exporting and re-importing a JSON file.

Domain terms and architectural decisions are documented in [`GLOSSARY.md`](./GLOSSARY.md) and [`docs/adr/0001-single-origin-suite-with-transferred-sources.md`](./docs/adr/0001-single-origin-suite-with-transferred-sources.md).

---

## 2. Prerequisites

- **Node.js `24.11.1`** and **npm** (pinned via `.nvmrc` and `.node-version`).
- A modern browser (Chrome, Edge, Brave, or Safari) for local use; **Android Chrome** for installing the Suite onto a phone.
- **Optional (`cloudflared`)**: Required on `PATH` for the one-command phone installation workflow (`./offline-chess --install-mobile` on macOS or Linux).
- **Optional (Full Lichess Puzzle Index)**: To build the full local puzzle index for Woodpecker Generator instead of using the checked-in sample index, place `lichess_db_puzzle.csv.zst` under `apps/woodpecker/puzzles-database/` and ensure `zstd` is installed.

---

## 3. Local Development & Preview

Each transferred Tool retains its own `package.json` and lockfile under `apps/`, while the root orchestrates building, assembling, previewing, and testing the complete Suite.

1. **Install root dependencies**:

   ```bash
   npm install
   ```

2. **Build the complete Suite into `dist/`**:

   ```bash
   npm run build
   ```

   `npm run build` automatically installs any missing per-Tool dependencies (`apps/blind-chess`, `apps/pgn-reader`, `apps/woodpecker`), compiles each Tool's browser build, assembles the Landing Page and all four Tools into `dist/`, and generates the root service worker `dist/sw.js`.

3. **Start the local static preview server**:

   ```bash
   npm run preview
   ```

   By default, the preview server listens at `http://127.0.0.1:4170` (configurable via `OFFLINE_CHESS_PORT` and `OFFLINE_CHESS_HOST`).

---

## 4. Running Tests

### Suite Tests (Root)

Run both the Mobile Install CLI tests and the Playwright E2E test suite against the assembled Suite build:

```bash
npm test
```

You can also run the root test suites individually:

```bash
# Run Mobile Install CLI tests (--install-mobile and --shutdown)
npm run test:cli

# Run Playwright E2E tests across the Landing Page and all four Tools
npm run test:e2e
```

To use a custom port for the Playwright E2E test server:

```bash
OFFLINE_CHESS_TEST_PORT=4189 npm run test:e2e
```

### Per-Tool Test Suites

Each Tool directory under `apps/` preserves its standalone unit and integration tests:

```bash
# Blind Chess Vitest suite
npm --prefix apps/blind-chess test

# PGN Reader Vitest and Playwright suites
npm --prefix apps/pgn-reader test
npm --prefix apps/pgn-reader run test:wide
npm --prefix apps/pgn-reader run test:mobile

# Woodpecker Generator, Trainer, and Domain Vitest suites
npm --prefix apps/woodpecker test
```

---

## 5. Production Deployment

Offline Chess is a static single-origin web application with no backend server requirement in production.

1. Build the Suite:

   ```bash
   npm ci
   npm run build
   ```

2. Deploy the contents of `dist/` to the **root of an HTTPS origin** on any static web host.
   - `/` serves the Landing Page, `/manifest.webmanifest`, and `/sw.js`.
   - `/blind-chess/`, `/pgn-reader/`, `/woodpecker-generator/`, and `/woodpecker-trainer/` serve the four Tools.

3. Open the HTTPS origin once in a browser while online. Once the root service worker activates, the Landing Page and all four Tools are precached for offline use and can be installed as a standalone app from the browser menu.

---

## 6. Phone Installation Workflow (`./offline-chess`)

To install Offline Chess onto an Android phone directly from a macOS or Linux machine without deploying to a permanent host:

1. Ensure `cloudflared` is installed and available on `PATH` (for example, `brew install cloudflared` on macOS).
2. Run the mobile install command from the repository root:

   ```bash
   ./offline-chess --install-mobile
   ```

   This command:
   - Verifies prerequisites (`cloudflared` and local port availability, defaulting to `OFFLINE_CHESS_PORT=4170`),
   - Installs dependencies (`npm install`) and builds the complete Suite (`npm run build`),
   - Starts the local static preview server in the background,
   - Opens a temporary HTTPS Cloudflare Quick Tunnel (`https://*.trycloudflare.com`), and
   - Prints the public HTTPS URL (reusing the running session if invoked again while healthy).

3. Open the printed `https://*.trycloudflare.com` URL in **Android Chrome** while online, wait briefly for the service worker to finish precaching, and select **Install app** or **Add to Home screen** from Chrome's menu.
4. When finished, cleanly stop the background preview server and Cloudflare tunnel:

   ```bash
   ./offline-chess --shutdown
   ```
