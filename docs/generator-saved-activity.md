# Generator Saved Activity

Generator keeps one Saved Activity, separate from Trainer's Puzzle Sets and Run
history. Ordinary entry offers Resume or confirmed Start fresh. Resume does not
scan the source index or start a Handoff; Do Puzzles remains an explicit request
to Trainer, using its existing content-hash deduplication, unarchiving and active
Run reuse.

## Storage boundary

`localStorage["offline-chess.generator.activity.v1"]` holds a JSON object with
`kind: "generator-activity"`, `schemaVersion: 1`, and `activity`:

- Current name, ratings, count, selected Tactic Themes, all/any matching and seed.
- The last completed self-contained Puzzle Set (or `null`) and its match count.

Form edits and completed generation persist as they change, not only on unload.
There is no source index, in-flight scan, Trainer state, or multiple-draft store in
this record. Each write atomically replaces one localStorage value; failed writes
leave the preceding complete value intact. Opening untouched defaults creates no
Saved Activity. Start fresh removes only this key after confirmation; a failed
removal keeps the entry choice and prior activity available.

Restoration checks version, input types, Puzzle Set schema and SHA-256 content
hash. Current form values may be invalid generation inputs (for example a reversed
rating interval); they are retained for correction, while generation validates
whole-number ratings and a count of 1–1000. Invalid/truncated/unsupported records
are not resumed or silently treated as valid saved work. They can be replaced by
new activity without touching Trainer content or completed history.

Unavailable storage and quota errors leave the form and output usable, with an
explicit unsaved warning and Retry save. Export JSON remains available. A browser
may still evict local data; a successful write is not a backup guarantee.

## Navigation-save seam (for #13)

While Generator is mounted, navigation code can synchronously flush the current
activity with this **cancelable window event**:

```js
const saved = window.dispatchEvent(
  new Event("offline-chess:before-navigate", { cancelable: true }),
);
```

`false` means the save failed: Generator updates its visible warning and the
caller must keep the player here or explicitly confirm leaving without saving.
`true` means the write succeeded, no activity has changed, or the player is still
at the entry choice (which must not be overwritten). Dispatch immediately before
navigation, not on unload. The event is a synchronous localStorage seam, not a
Promise or a global navigation framework. Generator's own header links and Do
Puzzles already flush and confirm on failure. Shared brand/switcher navigation
must use this seam when implemented; it must not infer safety from earlier saved
copy, service-worker readiness, or storage availability alone.

Browser tests in `tests/e2e/generator-activity.spec.ts` inject failures only at the
browser Storage boundary, including navigation-time failures after a successful
save. They also close and relaunch a real persistent Chromium profile and compare
the restored export with the original. The Handoff journey exercises restored
output, unarchiving, and reuse of the existing Run on Puzzle 2.
