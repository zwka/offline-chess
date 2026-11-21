# Verified Tool readiness

The assembled Suite injects `public/offline-status.js` and its small stylesheet into the Landing Page and every Tool at build time. No Tool layout or storage is rewritten. A refreshed header can expose `[data-offline-status-slot]`; otherwise the control uses `.topbar-actions` or normal body flow.

The `suite:verify-tools` MessageChannel request asks the controlling root worker to inspect **only its own current versioned cache**, including every required precache URL and the Generator sample index. It never fetches missing resources. Replies contain `state`, `missing`, `total`, `installFailures`, and `build` (failure replies contain only state). HTTP failures and missing entries count as incomplete. An active registration is not sufficient.

The UI checks on entry, details opening, explicit Recheck, foreground/focus, connectivity changes, worker lifecycle/controller changes, and every 15 seconds while visible. An installing/waiting replacement invalidates outgoing replies and keeps the UI checking; the outgoing worker's old cache cannot establish readiness for the incoming build. Cache Storage exposes no eviction event, so there can be a short interval between browser eviction and the next check. The details explicitly describe this limitation; readiness is not a durable promise. An unresponsive older worker times out to failure rather than success.

## Optional full database

The same worker reply includes separate `sample` and `database` results. `[data-offline-database]` reports checking, unavailable, incomplete, available offline, or check failed independently of required Tool readiness. No selected-index state or persisted success flag is consulted. A loss of availability during the page's lifetime explains that previously available data is no longer verified.

At build time, a present generated manifest and compressed index produce an embedded descriptor (manifest, byte size, SHA-256 identity). The identity participates in the Suite build version, including database-only updates, but neither full resource enters mandatory precaching. Hashing is streamed, without loading the production database into memory. A build without both optional resources reports unavailable, not sample-as-full availability.

Verification reads only the controlling worker's current versioned cache. Both successful full-resource responses must exist; the manifest must match the build's manifest/schema, and the compressed index size must match. Cache writes are atomic; the server's Content-Length is used when present, otherwise cached bytes are counted with a stream. This is resource availability verification, not repeated cryptographic integrity checking of hundreds of MB. Responses from old build caches, failed responses, stale manifests, and size mismatches cannot establish availability. Malformed manifests or unreadable storage report failure independently from Tool status.

Explicit generated-index HEAD warming and normal generation/download requests remain unchanged. Completed or failed full-resource cache attempts send `suite:database-cache-changed` to clients to recheck immediately. Worker updates also recheck; external cache removal is detected on details opening, focus/foreground, Recheck, or the visible-page 15-second check. Opening details never fetches or HEADs either generated resource and never repairs caches. There is no download manager or automatic database download.

The host `#suite-offline-status` continues dispatching bubbling `suite:tools-verified` with the complete worker reply, including optional database details.

Browser tests in `tests/e2e/offline-readiness.spec.ts` and `tests/e2e/full-index-readiness.spec.ts` exercise the assembled Suite and real worker/cache boundaries. The full-index fixture compresses the checked-in 12-record sample, injects only its build descriptor into the worker, and seeds real Cache Storage. Tests cover independent statuses, offline checks, stale/partial/failed/malformed resources, old caches, removal, updates, explicit warming/cache failure notifications, and no-download checks. CI never downloads the production database.
