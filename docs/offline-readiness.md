# Verified Tool readiness

The assembled Suite injects `public/offline-status.js` and its small stylesheet into the Landing Page and every Tool at build time. No Tool layout or storage is rewritten. A refreshed header can expose `[data-offline-status-slot]`; otherwise the control uses `.topbar-actions` or normal body flow.

The `suite:verify-tools` MessageChannel request asks the controlling root worker to inspect **only its own current versioned cache**, including every required precache URL and the Generator sample index. It never fetches missing resources. Replies contain `state`, `missing`, `total`, `installFailures`, and `build` (failure replies contain only state). HTTP failures and missing entries count as incomplete. An active registration is not sufficient.

The UI checks on entry, details opening, explicit Recheck, foreground/focus, connectivity changes, worker lifecycle/controller changes, and every 15 seconds while visible. Cache Storage exposes no eviction event, so there can be a short interval between browser eviction and the next check. The details explicitly describe this limitation; readiness is not a durable promise. An unresponsive older worker times out to failure rather than success.

## Optional database extension (#16)

`[data-offline-database]` is the reserved details section. The host `#suite-offline-status` dispatches bubbling `suite:tools-verified` with the worker reply whenever status changes. Keep optional database verification separate: Tool/sample readiness does not establish full-database readiness. Merely opening details must not fetch or HEAD the generated index (the existing worker converts HEAD to a warming GET). No full-index details/download management is implemented here.

Browser tests in `tests/e2e/offline-readiness.spec.ts` exercise the assembled Suite and real worker/cache boundaries. Small worker-response fixtures simulate installation/storage failures and updates without downloading the production database.
