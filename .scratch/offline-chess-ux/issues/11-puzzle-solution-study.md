# Study a Puzzle solution in Reader and return to its Run

Status: claimed
GitHub issue: https://github.com/zwka/offline-chess/issues/14

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Connect completed/revealed Trainer Puzzles to a separate recorded-line Reader view, preserving both the originating Run and the player's unrelated PGN study.

## Acceptance criteria

- [ ] Study solution is available only after Puzzle completion or explicit solution reveal; an incorrect move alone must not expose the answer through this route.
- [ ] Open a clearly labeled separate Puzzle Solution Study view with playable supplied moves, not engine analysis or automatic PGN Library insertion.
- [ ] Construct the correct starting position and full legal line using the Puzzle's setup-move interpretation, side to move, and promotions; do not serialize against the wrong FEN.
- [ ] Preserve existing PGN source/game/move/variation independently; switching back to ordinary Reader study restores it unchanged.
- [ ] Return to Trainer retains the same Run and Puzzle without duplication, abandonment, score changes, or automatic timing while reviewing in Reader.
- [ ] Work offline, restore solution context after reload/reopening, and explain missing/deleted origins with safe normal navigation instead of fabricating a Run or a blank view.
- [ ] Retain both Themes, responsive layouts, shared identity, and keyboard/touch access using existing Reader playback capabilities rather than a new engine or annotation editor.
- [ ] Browser-test solved/revealed entry, premature-access prevention, full-line fixtures including setup/side/promotion, unrelated-study preservation, reload/offline return, missing origins, and unchanged scoring/timers.

## Blocked by

- https://github.com/zwka/offline-chess/issues/8 — Resume PGN Reader at the exact move and variation.
- https://github.com/zwka/offline-chess/issues/11 — Trainer solving workspace and safe Run resumption.
