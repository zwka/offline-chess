# Verify and explain Suite Tool offline readiness

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/15

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Give the player a quiet offline-status control with details on the Landing Page and every Tool, backed by local-resource verification instead of registration-only reassurance.

## Acceptance criteria

- [ ] Show understandable checking/ready/incomplete/unavailable/failure states for required Tool resources; distinguish connectivity from actual local readiness.
- [ ] Verify required resources locally and report partial caching or installation failure; an active service worker alone cannot establish readiness.
- [ ] Invalidate or recheck status after relevant updates/cache lifecycle changes and cache removal; do not imply a past check guarantees immunity to later browser eviction.
- [ ] Keep one Suite service worker/manifest, installed offline navigation, and existing local-content workflows; do not precache the optional full index.
- [ ] Add a quiet accessible status/details control using existing surface conventions, without introducing a dashboard or a new styling dependency. It must remain usable before and after the visual refresh.
- [ ] Explicitly avoid claiming full-database readiness from Tool/sample-index readiness. Opening details must not fetch the large index.
- [ ] Test complete and partial caching, registration-only false positives, offline reload/navigation, update/cache removal invalidation, failure states, accessible details, and absence of full-index downloads through existing Suite browser/offline seams.

## Blocked by

None (can start immediately).
