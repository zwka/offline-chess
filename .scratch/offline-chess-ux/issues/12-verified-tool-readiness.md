# Verify and explain Suite Tool offline readiness

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/15

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Give the player a quiet offline-status control with details on the Landing Page and every Tool, backed by local-resource verification instead of registration-only reassurance.

## Acceptance criteria

- [x] Show understandable checking/ready/incomplete/unavailable/failure states for required Tool resources; distinguish connectivity from actual local readiness.
- [x] Verify required resources locally and report partial caching or installation failure; an active service worker alone cannot establish readiness.
- [x] Invalidate or recheck status after relevant updates/cache lifecycle changes and cache removal; do not imply a past check guarantees immunity to later browser eviction.
- [x] Keep one Suite service worker/manifest, installed offline navigation, and existing local-content workflows; do not precache the optional full index.
- [x] Add a quiet accessible status/details control using existing surface conventions, without introducing a dashboard or a new styling dependency. It must remain usable before and after the visual refresh.
- [x] Explicitly avoid claiming full-database readiness from Tool/sample-index readiness. Opening details must not fetch the large index.
- [x] Test complete and partial caching, registration-only false positives, offline reload/navigation, update/cache removal invalidation, failure states, accessible details, and absence of full-index downloads through existing Suite browser/offline seams.

## Blocked by

None (can start immediately).

## Answer

Implemented a build-injected shared status/details control on all five surfaces, backed by local verification of the controlling root worker's exact required-resource cache. Missing/non-success responses cannot pass; connectivity, registration, sample readiness, and full-database readiness are explicitly distinct. Installation, update, storage-read failures, and cache removal produce honest states. Recheck occurs on details opening, explicit action, foreground/navigation/connectivity/controller changes and every 15 seconds while visible. Browser eviction has no notification API, so details explicitly warn about later removal.

No Landing Page layout or Tool storage changes. The visual-refresh hook is `[data-offline-status-slot]`; fallback uses `.topbar-actions` or normal body flow. #16 can extend `[data-offline-database]` and observe `suite:tools-verified`; it is intentionally not implemented here. See `docs/offline-readiness.md` for worker protocol and limitations.

### Testing

TDD: initial missing-control test failed before implementation; unsupported browser, installation-checking, and failed installation tests also caught missing behavior before fixes. `OFFLINE_CHESS_TEST_PORT=4215 npm test`: **7 CLI + 31 browser tests pass**, including 11 new readiness journeys. Existing offline local-PGN import, sample generation, Trainer, Handoff, Theme and timing tests pass. Reviewed 360px dark phone and 1280px light desktop screenshots; native dialog keyboard entry, Escape/Close focus restoration, required resource disclosure and touch-sized controls covered. No production full-index downloads. Testing runtime was Node 26.13.1 (repo declares 24.11.1).
