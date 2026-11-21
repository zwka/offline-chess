# Study a Puzzle solution in Reader and return to its Run

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/14

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Connect completed/revealed Trainer Puzzles to a separate recorded-line Reader view, preserving both the originating Run and the player's unrelated PGN study.

## Acceptance criteria

- [x] Study solution is available only after Puzzle completion or explicit solution reveal; an incorrect move alone must not expose the answer through this route.
- [x] Open a clearly labeled separate Puzzle Solution Study view with playable supplied moves, not engine analysis or automatic PGN Library insertion.
- [x] Construct the correct starting position and full legal line using the Puzzle's setup-move interpretation, side to move, and promotions; do not serialize against the wrong FEN.
- [x] Preserve existing PGN source/game/move/variation independently; switching back to ordinary Reader study restores it unchanged.
- [x] Return to Trainer retains the same Run and Puzzle without duplication, abandonment, score changes, or automatic timing while reviewing in Reader.
- [x] Work offline, restore solution context after reload/reopening, and explain missing/deleted origins with safe normal navigation instead of fabricating a Run or a blank view.
- [x] Retain both Themes, responsive layouts, shared identity, and keyboard/touch access using existing Reader playback capabilities rather than a new engine or annotation editor.
- [x] Browser-test solved/revealed entry, premature-access prevention, full-line fixtures including setup/side/promotion, unrelated-study preservation, reload/offline return, missing origins, and unchanged scoring/timers.

## Blocked by

- https://github.com/zwka/offline-chess/issues/8 — Resume PGN Reader at the exact move and variation.
- https://github.com/zwka/offline-chess/issues/11 — Trainer solving workspace and safe Run resumption.

## Answer

Implemented on `ux/ticket-14`, based on integration `c1772c1` (#8 and #11 included), with latest integration `3bc3354` merged before final verification.

- Completed/revealed Puzzles expose Study solution; incorrect moves and unsolved retries do not. Reader independently rechecks origin identity and the gate before playback.
- Supplied-line conversion starts after the automatic setup move, preserving FEN/turn/fullmove, promotions, castling and en-passant rights, and the complete legal continuation.
- Separate versioned solution context stores stable origin IDs and exact Reader position. It uses existing Reader playback without inserting a Library source or modifying normal PGN bookmarks. Reload and persisted-browser reopening retain it; ordinary Reader entry offers a separate Resume Puzzle Solution Study link.
- Return loads the same Run and current Puzzle paused until explicit Resume solving. Already advanced/completed origins open their existing Run history rather than rewind scored progress. No Run is created/replaced/abandoned and Reader never writes Run records. An explicit return does not consume an unrelated pending Generator Handoff.
- Missing/deleted/changed origins and storage failures explain recovery with normal Tool links. Suite identity, Themes, existing artwork, keyboard and touch controls remain intact.
- Integration/storage/navigation contracts and the #13 switcher seam are documented in `docs/puzzle-solution-study.md`; normal Reader callbacks and Trainer's existing anchor checkpoint remain unchanged.

### Verification

- `OFFLINE_CHESS_TEST_PORT=4214 npm run test:e2e -- tests/e2e/puzzle-solution-study.spec.ts tests/e2e/pgn-resumption.spec.ts tests/e2e/pgn-reader.spec.ts tests/e2e/pgn-library-study.spec.ts tests/e2e/woodpecker-resume.spec.ts tests/e2e/woodpecker-active-time.spec.ts tests/e2e/woodpecker-handoff.spec.ts tests/e2e/woodpecker-archive.spec.ts tests/e2e/woodpecker-tools.spec.ts --workers=2` — **64 passed**, including **13 new solution-study browser tests**.
- `npm --prefix apps/woodpecker run typecheck` — passed; Reader mobile TypeScript compilation also passed in the assembled build.
- `npm --prefix apps/woodpecker test` — **41 passed**, **14 existing opt-in mobile-install skips**; includes 3 new focused conversion tests.
- `npm run test:cli` — **7 passed**.
- Reviewed solution screenshots at 390px and 1440px in light/dark; deterministic fixtures exercise black full-line/white underpromotion, unrelated nested variation/orientation, persisted reopening, offline reload/return, missing origin, write failure, first-try/eventual completion, and controlled-clock review/return with unchanged Run records.
- No implementation acceptance gaps identified. Physical-device installation was not tested; browser storage remains subject to eviction. No push, PR, or remote issue closure performed.
