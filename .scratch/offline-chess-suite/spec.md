# Offline Chess Suite

Status: ready-for-agent

## Problem Statement

Chess players who use the standalone offline training and study apps—Blind Chess, PGN Reader, Woodpecker Generator, and Woodpecker Trainer—currently have to deploy, visit, and install four separate web apps across different origins. Each app manages its own service worker, web manifest, and visual theme settings independently. Furthermore, moving a generated Puzzle Set from Woodpecker Generator into Woodpecker Trainer requires manually exporting a JSON file to the device filesystem and re-importing it through a file picker.

## Solution

Combine the three Source Apps into a single installable, offline-first Suite named "Offline Chess" served from one origin. A minimal Landing Page at the root links to all four Tools—Blind Chess, PGN Reader, Woodpecker Generator, and Woodpecker Trainer—mounted at flat subpaths. Only the Suite is installable as a PWA, and a single root service worker precaches the Landing Page and all four Tools so the entire Suite works offline on Android and desktop browsers after a single online visit. Every surface shares a consistent visual Theme (light and dark only, defaulting to dark) controlled by a unified Sun/Moon toggle, and Woodpecker Generator gains a direct Handoff ("Do Puzzles") that imports a generated Puzzle Set straight into Woodpecker Trainer and begins or resumes solving immediately.

## User Stories

1. As a chess player, I want to open the Offline Chess Landing Page at the root of the Suite, so that I have a single entry point to access all four chess Tools.
2. As a chess player, I want to see four cards on the Landing Page in the order Blind Chess, PGN Reader, Woodpecker Generator, and Woodpecker Trainer, each showing its Tool icon, name, and one-line description, so that I can quickly recognize and launch the Tool I want.
3. As a chess player on Android, I want to install Offline Chess once from the browser menu, so that a single home-screen icon gives me standalone access to the Landing Page and all four Tools.
4. As a chess player on Android, I want per-Tool web manifests and service workers removed, so that my browser never prompts me to install individual Tools separately from the Suite.
5. As a chess player, I want the Suite to precache the Landing Page and all four Tools during initial installation, so that every Tool works completely offline even if I have never opened that specific Tool while online.
6. As a chess player, I want to navigate from the Landing Page into any Tool and use my device or browser back gesture to return to the Landing Page, so that each Tool's interface remains uncluttered by extra navigation bars.
7. As a chess player, I want the Suite to default to the dark Theme on my first visit, so that I get a comfortable low-glare appearance out of the box.
8. As a chess player, I want only two Theme options—light and dark—across the Landing Page and all four Tools, so that the visual mode is simple and predictable everywhere.
9. As a chess player, I want the same Sun/Moon icon button in the header of the Landing Page and every Tool, so that switching between light and dark works identically everywhere in the Suite.
10. As a chess player, I want my Theme choice (light or dark) saved in one shared Suite preference, so that toggling the Theme on the Landing Page or inside any Tool immediately applies when I open any other Tool.
11. As a chess player, I want PGN Reader to adopt the Suite's warm paper/deep green light palette, deep green-black/mint dark palette, Inter typography, and Woodpecker Trainer's chessboard square colors, so that all four Tools look and feel like parts of one cohesive Suite.
12. As a chess player, I want every Tool and the Landing Page to display the Suite's neon line-art chess knight icon as its browser favicon and Apple touch icon, while the Landing Page cards retain each Tool's individual neon artwork icon, so that the Suite has a unified brand identity without losing each Tool's visual character.
13. As a chess player using Blind Chess inside the Suite, I want all six 60-second blindfold drills, attempt history, and personal bests to work identically to the standalone Source App, so that I lose no training capabilities.
14. As a chess player using PGN Reader inside the Suite, I want importing PGN sources, searching games, stepping through moves and variations, viewing board annotations, and retaining my mobile library offline to work identically to the standalone Source App.
15. As a chess player using Woodpecker Generator inside the Suite, I want filtering puzzles by rating and Tactic Theme, reproducible seed generation, sample-index fallback, and optional full puzzle index streaming/caching (including HEAD size probes) to work identically to the standalone Source App without precaching the multi-hundred-megabyte full index at install time.
16. As a chess player using Woodpecker Trainer inside the Suite, I want solving Puzzle Sets with first-try scoring, tracking Runs and Archived Puzzle Sets, and importing/exporting backups and JSON files to work identically to the standalone Source App.
17. As a chess player in Woodpecker Generator or Woodpecker Trainer, I want the header cross-link to the sibling Woodpecker Tool ("Trainer →" or "Generator →") to always be visible and navigate within the same window, so that moving between them never breaks out of the installed standalone Suite window into an external browser tab.
18. As a chess player who has just generated a Puzzle Set in Woodpecker Generator, I want a primary "Do Puzzles" button alongside "Export JSON", so that I can either start solving immediately via Handoff or still download the JSON file for backup/sharing.
19. As a chess player clicking "Do Puzzles" on a newly generated Puzzle Set, I want the Suite to hand off the Puzzle Set to Woodpecker Trainer, navigate to Woodpecker Trainer in the same window, validate and store the Puzzle Set, and automatically start a Run on the first Puzzle, so that I can begin solving without touching the filesystem.
20. As a chess player clicking "Do Puzzles" on a Puzzle Set that already exists in Woodpecker Trainer (matched by content hash), I want Woodpecker Trainer to resume the existing active Run for that Puzzle Set—or start a new Run if no Run is currently active—without duplicating the Puzzle Set or silently abandoning an active Run.
21. As a developer or player installing the Suite onto a phone from a local machine, I want a single command to build the Suite, serve the assembled output locally, and open a temporary HTTPS tunnel, plus a companion shutdown command, so that I can install the entire Suite on Android with one step.

## Implementation Decisions

- **Monorepo via Git Subtree Transfer**: Each of the three Source Apps is imported into the Suite repository under its own tool directory using `git subtree` so commit history is preserved while the original Source App repositories remain untouched and frozen. All Suite adaptations are made exclusively inside the Suite repository.
- **Independent Tool Toolchains with Root Assembly**: Each transferred Source App retains its own package manifest and lockfile so existing dependencies and scripts remain isolated. The repository pins Node 24.11.1 at the root. A root build orchestrator compiles the Landing Page and each Tool's browser build, then assembles them into a single static output directory:
  - `/` — Landing Page
  - `/blind-chess/` — Blind Chess
  - `/pgn-reader/` — PGN Reader (browser/mobile build only; server, CLI, and SQLite code remain in the repo for their existing tests)
  - `/woodpecker-generator/` — Woodpecker Generator
  - `/woodpecker-trainer/` — Woodpecker Trainer
- **Subpath Asset & Routing Alignment**: Each Tool is configured or updated so its HTML, scripts, stylesheets, piece SVGs, worker scripts, demo sets, and puzzle index URLs resolve relative to its mounted subpath rather than assuming root (`/`) ownership.
- **Single Suite Manifest & Icon Set**: Per-Tool web app manifests and `<link rel="manifest">` tags are removed from the four Tools. Only the Suite exposes a manifest at the root, declaring `display: "standalone"`, `start_url: "/"`, `scope: "/"`, and the Suite's dark/light theme colors. A newly generated Suite icon—a neon line-art chess knight matching the indigo-to-plum background gradient, subtle wood-grain curves, sparkles, and coral-orange glow of the three Source App icons—is exported at 32×32 (favicon), 180×180 (Apple touch icon), 192×192, 512×512, and 512×512 maskable, and referenced as the favicon/touch icon across the Landing Page and every Tool.
- **Single Root Service Worker**: Per-Tool service worker registrations and worker scripts are replaced by one Suite service worker registered at root scope (`/`).
  - On install, it precaches the complete static shell for the Landing Page and all four Tools (HTML entry points, JS/CSS bundles, piece graphics, icons, manifest, and Woodpecker Trainer's demo set plus Woodpecker Generator's checked-in sample puzzle index).
  - On activate, it claims clients and prunes only outdated Suite caches, never wiping runtime caches unexpectedly.
  - On fetch, it serves precached and runtime-cached assets offline, falls back to the appropriate Tool or Landing Page HTML shell for navigation requests when offline, and preserves Woodpecker Generator's special runtime caching and `HEAD` response synthesis for the optional large generated puzzle index without precaching that file on install.
- **Unified Two-State Theme (Dark Default)**:
  - The Suite defines two Theme states only: `light` and `dark`, with `dark` as the default when no valid preference is stored or when storage is unavailable. The `system` option is removed from Blind Chess, Woodpecker Generator, and Woodpecker Trainer.
  - All five surfaces (Landing Page + four Tools) read and write the same `localStorage` key (`offline-chess.theme.v1`) and set `document.documentElement.dataset.theme` (`"light"` or `"dark"`) along with the matching `<meta name="theme-color">` value on load and on toggle.
  - All five surfaces render a consistent Sun/Moon icon toggle button in their header bar.
  - Visual tokens across the Landing Page and PGN Reader are aligned to the Blind Chess / Woodpecker palette (`#f4f0e7` / `#fbfaf7` warm paper light mode with `#2e625d` / `#1d6b53` deep green accent; `#172321` / `#202f2c` deep green-black dark mode with mint accent; `Inter` sans-serif font stack). PGN Reader's chessboard squares are updated to match Woodpecker Trainer's board square colors (`#e8d6bd` light squares, `#9a6b4d` dark squares).
- **Landing Page Design**: The Landing Page is a lightweight static page containing a header ("Offline Chess" title + Sun/Moon Theme toggle) and four cards in fixed order: Blind Chess, PGN Reader, Woodpecker Generator, and Woodpecker Trainer. Each card displays the Tool's existing neon JPEG icon, title, and concise description, linking directly to the Tool's subpath in the same window. No Home links or extra chrome are added inside the Tools; users return to the Landing Page via the Android/browser back gesture.
- **Woodpecker Cross-Links & Handoff ("Do Puzzles")**:
  - Header links in Woodpecker Generator ("Trainer →" pointing to `/woodpecker-trainer/`) and Woodpecker Trainer ("Generator →" pointing to `/woodpecker-generator/`) are always visible in both development and production builds and navigate in the same browsing context (`_self`).
  - Once Woodpecker Generator produces a Puzzle Set, it displays a primary "Do Puzzles" button next to the secondary "Export JSON" button (requiring a Puzzle Set name just as export does).
  - Pressing "Do Puzzles" writes the generated Puzzle Set payload into a shared IndexedDB handoff inbox on the Suite origin and navigates in the same window to `/woodpecker-trainer/`.
  - On startup, Woodpecker Trainer checks the handoff inbox, consumes and clears any pending Puzzle Set payload, and processes it through its existing `importPuzzleSet` validation and normalization pipeline:
    - If the Puzzle Set is new, it is saved to Woodpecker Trainer's library and a new Run is started atomically so the player lands directly on the first Puzzle.
    - If the Puzzle Set already exists in Woodpecker Trainer (by content hash), it is not duplicated; if it is archived, it is unarchived. Woodpecker Trainer then resumes the existing active Run for that Puzzle Set if one exists, or starts a new Run atomically if no Run is active—never abandoning an in-progress Run.
- **Mobile Install CLI**: A root executable script `./offline-chess` supports `--install-mobile` (builds the Suite, serves the assembled static build on a local port, and opens a Cloudflare Quick Tunnel printing the HTTPS URL) and `--shutdown` (cleanly stops the preview server and tunnel), mirroring the workflow of the Source Apps.

## Testing Decisions

- **Good tests verify observable external behavior at the highest seam**: Tests should interact with rendered pages, public storage contracts, HTTP/service-worker boundaries, and CLI entrypoints rather than asserting private component state or internal helper structure.
- **Primary Seam — Suite E2E Playwright Suite**: A root Playwright suite runs against the assembled static build served over HTTP and verifies:
  - Rendering the Landing Page and navigating into all four Tools and between Woodpecker Generator and Woodpecker Trainer.
  - Serving a single Suite web manifest, registering a single root service worker, precaching all five surfaces on first visit, and loading the Landing Page and all four Tools cleanly when the browser context is offline (including Woodpecker Generator's sample index and `HEAD`/runtime caching behavior for the optional generated index).
  - Defaulting to the `dark` Theme on a fresh profile, toggling between `light` and `dark` via the Sun/Moon button on any surface, and persisting the shared Theme across navigation between the Landing Page and all four Tools.
  - Executing the full Handoff flow: generating a Puzzle Set in Woodpecker Generator, clicking "Do Puzzles", landing in an active Run on Puzzle 1 in Woodpecker Trainer, making a move, and verifying that repeating "Do Puzzles" for the same Puzzle Set resumes that active Run without duplicating the set or abandoning progress.
- **Preserved Per-Tool Test Seams**:
  - Blind Chess Vitest suites (domain, storage, and theme preferences updated for the two-state dark-default contract).
  - PGN Reader Vitest suites and Playwright wide/mobile suites (updated for the Suite palette/theme contract and Suite-owned manifest/service-worker expectations).
  - Woodpecker domain, puzzle-session, offline-index, and service-worker/handoff Vitest suites.
- **Mobile Install CLI Seam**: Automated tests for `./offline-chess --install-mobile` and `./offline-chess --shutdown` using mocked/stubbed tunnel and server processes, modeled on the existing mobile-install command tests in Woodpecker and PGN Reader.

## Out of Scope

- Modifying any code or git history inside the three original Source App repositories (`offline-blindchess`, `offline-pgn-reader`, `offline-woodpecker`).
- Migrating existing browser data (`localStorage` or `IndexedDB`) from previously installed standalone origins into the Suite origin.
- Pre-downloading or precaching Woodpecker Generator's ~437 MB full Lichess puzzle index during Suite installation.
- Adding in-app "Home" or "Back to Suite" navigation buttons inside the individual Tools.
- Merging the three Source Apps into a single shared npm dependency tree or upgrading their framework/test-runner versions where not required by the Suite assembly.
- Shipping PGN Reader's Node Fastify server, SQLite database layer, or CLI in the static Suite production bundle.

## Further Notes

- Domain terminology follows `GLOSSARY.md` (`Suite`, `Landing Page`, `Tool`, `Source App`, `Handoff`, `Theme`, `Puzzle`, `Puzzle Set`, `Tactic Theme`, `Run`, `Abandoned Run`, `Archived Puzzle Set`).
- Architectural trade-offs and the three deliberate functional exceptions (two-state dark-default shared Theme, Generator-to-Trainer Handoff, and always-visible same-window Woodpecker cross-links) are recorded in `docs/adr/0001-single-origin-suite-with-transferred-sources.md`.
