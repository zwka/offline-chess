# Switch directly between Tools without losing work

Status: claimed
GitHub issue: https://github.com/zwka/offline-chess/issues/13

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Provide the compact, consistent Switch Tool control in every Tool, backed by completed durable-activity behavior so direct navigation is safe rather than silently destructive.

## Acceptance criteria

- [ ] All four Tools are directly available inside each Tool; no separate Landing Page item appears in the switcher and no switcher is added to the Landing Page.
- [ ] Clicking the symbol/Offline Chess brand returns to the Landing Page while preserving unfinished work.
- [ ] Switching retains exact Reader study, Generator filters/output, Trainer Run progress, and paused Blind Chess activity across same-window navigation and reopening.
- [ ] Destination unfinished activity presents Resume/Start fresh as specified; merely visiting must not restart timers or abandon Runs.
- [ ] Save failure cannot be silently presented as safe navigation: give an honest warning and a safe way to remain when unfinished changes are at risk.
- [ ] Accessible focus, dismissal, keyboard/touch use, active-Tool indication, and compact phone/desktop layouts work in both Themes with existing URLs and offline navigation.
- [ ] Browser-test round trips involving all four Tools, brand navigation, data retention, timers, offline navigation, and a failed-save path; retain direct Generator Handoff behavior.

## Blocked by

- https://github.com/zwka/offline-chess/issues/6 — Resume Blind Chess rounds without losing time or answers.
- https://github.com/zwka/offline-chess/issues/8 — Resume PGN Reader at the exact move and variation.
- https://github.com/zwka/offline-chess/issues/10 — Keep Generator filters and output across reopening.
- https://github.com/zwka/offline-chess/issues/11 — Trainer solving workspace and safe Run resumption.
