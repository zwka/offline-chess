# Resume Blind Chess rounds without losing time or answers

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/6

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Keep an unfinished Blind Chess round available across leaving, reload, and reopening, with an explicit Resume or Start fresh choice and no automatic clock restart.

## Acceptance criteria

- [x] Persist drill, current prompt, accumulated answers/results, and remaining time as activity changes, not only at unload.
- [x] Leaving or hiding pauses the round; returning to the unfinished activity offers Resume/Start fresh without consuming time until explicit Resume.
- [x] Resume restores the actual prompt and remaining time rather than generating a new round or resetting the clock. Preserve untimed preparation and first-answer timing for a round not yet started.
- [x] Start fresh explains and confirms replacement; cancellation retains the round, and replacement keeps completed Attempt history and personal bests.
- [x] Completed rounds do not create misleading resume prompts or duplicate completed Attempts.
- [x] Handle unavailable/quota-limited/interrupted storage and invalid saved state honestly without blocking existing history or claiming an unsuccessful save succeeded.
- [x] Cover navigation away, reload, persisted-browser reopening, pause/resume, replacement/cancellation, storage failures, and completed-history preservation using browser journeys and focused storage/controlled-clock tests.

## Blocked by

- https://github.com/zwka/offline-chess/issues/5 — Blind Chess preparation and clear timing.

## Answer

Verified complete on `ux/ticket-06`, based on integration `4101e95` (ancestry confirmed), with latest integration `013b0fa` merged in `9834518` before final verification.

- Implemented in `7ab36e8`: versioned Saved Activity storage isolated from history; exact per-drill prompt, feedback, answer/score counts and remaining milliseconds; untimed preparation/ready state; explicit Resume and confirmed atomic Start fresh; pause on hidden/Exit/navigation; ongoing checkpoints rather than unload-only saving.
- Stable round/Attempt identity and completion receipts recover interrupted history saves idempotently and suppress stale completed-round checkpoints when activity writes/removal fail. Unreadable history is not overwritten. Invalid/unavailable activity storage leaves history accessible; failed saves warn, retain in-memory work and offer retry.
- #13 integration contract and storage limits: [`docs/blind-chess-saved-activity.md`](../../../docs/blind-chess-saved-activity.md). Dispatch cancelable `offline-chess:before-navigate` on `window`; navigate only if dispatch returns true. Ordinary anchor/brand navigation already uses the guard.
- RED/GREEN observed for the missing storage boundary, missing browser resume behavior, unsafe overwrite of unreadable history, contradictory feedback validation, and stale-completed-round failure path.
- `npm test --prefix apps/blind-chess`: **51 passed**.
- After integration merge, `OFFLINE_CHESS_TEST_PORT=4206 npm run test:e2e -- tests/e2e/blind-chess.spec.ts tests/e2e/blind-chess-resume.spec.ts tests/e2e/landing-page.spec.ts tests/e2e/pwa-offline.spec.ts`: **41 passed** (includes Suite production build). Covers all six drills, exact controlled-clock restoration, navigation, reload, new browser context with persisted storage, pause/hidden/return, replacement cancellation/confirmation, completion/history preservation, quota/unavailable/corrupt/interrupted writes, and successful retry.
- Phone/desktop light/dark checks include keyboard order, touch targets and screenshots; reviewed saved-choice screenshots at 320px dark and 1440px light. `git diff --check` passed.

No known ticket-scope gaps. Browser automation is Chromium, not a physical installed-device run. Storage eviction/total denial cannot guarantee durability; the UI warns rather than promising it. Abrupt process loss is bounded by the last successful activity checkpoint (visible clocks checkpoint every 100ms).

No push, PR, or remote issue closure performed.
