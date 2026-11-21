# Browse and restore Archived Puzzle Sets

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/12

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Make archiving reversible through a Trainer view that lists Archived Puzzle Sets and lets the player restore them without relying on Run History or a repeated Handoff.

## Acceptance criteria

- [ ] Provide a discoverable Archived Puzzle Sets view containing both previously played and never-played archived sets, with clear empty state and Restore controls.
- [ ] Restore the original Puzzle Set identity and retain every associated Run and score; it reappears in the normal Library without duplication.
- [ ] Keep archiving/restoring distinct from explicit deletion and preserve established delete semantics.
- [ ] Work offline, retain existing backup compatibility, and handle failed restoration honestly without a false success message.
- [ ] Use existing Trainer styling/components so this independent slice can land before the visual refresh and inherit its later treatment without a parallel design system.
- [ ] Cover archive discovery, never-played sets, restoration, existing Run/history preservation, reload/offline operation, and failure handling through browser and existing storage tests.

## Blocked by

None (can start immediately).
