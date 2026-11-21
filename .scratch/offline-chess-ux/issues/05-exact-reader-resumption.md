# Resume PGN Reader at the exact move and variation

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/8

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Restore the player's actual PGN study after leaving, reloading, or reopening instead of merely reopening the same game at its starting position.

## Acceptance criteria

- [ ] Persist a stable source/game/move/variation location as the study changes, not just at unload.
- [ ] Ordinary entry with unfinished study offers Resume/Start fresh; Resume restores the exact selected node and its associated board/notation context.
- [ ] Start fresh clearly explains and confirms replacement of unfinished study while retaining imported PGNs and completed history; cancellation retains the prior study.
- [ ] Missing sources/games/nodes, older bookmarks, corrupted state, and storage failures produce safe recovery without blocking otherwise valid Library content or falsely reporting a successful save.
- [ ] Library/Study navigation preserves the activity; creating a future separate Puzzle Solution Study context must not require replacing the normal study bookmark.
- [ ] Use real deterministic PGNs with nested variations to test leaving, reload, persisted-browser reopening, exact node restoration, replacement/cancellation, migrations, and missing-content recovery.

## Blocked by

- https://github.com/zwka/offline-chess/issues/7 — Separate PGN Reader Library and focused Study.
