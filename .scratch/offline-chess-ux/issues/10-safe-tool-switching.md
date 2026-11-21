# Switch directly between Tools without losing work

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/13

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Provide the compact, consistent Switch Tool control in every Tool, backed by completed durable-activity behavior so direct navigation is safe rather than silently destructive.

## Acceptance criteria

- [x] All four Tools are directly available inside each Tool; no separate Landing Page item appears in the switcher and no switcher is added to the Landing Page.
- [x] Clicking the symbol/Offline Chess brand returns to the Landing Page while preserving unfinished work.
- [x] Switching retains exact Reader study, Generator filters/output, Trainer Run progress, and paused Blind Chess activity across same-window navigation and reopening.
- [x] Destination unfinished activity presents Resume/Start fresh as specified; merely visiting must not restart timers or abandon Runs.
- [x] Save failure cannot be silently presented as safe navigation: give an honest warning and a safe way to remain when unfinished changes are at risk.
- [x] Accessible focus, dismissal, keyboard/touch use, active-Tool indication, and compact phone/desktop layouts work in both Themes with existing URLs and offline navigation.
- [x] Browser-test round trips involving all four Tools, brand navigation, data retention, timers, offline navigation, and a failed-save path; retain direct Generator Handoff behavior.

## Blocked by

- https://github.com/zwka/offline-chess/issues/6 — Resume Blind Chess rounds without losing time or answers.
- https://github.com/zwka/offline-chess/issues/8 — Resume PGN Reader at the exact move and variation.
- https://github.com/zwka/offline-chess/issues/10 — Keep Generator filters and output across reopening.
- https://github.com/zwka/offline-chess/issues/11 — Trainer solving workspace and safe Run resumption.

## Answer

Implemented on `ux/ticket-13`, created from integration `3bc3354` with ancestry confirmed; merged latest integration `0347fa2` (including #14) without conflicts and rechecked that integration was up to date before completion.

- Added one shared compact header disclosure to the four assembled Tools only, using existing identity tokens/symbols, four plain destination anchors, visible/current-page indication, 44px targets, focus outlines, keyboard/touch use and Escape/outside/focus-leave dismissal. Current-Tool selection dismisses without a reload or round interruption. The brand remains the Landing Page route.
- Preserved Trainer's asynchronous anchor checkpoint and the synchronous cancelable checkpoint event for the other Tools. Failed saves remain on the Tool with an honest warning; retry saves before departure. Reader now retries its live exact bookmark before navigation. Generator's direct Do Puzzles Handoff and existing cross-links remain intact.
- #14 integration exposed a separate solution-position failure gap. Added an independent solution-context event checkpoint, with safe Return to Trainer/Library departures and no normal-study or Run writes. Regression coverage confirms separate normal/solution restoration and a paused Trainer return with unchanged Active Solving Time.
- Added real offline four-Tool round trips and an on-disk Chromium profile close/reopen, comparing a nested Reader variation/orientation, exact Generator JSON and filters, whole-line Trainer progress/Run identity with exactly 5,500ms solving time, and Blind Chess prompt/answers/47.7-second remaining time. Tested all four storage failure gates and recovery. Updated Blind Chess's existing Tab-order expectations to include the new control.

Verification after merging #14:

- `OFFLINE_CHESS_TEST_PORT=4213 npm run test:e2e -- --workers=2`: **157 passed**, including 15 Tool-switching tests and all Solution Study, Handoff, resumption, timer, archive, Theme and offline journeys.
- `npm run test:cli`: **7 passed**.
- `npm --prefix apps/pgn-reader run typecheck`: passed.
- `npm --prefix apps/woodpecker run typecheck`: passed.
- `npm --prefix apps/woodpecker test`: **41 passed**, **14 opt-in mobile-install tests skipped**.
- `npm test --prefix apps/blind-chess`: **51 passed**.
- Reviewed representative 320px/1440px light/dark screenshots; regenerable evidence is under `test-results/tool-switching-*`. See `docs/tool-switching.md` for the navigation contract.

No known ticket gaps. Browser touch emulation is not physical-device installation or screen-reader verification; browser eviction/process termination cannot be guaranteed against. No push, PR, or remote issue closure performed.
