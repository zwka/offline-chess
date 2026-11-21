# Resume Blind Chess rounds without losing time or answers

Status: claimed
GitHub issue: https://github.com/zwka/offline-chess/issues/6

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Keep an unfinished Blind Chess round available across leaving, reload, and reopening, with an explicit Resume or Start fresh choice and no automatic clock restart.

## Acceptance criteria

- [ ] Persist drill, current prompt, accumulated answers/results, and remaining time as activity changes, not only at unload.
- [ ] Leaving or hiding pauses the round; returning to the unfinished activity offers Resume/Start fresh without consuming time until explicit Resume.
- [ ] Resume restores the actual prompt and remaining time rather than generating a new round or resetting the clock. Preserve untimed preparation and first-answer timing for a round not yet started.
- [ ] Start fresh explains and confirms replacement; cancellation retains the round, and replacement keeps completed Attempt history and personal bests.
- [ ] Completed rounds do not create misleading resume prompts or duplicate completed Attempts.
- [ ] Handle unavailable/quota-limited/interrupted storage and invalid saved state honestly without blocking existing history or claiming an unsuccessful save succeeded.
- [ ] Cover navigation away, reload, persisted-browser reopening, pause/resume, replacement/cancellation, storage failures, and completed-history preservation using browser journeys and focused storage/controlled-clock tests.

## Blocked by

- https://github.com/zwka/offline-chess/issues/5 — Blind Chess preparation and clear timing.
