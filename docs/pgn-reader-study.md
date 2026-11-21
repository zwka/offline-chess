# PGN Reader Library and Study

The Suite's `/pgn-reader/` entry opens **Library**: import `.pgn` files, select retained sources, and search game metadata. Opening a Game record enters **Study**, with board and notation side by side on wide screens and board then notation on phones. Game tags, parser warnings, original raw PGN, and piece attribution follow as secondary details.

**Back to Library** keeps the live Study intact. **Return to Study** returns to the exact move/variation, board orientation, and expanded notation without parsing again. Searching, selecting another retained source, or importing a new source does not replace that Study. Opening another game confirms replacement; cancellation leaves the existing Study untouched. Removing its source clears the live view. Previous/Next game always follows the studied source, even after browsing another source.

Board controls support touch; keyboard navigation supports Left/Right (moves), Up/Down (variations), Home/End, and `f` (flip) when focus is not in an input or button. Reader shortcuts are inactive while Library is visible. Major navigation moves focus to Library's heading or Study's return control.

On ordinary entry, unfinished normal Study offers **Resume / Start fresh** rather than opening automatically. Resume restores the exact source, Game record, nested variation path, board position, orientation, and visible notation ancestors. Start fresh confirms that only unfinished Study is replaced; imported PGNs and completed history are untouched. A successful clear persists a null bookmark so older per-source bookmarks cannot resurrect it.

## Persistence and integration seams (#8)

`src/mobile/study-bookmark.ts` owns `NormalStudyBookmark`, isolated from Library content/history. Its versioned localStorage key is `offline-chess.reader.normal-study.v1`. It stores source/Game record IDs, source name/size, a SHA-256 digest of the studied game's raw PGN, and `StudyPosition` (child-index path, expected FEN, flipped board). The digest detects changed/reused content; path plus FEN prevents restoring a different node silently. Source bytes and Game records remain in the existing IndexedDB Library; its schema is unchanged.

For **#13 navigation**, `renderMobileReader` emits `onPositionChange` synchronously after each selection/flip and `NormalStudyBookmark.save` finishes its small synchronous write before navigation can leave the page. There is no unload-only save or pending debounce to flush. Failed writes explicitly report page-only changes and the possibility of reopening an older saved place; failed Start fresh retains the live Study.

The assembled [Tool switcher and brand](tool-switching.md) also dispatch `offline-chess:before-navigate`. Reader retries the live normal Study bookmark synchronously and cancels that event on failure, keeping the warning and exact live position on the page. An untouched Resume choice is not rewritten by navigation.

For **#14 Puzzle Solution Study**, `renderMobileReader` accepts optional `initialPosition`, `onPositionChange`, and `onRecovery` callbacks. It has no knowledge of the normal bookmark store or Library persistence. A separate solution controller can render its own GameDocument and own its callbacks/storage without importing `NormalStudyBookmark`, changing normal Study, or adding Library sources.

Missing sources/games retain the saved pointer and give a recoverable explanation; the Library stays available. Missing nodes or changed game content open at the game's start with an explicit warning rather than guessing a variation. Corrupt/unreadable normal bookmarks do not affect the Library. Pre-#8 per-source bookmarks migrate from the active source when no normal bookmark exists, with an explanation that no exact move was recorded. Invalid older bookmark references are dropped with a warning, independently of valid retained PGNs. Browser eviction is not a backup guarantee.

Verification: `OFFLINE_CHESS_TEST_PORT=4207 npm run test:e2e -- tests/e2e/pgn-reader.spec.ts tests/e2e/pgn-library-study.spec.ts`. Deterministic PGNs cover search, annotations, variations, source browsing/import, Library return, parser warnings, raw PGN, reload of retained content, keyboard, and touch. Study screenshots are generated under `test-results/reader-study-*` in light/dark at 390px and 1440px.

Exact resumption: `OFFLINE_CHESS_TEST_PORT=4208 npm run test:e2e -- tests/e2e/pgn-resumption.spec.ts tests/e2e/pgn-reader.spec.ts tests/e2e/pgn-library-study.spec.ts`. Includes deterministic nested variation playback, leaving/reload and a real on-disk Chromium profile closed/relaunched, replacement confirmation/cancellation, cross-source browsing, legacy migration, corrupt/missing metadata, denied reads, and quota-failed writes.
