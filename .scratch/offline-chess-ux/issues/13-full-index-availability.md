# Distinguish full puzzle database offline availability

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/16

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Extend the readiness details so the player can tell whether the optional full puzzle database is actually available offline, independently of Tool and sample-index readiness.

## Acceptance criteria

- [x] Show full-index availability separately from required Tool resources and the sample index, with honest checking/unavailable/incomplete/available/error states as appropriate.
- [x] Determine availability from the required cached full-index resources and relevant version/manifest information, not the selected index or a stale success flag.
- [x] Checking availability or opening details must not trigger the existing full-index probe's large download, fetch the source index just to inspect it, or add the full index to mandatory precaching.
- [x] Invalidate/recheck after relevant updates, cache removal, or failed caching, and explain loss of previously available offline data without claiming it is still ready.
- [x] Preserve existing explicit generation/index-download behavior; no download manager, automatic full-index download, or cloud service is introduced.
- [x] Use a small deterministic full-index fixture to browser-test independent Tool/sample/full statuses, partial/missing/stale resources, offline checks, updates/cache removal, and no-download assertions. CI must not download the production database.

## Blocked by

- https://github.com/zwka/offline-chess/issues/15 — Verify and explain Suite Tool offline readiness.

## Answer

Implemented in `9099a7c` on `ux/ticket-16`, with integration `4101e95` merged in `f5fd227` before final verification. Shared readiness details separately report sample/full status. The controlling worker verifies only current-build cached successful resources, matching generated manifest/schema and index size. A streamed build-time full-index identity affects the cache version without mandatory precaching. Checks never fetch/HEAD either generated resource or repair caches. Explicit warming/generation remains available, with cache-attempt notifications prompting rechecks. Updates invalidate outgoing replies and stay checking rather than restoring readiness from the outgoing build; subsequent loss of full availability is explained.

Verification:

- `OFFLINE_CHESS_TEST_PORT=4216 npm test` after integration merge: **7 CLI + 65 browser tests passed**.
- Unchanged `offline-readiness.spec.ts` worker-update regression: **12/12 repeated runs passed** after fixing outgoing-worker verification during installing/waiting replacement lifecycles. Previously reproduced failing runs retained old Tool readiness.
- `tests/e2e/full-index-readiness.spec.ts` uses only the gzipped checked-in 12-record sample and a worker descriptor fixture. Covers independent Tool/sample/full availability, offline checks, missing/stale/short/failed/malformed resources, old caches, cache removal, explicit HEAD warming, failed cache writes, update invalidation, and zero generated-resource requests during verification.
- Existing PWA coverage still verifies no optional full resources in the actual precache list and preserved HEAD/offline behavior. Existing readiness tests cover unsupported/storage failures, all surfaces, keyboard access and both Themes.
- `git diff --check` passed. No Generator form changes, production database download, push, PR, or remote issue closure.

Limits: cached-response completeness relies on atomic Cache Storage writes and byte size (Content-Length when supplied, streamed byte counting otherwise), not repeated full-body cryptographic integrity checks. Cache Storage has no eviction event, so external removal is detected on details/focus/Recheck or the 15-second visible-page check. Production database performance and physical-device checks were not run; see `docs/offline-readiness.md`.
