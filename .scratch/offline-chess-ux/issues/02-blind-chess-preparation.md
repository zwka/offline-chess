# Blind Chess preparation and clear timing

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/5

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Apply the approved identity to Blind Chess and let the player choose a drill, read untimed instructions, and explicitly Start before answering.

## Acceptance criteria

- [x] Apply the shared logo/brand link, richer Ink & Brass, and heading/control typography on phone and desktop while retaining appropriate drill-specific layouts.
- [x] Retain all six drills, completed Attempt history, and personal bests.
- [x] Selecting a drill presents instructions and an explicit Start action; preparation consumes no round time.
- [x] Explain and retain the existing 60-second clock start on the first answer, not on drill selection or Start.
- [x] Keep prompts, answer targets, results, and error feedback legible and accessible in both Themes; preserve production functionality rather than substituting the prototype.
- [x] Add browser coverage for drill selection, preparation, Start, first-answer timing, and access to history; use controlled clocks and representative phone/desktop checks.

## Blocked by

- https://github.com/zwka/offline-chess/issues/4 — Branded Landing Page and Suite visual identity.

## Answer

Implemented in `06d4990` on `ux/ticket-05`, based on integration tip `fc79cbe` with ancestry confirmed. Blind Chess uses the shared Open board mark and Offline Chess Landing Page link, Ink & Brass surfaces/board frames, serif headings and sans-serif controls. All six drills now open untimed, drill-specific instructions before explicit Start; the existing first-answer clock remains unchanged. Play again and the empty-history drill link use the same preparation entry. Coordinates now supports normal keyboard button activation and a contrasting focus ring.

Production scoring, prompt generation, completed Attempt storage and Personal Best calculations are unchanged. Durable Saved Activity resumption remains ticket #6, not part of this implementation.

### Verification

- `npm --prefix apps/blind-chess test`: **45 passed**, including all six drills, first-answer timing, legacy history and per-drill Personal Best/storage tests.
- `npm run test:cli`: **7 passed**.
- `OFFLINE_CHESS_TEST_PORT=4205 npm run test:e2e -- --workers=1`: **48 passed / 1 failed**. All **9 Blind Chess browser tests pass**, including six-drill entry/preparation/Start/first-answer journeys at 320px, 390px and 1440px in both Themes; exact controlled-clock completion, correct/error feedback contrast, keyboard order/activation, completed history and reload persistence, and brand navigation. Suite offline operation and Handoff checks pass.
- Browser clocks are paused between explicit advances, avoiding screenshot time consuming round time. Representative preparation, answer/error, result and history PNGs under `test-results/blind-chess-*` were visually reviewed; these are regenerable local artifacts.
- `git diff --check` passes. The assembled Suite builds successfully as part of browser verification. Builds and dependencies are isolated in the ticket worktree; all browser runs use port 4205.

Remaining integration verification gap: the unchanged `tests/e2e/offline-readiness.spec.ts:112` worker-update test times out waiting for “Tools incomplete” while the Landing Page still reports “Tools ready”. This reproduced with both one and two browser workers; readiness production code and tests are untouched by this ticket. One earlier build also exceeded the 120-second server-start limit during concurrent sibling builds. These are recorded rather than hidden or fixed outside this slice. No #5 acceptance gaps remain; no push, PR or GitHub closure was performed.
