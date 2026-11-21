# Resume PGN Reader at the exact move and variation

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/8

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Restore the player's actual PGN study after leaving, reloading, or reopening instead of merely reopening the same game at its starting position.

## Acceptance criteria

- [x] Persist a stable source/game/move/variation location as the study changes, not just at unload.
- [x] Ordinary entry with unfinished study offers Resume/Start fresh; Resume restores the exact selected node and its associated board/notation context.
- [x] Start fresh clearly explains and confirms replacement of unfinished study while retaining imported PGNs and completed history; cancellation retains the prior study.
- [x] Missing sources/games/nodes, older bookmarks, corrupted state, and storage failures produce safe recovery without blocking otherwise valid Library content or falsely reporting a successful save.
- [x] Library/Study navigation preserves the activity; creating a future separate Puzzle Solution Study context must not require replacing the normal study bookmark.
- [x] Use real deterministic PGNs with nested variations to test leaving, reload, persisted-browser reopening, exact node restoration, replacement/cancellation, migrations, and missing-content recovery.

## Blocked by

- https://github.com/zwka/offline-chess/issues/7 — Separate PGN Reader Library and focused Study.

## Answer

Implemented durable normal Study in an independent versioned bookmark store: source/Game record IDs, raw-game SHA-256 digest, exact variation path plus expected FEN, and board orientation. Every selection/flip writes synchronously, without unload/debounce dependence. Resume restores the exact nested token, board, comments, and revealed notation ancestors. Start fresh and different-game replacement explain retention and require confirmation; cancellation preserves the prior Study. Imported content/history are never cleared by the bookmark store.

Recovery covers missing sources/games/nodes, changed game bytes, older game-only bookmarks, corrupt metadata, denied reads, and quota-failed writes. A malformed older bookmark no longer rejects otherwise valid Library PGNs. Failed Start fresh keeps the live Study. Explicitly cleared activity cannot be resurrected by automatic legacy migration.

Integration seams are documented in [PGN Reader Library and Study](../../../docs/pgn-reader-study.md): #13 can rely on synchronous `onPositionChange`/`NormalStudyBookmark.save` before navigation; #14 can provide its own Reader position callbacks and storage without touching normal Study or importing solution sources.

Verification after merging integration tip `013b0fa`:

- `OFFLINE_CHESS_TEST_PORT=4208 npm run test:e2e`: **95 passed**, including 16 new resumption tests and all prior Reader, offline, Theme, Handoff, and Trainer journeys.
- Reader `npm run typecheck`: passed.
- Reader `npm test -- --exclude tests-ts/contracts.test.ts`: **117 passed**.
- Root `npm run test:cli`: **7 passed**.
- Reviewed Resume screenshots at 390px/1440px in light/dark, with 44px targets and visible keyboard focus; existing Study screenshots still verify focused reading.
- First exact-resumption tracer failed at absent Resume; the older-bookmark recovery tracer failed because valid Library content disappeared, before implementation made both green.

The reopening test closes Chromium and relaunches against the same actual on-disk profile, not only React state or a fresh browser page. Browser eviction is not a backup guarantee; older bookmarks cannot recover positions they never stored. The known worker-update readiness test failed in an earlier broad run and passed in the final full run; no readiness code/test was weakened or changed for this ticket.
