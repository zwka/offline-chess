# Blind Chess Saved Activity

Blind Chess stores one versioned record at `offline-blind-chess.activity.v1`, separate from the existing `offline-blind-chess.attempts.v1` history. It holds untimed preparation, an unanswered ready prompt, or a paused round with exact prompt, counts, feedback and remaining milliseconds. It never persists a running wall-clock deadline. Validation rejects malformed/version-mismatched or contradictory records without deleting history.

Preparation, Start, answers and prompt advances synchronously checkpoint; visible running time checkpoints every 100 ms. Pause, Exit, hiding, `pagehide`, and ordinary anchor navigation checkpoint again. Loading or returning from hiding never resumes a clock. Resume is explicit, and a ready prompt still waits for the first answer to start timing. A hard process kill can lose at most the time since the last successful checkpoint; browser storage eviction, denial and exhausted quota cannot be guaranteed against.

Start fresh explains replacement and asks for confirmation. A single `setItem` replaces the activity only if it succeeds; failure retains the previous activity and offers retry. Neither replacement nor a bad activity record clears completed Attempt history or personal bests.

## Completion and interrupted writes

Each round carries a stable activity ID that becomes its completed Attempt ID. Completion first checkpoints a receipt containing that ID, then saves history using that ID (idempotently), then removes the activity receipt. A receipt is never offered as an unfinished round. If the history write is interrupted, reopening retries it. Conversely, if history saves but the activity receipt/removal fails, reopening recognizes the stale round's ID in history and treats it as completed, never resumable. A failed history save blocks starting another activity until retry succeeds, rather than overwriting the receipt. History writes refuse to overwrite unreadable/invalid existing history. Clearing history removes any remaining completion receipt first, preventing resurrection on reload.

If *all* storage writes fail, only the in-memory round/receipt is available: an explicit warning explains that leaving/reloading can lose it. No UI promises successful durability in that case.

## Navigation integration seam for #13

Before assigning `location` (including programmatic Switch Tool navigation), dispatch this **synchronous, cancelable** event on `window`:

```js
const safe = window.dispatchEvent(new Event("offline-chess:before-navigate", {
  cancelable: true
}));
if (safe) window.location.assign(destination);
```

The mounted Blind Chess listener pauses the actual round, exposes its Resume choice, and retries saving the current activity. It calls `preventDefault()` on failure, so `dispatchEvent` returns `false`. The caller must **remain on the page** when false; Blind Chess shows the warning and a Retry save button. Retry the event on a subsequent navigation request. The event does not itself navigate. It also works when there is no unfinished activity. Existing anchor clicks (including the brand) are guarded automatically in the capture phase; a future switcher may use normal anchors or the event for programmatic navigation.

`pagehide`/visibility are best-effort checkpoints, not a success signal or a substitute for this seam. Browser-managed reload/back/closing cannot always be canceled, which is why checkpoints happen throughout activity rather than only at unload.

## Verification

- `npm test --prefix apps/blind-chess`: domain, activity storage and existing history/preferences tests.
- `OFFLINE_CHESS_TEST_PORT=4206 npm run test:e2e -- tests/e2e/blind-chess.spec.ts tests/e2e/blind-chess-resume.spec.ts`: controlled-clock all-drill restoration, navigation, paused reopening in a new browser context populated with persisted browser storage, confirmation/cancellation, completion and write/read failure journeys; phone/desktop and light/dark keyboard/touch checks.
