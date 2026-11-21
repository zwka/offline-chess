# Ink & Brass identity

Implemented by [ticket #4](../.scratch/offline-chess-ux/issues/01-branded-landing-page.md); direction and scope live in the [parent spec](../.scratch/offline-chess-ux/spec.md#visual-identity-and-navigation).

## Reuse from any Tool

Public assets are copied verbatim to the Suite root and included in the existing root service worker's precache. No runtime package or framework is required.

- `/identity/identity.css`: opt-in `--suite-*` variables for backgrounds, surfaces, ink, muted text, brass, brass surfaces, lines, focus, serif and sans fonts. Theme selection uses the existing `html[data-theme="dark"]` and `offline-chess.theme.v1` contract. Loading these tokens alone does not restyle Tool controls or semantic success/error colors.
- `/identity/symbols.svg#open-board`: original open frame, four inset squares, separated corner. Set `viewBox="0 0 64 64"` and CSS `color`; it reproduces in one color.
- Task symbols (all `viewBox="0 0 48 48"`): `#blind-chess` (board vision), `#pgn-reader` (open study book), `#woodpecker-generator` (filter controls), `#woodpecker-trainer` (solving/check). Use `color` and, for Generator's slider centers, `--identity-icon-surface` matching the icon background.
- `/identity/open-board.svg`: standalone brass-on-ink mark; `/identity/open-board-mono.svg`: standalone black-on-transparent mark.
- Existing `/favicon-32.png`, `/apple-touch-icon.png`, `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` now derive from Open board, preserving all existing Tool icon URLs and the one-manifest contract.

```html
<link rel="stylesheet" href="/identity/identity.css" />
<a href="/" aria-label="Offline Chess">
  <svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
    <use href="/identity/symbols.svg#open-board"></use>
  </svg>
  <span>Offline Chess</span>
</a>
```

Keep the visible wordmark alongside the symbol. Decorative Tool symbols use `aria-hidden="true"`; the Tool name supplies the accessible link label. Give interactive controls at least 44px touch targets and explicit focus styling. Use serif for major headings, sans for functional text. System font stacks require no external font download, including offline.

## Regeneration

Generation also synchronizes the browser/touch icon copies used by standalone Woodpecker previews with the root Suite assets.

Run `npm run icons` after editing `public/identity/symbols.svg`. The generator extracts the Open board symbol as its single geometry source and writes the standalone SVGs and PNG sizes above. The maskable mark uses a 320px viewport centered in 512px; all painted geometry stays inside the central 80%-diameter safe circle. Its background fills the image. Regular icons use a larger 448px viewport. Source App chess-piece artwork and legacy card JPEGs are retained, not replaced or deleted.

## Verification

`OFFLINE_CHESS_TEST_PORT=4204 npm run test:e2e` covers four real gallery entry links, brand keyboard navigation, dark-default/persisted/shared Theme, 320px/390px touch and 1440px keyboard interaction in both Themes, description contrast (including hovered brass surfaces), plus unchanged Suite offline and Handoff journeys. Responsive tests save gallery and focus PNGs under `test-results/landing-page-gallery-*` for visual review; these are regenerable local artifacts, not screenshot baselines. Existing offline coverage now also requires the identity assets in the root cache.

## Blind Chess

Blind Chess consumes the same stylesheet and Open board symbol, with a brass header, board frames and timing/feedback surfaces, serif major headings, and sans-serif controls. Correct/error feedback retains semantic green/red and written feedback rather than using brass alone. Existing drill layouts and completed Attempt storage remain independent.

Selecting any of the six drills (including Play again or an empty history's drill link) opens untimed instructions. Start reveals the first prompt without starting the clock; the first answer still begins the existing 60-second round. Saved Activity restoration is a separate delivery slice.

`OFFLINE_CHESS_TEST_PORT=4205 npm run test:e2e -- tests/e2e/blind-chess.spec.ts` uses paused browser clocks with explicit advances, all six drills, 320px/390px/1440px viewports, both Themes, keyboard selection, feedback contrast, completed history and brand navigation. Regenerable preparation, feedback, result and history screenshots live under `test-results/blind-chess-*`.
