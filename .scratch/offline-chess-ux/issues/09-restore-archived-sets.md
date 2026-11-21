# Browse and restore Archived Puzzle Sets

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/12

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Make archiving reversible through a Trainer view that lists Archived Puzzle Sets and lets the player restore them without relying on Run History or a repeated Handoff.

## Acceptance criteria

- [x] Provide a discoverable Archived Puzzle Sets view containing both previously played and never-played archived sets, with clear empty state and Restore controls.
- [x] Restore the original Puzzle Set identity and retain every associated Run and score; it reappears in the normal Library without duplication.
- [x] Keep archiving/restoring distinct from explicit deletion and preserve established delete semantics.
- [x] Work offline, retain existing backup compatibility, and handle failed restoration honestly without a false success message.
- [x] Use existing Trainer styling/components so this independent slice can land before the visual refresh and inherit its later treatment without a parallel design system.
- [x] Cover archive discovery, never-played sets, restoration, existing Run/history preservation, reload/offline operation, and failure handling through browser and existing storage tests.

## Blocked by

None (can start immediately).

## Answer

Implemented an Archived Puzzle Sets view accessible from the Library toolbar, reusing the existing Library layout and SetCard. Restore changes only the existing archived flag after persistence succeeds; identity, Runs, scores, backup schema, Handoff, and explicit confirmed deletion remain unchanged. Includes empty state, never-played identification, duplicate-action disabling, and retryable persistence errors for archive/restore.

Verification:

- Red → green: the first browser journey initially failed at the missing Archived Puzzle Sets control, then passed after implementation.
- `OFFLINE_CHESS_TEST_PORT=4212 npm test`: 7 CLI tests and 24 assembled-Suite browser tests passed, including 4 new archive journeys.
- Browser journeys cover offline reload/restoration, never-played discovery, backup-imported completed/abandoned/active Run preservation through exported backups, score history, restore failure via aborted real IndexedDB transaction, retry, deletion cancellation/confirmation, phone layout, both Themes, and keyboard activation.
- `npm --prefix apps/woodpecker run test`: all 52 existing/new storage, chess/scoring, timer, Handoff, and other workspace tests passed; includes 2 new archive storage regressions.
- `npm --prefix apps/woodpecker run typecheck`: passed.
- Phone archive screenshots reviewed in both Themes; no separate styling system or storage migration introduced.

No ticket-specific gaps. Shared identity/navigation and root readiness are deliberately outside this slice.
