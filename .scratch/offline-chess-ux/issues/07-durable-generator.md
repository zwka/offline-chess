# Keep Generator filters and output across reopening

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/10

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Return to saved Generator filters and a previously generated Puzzle Set after navigating away, reloading, or reopening without needing another generation scan.

## Acceptance criteria

- [ ] Persist current inputs, including advanced settings, and completed generated output as they change; do not persist the full source index as activity metadata or rely only on unload.
- [ ] Ordinary entry with saved unfinished activity offers Resume/Start fresh; Resume restores both form and valid generated output with the appropriate completion actions.
- [ ] Start fresh explains and confirms the replaced filters/output; cancellation retains them and no imported Trainer content or completed history is deleted.
- [ ] Invalid/older activity state, interrupted writes, unavailable storage, and quota errors recover safely and do not produce false saved-state assurances.
- [ ] Do Puzzles remains an explicit request to start/continue the selected set and preserves content-hash deduplication, unarchiving, and existing active-Run reuse without abandonment.
- [ ] Add browser/storage coverage for leaving, reload, persisted-browser reopening, advanced settings/output restoration, replacement/cancellation, save failure, and repeated Handoff from restored output.

## Blocked by

- https://github.com/zwka/offline-chess/issues/9 — Generator essentials-first workflow with reachable output.
