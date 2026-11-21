# Separate PGN Reader Library and focused Study

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/7

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Give PGN Reader a clear Library for importing and finding games and a focused Study view for board and notation, using the approved visual identity.

## Acceptance criteria

- [x] Library supports retained sources, PGN import, game search and selection without crowding the focused Study view.
- [x] Study provides board and notation with useful wide-screen composition and a readable phone layout.
- [x] Keep moves, variations, comments, annotations, game metadata, parser warnings, and raw-PGN access available; secondary content may move but must not disappear.
- [x] Provide a clear Library/Study return path that preserves the current in-memory study position; durable reopening is delivered by the dependent resumption ticket.
- [x] Apply shared branding and richer Ink & Brass in both Themes, readable serif/sans-serif hierarchy, and accessible controls without replacing production chess artwork or dropping attribution.
- [x] Existing imported sources remain usable; keep the current source/game identities and data safe.
- [x] Add browser journeys with deterministic PGNs covering import, search, game opening, variation navigation, Library/Study return, and representative phone/desktop keyboard/touch layouts.

## Blocked by

- https://github.com/zwka/offline-chess/issues/4 — Branded Landing Page and Suite visual identity.

## Answer

Implemented a named Library and focused Study using shared Open board/Offline Chess branding and Ink & Brass tokens. Study uses a larger side-by-side board/notation layout on desktop; phones put board and notation before secondary Game tags, warnings, raw PGN, and Cburnett attribution. Existing piece assets are unchanged.

Back to Library retains the live reader rather than destroying its move tree. Return to Study restores the same variation, orientation, and expanded notation. Library searches, retained-source selection, and new imports do not replace the retained Study. Game navigation follows the studied source, not a subsequently browsed source. Hidden reader keyboard shortcuts are inactive, and view changes move focus explicitly. Removing the studied source clears its live Study. No storage schema, source/game identities, parser, or source bytes changed.

Usage and scope: [PGN Reader Library and Study](../../../docs/pgn-reader-study.md). Exact durable resumption remains ticket #8, not part of this implementation.

### Verification

- TDD at the spec-approved assembled-Suite browser seam: new journeys first failed for the missing Library; a second red/green slice caught secondary details preceding phone notation.
- `OFFLINE_CHESS_TEST_PORT=4207 npm run test:e2e -- tests/e2e/pgn-reader.spec.ts tests/e2e/pgn-library-study.spec.ts tests/e2e/pwa-offline.spec.ts --workers=2`: **11 passed**. Deterministic real PGNs exercise imports/search, annotations/graphics, variations, exact Library return, browsing/importing another source, source-correct game navigation, warnings/raw PGN, retained sources after reload, Theme, keyboard, touch, and offline operation.
- Screenshot review: phone Library, phone Study, and wide Study; both Themes generated at 390px/1440px under `test-results/reader-library-*` and `test-results/reader-study-*`. Real touch journey also covers 320px and 44px primary controls.
- `npm --prefix apps/pgn-reader run typecheck`: passed.
- Reader Vitest: `mobile-library`, `mobile-install`, `contracts`: **27 passed**; `mobile-static`, `mobile-install`, `mobile-library`: **33 passed** (overlapping suites). Existing migration/identity and parser contracts remain green.
- `npm run test:cli`: **7 passed**.
- Broader Suite browser run: **47/48 passed**. The unmodified `offline-readiness.spec.ts` “a worker update rechecks the new build rather than retaining old success” timed out waiting for “Tools incomplete”; the same test also failed in an isolated rerun. No readiness implementation or test was changed for this ticket.
- No push, PR, or remote issue closure.
