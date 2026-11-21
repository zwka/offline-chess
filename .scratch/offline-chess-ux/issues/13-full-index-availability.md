# Distinguish full puzzle database offline availability

Status: claimed
GitHub issue: https://github.com/zwka/offline-chess/issues/16

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Extend the readiness details so the player can tell whether the optional full puzzle database is actually available offline, independently of Tool and sample-index readiness.

## Acceptance criteria

- [ ] Show full-index availability separately from required Tool resources and the sample index, with honest checking/unavailable/incomplete/available/error states as appropriate.
- [ ] Determine availability from the required cached full-index resources and relevant version/manifest information, not the selected index or a stale success flag.
- [ ] Checking availability or opening details must not trigger the existing full-index probe's large download, fetch the source index just to inspect it, or add the full index to mandatory precaching.
- [ ] Invalidate/recheck after relevant updates, cache removal, or failed caching, and explain loss of previously available offline data without claiming it is still ready.
- [ ] Preserve existing explicit generation/index-download behavior; no download manager, automatic full-index download, or cloud service is introduced.
- [ ] Use a small deterministic full-index fixture to browser-test independent Tool/sample/full statuses, partial/missing/stale resources, offline checks, updates/cache removal, and no-download assertions. CI must not download the production database.

## Blocked by

- https://github.com/zwka/offline-chess/issues/15 — Verify and explain Suite Tool offline readiness.
