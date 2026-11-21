# Keep Generator filters and output across reopening

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/10

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Return to saved Generator filters and a previously generated Puzzle Set after navigating away, reloading, or reopening without needing another generation scan.

## Acceptance criteria

- [x] Persist current inputs, including advanced settings, and completed generated output as they change; do not persist the full source index as activity metadata or rely only on unload.
- [x] Ordinary entry with saved unfinished activity offers Resume/Start fresh; Resume restores both form and valid generated output with the appropriate completion actions.
- [x] Start fresh explains and confirms the replaced filters/output; cancellation retains them and no imported Trainer content or completed history is deleted.
- [x] Invalid/older activity state, interrupted writes, unavailable storage, and quota errors recover safely and do not produce false saved-state assurances.
- [x] Do Puzzles remains an explicit request to start/continue the selected set and preserves content-hash deduplication, unarchiving, and existing active-Run reuse without abandonment.
- [x] Add browser/storage coverage for leaving, reload, persisted-browser reopening, advanced settings/output restoration, replacement/cancellation, save failure, and repeated Handoff from restored output.

## Blocked by

- https://github.com/zwka/offline-chess/issues/9 — Generator essentials-first workflow with reachable output.

## Answer

Implemented on `ux/ticket-10`, created from integration tip `4101e95` with
`64a4d96` confirmed as an ancestor. Merged integration `013b0fa`, then latest
integration `c1772c1` (Reader and Blind Chess resumption), before final verification.

- Generator persists one versioned, atomic localStorage record as filters and
  completed output change. It contains no source index or Trainer state.
- Entry and back-forward-cache reentry offer an informative Resume/Start fresh
  choice. Resume restores advanced values, exact output and completion actions
  without another scan. Untouched defaults do not create unfinished work.
- Confirmed replacement removes only Generator activity. Cancellation and failed
  removal retain the saved activity; Trainer content and completed Runs survive.
- Restore validates record version/types, Puzzle Set schema and content hash.
  Truncated, invalid and unsupported state recovers with an explanation. Quota
  failures retain the previous complete snapshot; unavailable storage still
  permits generation/export and never reports that failed writes were saved.
- Header links and Do Puzzles flush before leaving and confirm save failure.
  `docs/generator-saved-activity.md` documents the cancelable
  `offline-chess:before-navigate` window event for #13. Shared navigation must
  honor a false dispatch result rather than assume an earlier save still holds.
- Restored-output Handoff retains content-hash deduplication, original archived
  Puzzle Set identity, completed history and existing active-Run reuse on Puzzle 2.

### Verification

- TDD red → green observed for missing Resume/output restoration, fractional
  generation input, untouched-entry behavior and back-forward-cache reentry.
- `OFFLINE_CHESS_TEST_PORT=4210 npx playwright test`: **129 passed** after merging
  integration and the final lifecycle fix. Includes real persistent Chromium
  profile close/relaunch, exact exported-output comparison, storage failures,
  phone keyboard controls, both Themes, and existing offline/Trainer journeys.
- `npm run test:cli`: **7 passed**.
- `npm --prefix apps/woodpecker test`: **38 passed, 14 existing opt-in installation
  tests skipped**.
- `npm --prefix apps/woodpecker run typecheck`: passed. Suite builds pass as part
  of Playwright startup.
- Reviewed phone Resume screenshots in light and dark; retained Generator
  essentials/output reachability coverage at 320, 390 and 1440px.
- A broad rerun exceeded the shell's 120-second limit; its owned preview process
  was stopped and a fresh run with a longer shell limit passed all 95 tests;
  the subsequent latest-integration rerun passed all 129 tests.
  Known readiness-update tests were neither weakened nor changed.

No acceptance gaps remain. Physical-device installation and opt-in installation
tests were not run. No push, PR, or remote issue closure performed.
