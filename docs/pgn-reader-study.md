# PGN Reader Library and Study

The Suite's `/pgn-reader/` entry opens **Library**: import `.pgn` files, select retained sources, and search game metadata. Opening a Game record enters **Study**, with board and notation side by side on wide screens and board then notation on phones. Game tags, parser warnings, original raw PGN, and piece attribution follow as secondary details.

**Back to Library** keeps the live Study intact. **Return to Study** returns to the exact move/variation, board orientation, and expanded notation without parsing again. Searching, selecting another retained source, or importing a new source does not replace that Study. Opening another game replaces it; removing its source clears it. Previous/Next game always follows the studied source, even after browsing another source.

Board controls support touch; keyboard navigation supports Left/Right (moves), Up/Down (variations), Home/End, and `f` (flip) when focus is not in an input or button. Reader shortcuts are inactive while Library is visible. Major navigation moves focus to Library's heading or Study's return control.

This ticket retains a position **in memory only**. Reload/reopening still uses the existing source/Game record bookmark at the starting position; durable exact-position resumption and entry choices belong to ticket #8. No Library schema, source IDs, Game record IDs, parser, source bytes, or artwork assets changed.

Verification: `OFFLINE_CHESS_TEST_PORT=4207 npm run test:e2e -- tests/e2e/pgn-reader.spec.ts tests/e2e/pgn-library-study.spec.ts`. Deterministic PGNs cover search, annotations, variations, source browsing/import, Library return, parser warnings, raw PGN, reload of retained content, keyboard, and touch. Study screenshots are generated under `test-results/reader-study-*` in light/dark at 390px and 1440px.
