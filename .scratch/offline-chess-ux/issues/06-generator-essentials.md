# Generator essentials-first workflow with reachable output

Status: resolved
GitHub issue: https://github.com/zwka/offline-chess/issues/9

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Make common Puzzle Set generation straightforward on phone and desktop while retaining advanced control and an obvious path from output to solving or export.

## Acceptance criteria

- [x] Keep rating, Tactic Themes, puzzle count, necessary naming, and generation actions readily accessible.
- [x] Put seed and all/any matching in expandable Advanced options; toggling disclosure must not reset values or alter selection semantics/reproducibility.
- [x] Provide an obvious completion cue and reachable generated output, Do Puzzles, and export even after a long phone filter form.
- [x] Apply shared branding, richer Ink & Brass, typography, accessible controls, and clear progress/error feedback in both Themes without implying unsaved state is durable.
- [x] Preserve existing index selection, deterministic generation, JSON export, nonempty naming requirements, and direct Handoff behavior.
- [x] Browser-test generation with small deterministic fixtures, advanced setting retention, mobile output reachability, export, and repeated Handoff deduplication/active-Run reuse.

## Blocked by

- https://github.com/zwka/offline-chess/issues/4 — Branded Landing Page and Suite visual identity.

## Answer

Generator now keeps name, rating, count and Tactic Themes in the main form, with native, keyboard-accessible Advanced options retaining seed and all/any values. Generation brings the output into view and focuses its heading; a Puzzle Set ready cue, Do Puzzles, Export JSON and Back to filters make the next action reachable. Errors receive focus and scroll into view. Shared Open board branding, task icon, Ink & Brass tokens, serif headings, 44px controls, visible focus and reduced-motion handling cover both Themes. Selection, index loading, exported format and Handoff algorithms are unchanged; no Trainer implementation files changed.

Output copy explicitly describes page-only state and export for retention. Durable Saved Activity remains ticket #10, not a promise made by this ticket.

### Verification

- TDD: observed the Advanced-options visibility test fail before implementation; separately observed the mobile output/branding journey fail before implementation.
- `OFFLINE_CHESS_TEST_PORT=4209 npm run test:e2e -- tests/e2e/generator-essentials.spec.ts tests/e2e/woodpecker-handoff.spec.ts tests/e2e/woodpecker-tools.spec.ts --workers=2`: **14 passed**. Small explicitly routed 12-record sample fixture; exact all/any results, retained seed/matching, repeatable JSON/hash, naming/validation recovery, mobile/desktop focus and output reachability, keyboard controls, touch targets, both Themes, streaming progress, repeated Handoff deduplication and active-Run reuse.
- Screenshots generated under `test-results/generator-essentials-*/output-*.png`; reviewed representative 320px dark and desktop light output; corrected truncated rating/seed values.
- `npm --prefix apps/woodpecker run typecheck`: passed.
- `npm --prefix apps/woodpecker test`: **38 passed, 14 skipped** (existing optional mobile-install tests).
- Full Suite `OFFLINE_CHESS_TEST_PORT=4209 npm run test:e2e -- --workers=2`: **50 passed, 1 failed**. The unrelated `offline-readiness.spec.ts` worker-update journey waits unsuccessfully for Tools incomplete; fails again in isolation. No readiness implementation or test changed here. Broad parallel runs also encountered host contention/timeouts; focused final run above passed.
- No production/full database download, remote closure, push or PR.
