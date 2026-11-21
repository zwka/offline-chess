# Trainer solving workspace and safe Run resumption

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/11

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Deliver the richer Ink & Brass Trainer solving experience and an explicit safe choice to resume an existing Run or start fresh, without changing scoring or losing progress.

## Acceptance criteria

- [x] Apply shared branding and typography, richer brass header/frame/panels, readable boards, and nearby feedback/actions on phone and desktop in both Themes. Preserve production chess artwork and attribution.
- [x] Ordinary entry with unfinished activity offers an informative Resume/Start fresh choice and keeps timing paused until explicit Resume. Multiple Puzzle Sets may retain their existing active Runs.
- [x] Restore current Run/Puzzle/move/error/reveal state across navigation, reload, and reopening; do not duplicate Runs or add closed-Suite wall time.
- [x] Keep Active Solving Time limited to the visible Solve view, excluding entry choices, hidden/away time, and future Reader review; handle persistence failures honestly.
- [x] Start fresh explains and confirms replacement, retains Puzzle Sets and history, and follows existing Abandoned Run semantics rather than deleting the previous Run. Cancellation preserves it.
- [x] Preserve whole-line First-Try Solve, Failure, eventual completion, retries, legal-move checks, and legal mate-in-one alternatives. Revealing retains its first-try scoring consequence.
- [x] Existing explicit Do Puzzles Handoff continues the handed-off set without an incompatible generic entry gate, duplication, or abandonment.
- [x] Cover responsive interactions, persisted Run restoration, explicit resume, replacement/cancellation, storage failure, score regression, and controlled-clock behavior at existing browser/storage/scoring seams.

## Blocked by

- https://github.com/zwka/offline-chess/issues/4 — Branded Landing Page and Suite visual identity.

## Answer

Implemented on `ux/ticket-11`, starting at integration `fc79cbe` with ancestry confirmed. Trainer uses shared Ink & Brass typography, branded Landing Page link, brass board frame/header/panels, accessible touch/focus controls, and unchanged production chess pieces/attribution. The Library is the ordinary paused entry choice for each active Run, showing Puzzle/state/retries/score/time, explicit Resume, and confirmed Start fresh. Replacement uses existing transactional Abandoned Run semantics; multiple sets retain independent active Runs. Handoff remains an explicit direct entry.

Existing durable Run records restore the actual current Puzzle/move/error/reveal/retry state across navigation, reload, and browser reopening without a parallel metadata schema. Same-origin navigation checkpoints before leaving, refuses to claim failed writes succeeded, and preserves a visible storage warning. Optional localStorage demo metadata cannot hide IndexedDB libraries. Solve timing excludes hidden/away/entry time; lifecycle reentry requires Resume and no closed-Suite wall time is added. See [Trainer navigation and persistence seams](../../../docs/trainer-solving.md).

### Verification

- Red/green browser slices established missing informative entry choices, optional-metadata failure, storage alerts, brand navigation, and pre-navigation checkpoint handling before implementation.
- `OFFLINE_CHESS_TEST_PORT=4211 npm run test:e2e -- tests/e2e/woodpecker-resume.spec.ts --workers=2`: 14 passed. Exact whole-line state and failure/reveal/retry persistence, browser reopening, independent Runs, replacement cancellation/confirmation/rollback, invalid/unavailable storage, and 320px/1440px both Themes covered. Representative phone-light and desktop-dark screenshots reviewed.
- Existing Trainer/Handoff/archive/Theme/timing journeys passed. Woodpecker typecheck passed; 38 unit tests passed and 14 opt-in mobile-install tests skipped. Root CLI: 7 passed.
- Post-integration full Suite run: 69/70 passed. The existing `offline-readiness.spec.ts:112` worker-update test also failed isolated (status stays Tools ready). Its code/test is unchanged; the shared project todo already records reproduction on baseline `fc79cbe`. This unrelated readiness issue is not changed or concealed by this Trainer ticket.
- No remote closure, push, or PR. Physical Android installation was not exercised; browser responsive behavior and the existing offline Suite seam were exercised. Abrupt process termination may lose time since the last successful one-second checkpoint, never accrue closed time.
