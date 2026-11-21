# Safe Tool switching

The assembled Suite adds the same compact **Switch Tool** disclosure to each Tool's header. It lists all four existing Tool URLs, identifies the current Tool with `aria-current="page"` and visible “Current” text, and has no Landing Page item. The Open board/Offline Chess brand remains the Landing Page link. The Landing Page itself has no switcher.

`public/tool-switcher.js` and `public/tool-switcher.css` are included only in Tool HTML by `scripts/build.mjs`. They use shared identity tokens and the existing symbol family, and are included automatically in the root worker's required-resource precache. A short-lived observer waits for React headers to mount; no Tool router, storage schema, or shared database is introduced. Source App previews retain their own navigation.

## Navigation boundaries

- Links remain ordinary same-window anchors. Trainer's existing document listener awaits `prepareToNavigate`, pauses the Run and commits its checkpoint before assigning location. The switcher must not replace this with an independent `location.assign`.
- For Blind Chess, Generator and Reader, Suite brand/switcher links first dispatch the synchronous, cancelable `offline-chess:before-navigate` window event. A canceled event prevents departure and closes the disclosure, leaving the Tool's honest storage warning and current work available. Retrying navigation retries storage. There is no silent “leave anyway” on these Suite links.
- Blind Chess also retains its existing anchor checkpoint. Reader retries its latest normal Study bookmark only when a live normal Study exists, not on an untouched Resume choice. Generator's original preview/header guard yields to Suite-marked links; its explicit **Do Puzzles** Handoff retains its own save boundary and existing Trainer deduplication/Run reuse.
- Choosing the current Tool closes the disclosure without reloading, pausing an active round, replacing activity or implying Resume. Modifier/new-tab/download semantics remain native in the switcher.

Opening the disclosure or visiting a destination never resumes Saved Activity. Existing Tool-specific Resume/Start fresh screens remain responsible for restoration and confirmation. Browser-controlled reload, close and back navigation still rely on each Tool's continuous/lifecycle checkpoints; this control cannot guarantee recovery after browser eviction or denied storage.

## Accessibility and verification

The disclosure uses a real button and navigation links, ordinary Tab order, Enter/Space activation, Escape with focus returned to its button, outside-click/touch dismissal, and dismissal when focus leaves. Controls have at least 44px targets and explicit focus outlines. Phone headers wrap; the four-destination panel fits a 320px viewport in either Theme.

`OFFLINE_CHESS_TEST_PORT=4213 npm run test:e2e -- tests/e2e/tool-switching.spec.ts --workers=2` covers all four destinations, active indication, keyboard/focus/dismissal, touch at 320px and 1440px in both Themes, all four failed-save gates and recovery, brand navigation, real offline round trips and an on-disk Chromium profile closed/reopened. It compares a nested Reader variation/orientation, generated JSON and filters, Trainer's exported Run including exact 5,500ms Active Solving Time and whole-line progress, and Blind Chess's prompt/answers/remaining time after controlled away intervals. Responsive PNGs under `test-results/tool-switching-*` are regenerable visual-review artifacts, not screenshot baselines.
