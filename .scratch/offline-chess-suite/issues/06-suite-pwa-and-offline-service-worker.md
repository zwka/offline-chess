# 06: Suite PWA manifest, single root service worker, and offline precaching

**What to build:** Make the entire Offline Chess Suite installable as a single Progressive Web App on Android and desktop browsers, and capable of running completely offline after one initial online visit to the Landing Page. Expose a single web manifest at the root of the Suite and register a single root service worker that precaches the Landing Page and all four Tools (including PGN Reader's pieces and worker, Woodpecker Trainer's demo set, and Woodpecker Generator's checked-in sample index) on install. Preserve Woodpecker Generator's runtime caching and `HEAD` size-probe handling for the optional large generated puzzle index without precaching that multi-hundred-megabyte file during installation.

**Blocked by:** 02: Mount Blind Chess at `/blind-chess/` with shared Suite Theme, 03: Mount PGN Reader at `/pgn-reader/` with Suite Theme and palette, 04: Mount Woodpecker Generator and Trainer with cross-links and shared Theme

**Status:** claimed

- [ ] Only one web app manifest exists in the assembled Suite (`/manifest.webmanifest`), declaring "Offline Chess", standalone display, root `start_url` and `scope`, and the Suite's 192×192, 512×512, and 512×512 maskable icons.
- [ ] A single Suite service worker registered at root scope (`/`) precaches the Landing Page and all four Tools on installation so that visiting `/` once while online caches every Tool's HTML shell, scripts, styles, icons, piece graphics, demo set, and sample puzzle index.
- [ ] When the browser goes offline (or the server stops) after initial installation on `/`, navigating to `/`, `/blind-chess/`, `/pgn-reader/`, `/woodpecker-generator/`, and `/woodpecker-trainer/`—including hard reloads on each path—succeeds with zero network errors.
- [ ] The Suite service worker preserves Woodpecker Generator's runtime caching and `HEAD` request support for the optional generated puzzle index without including the ~437 MB generated index in the install precache list.
- [ ] On activation, the Suite service worker deletes only outdated Suite caches and never wipes active Suite caches.
- [ ] Automated Suite E2E tests verify manifest installability metadata, full precaching after a single visit to `/`, offline navigation and operation across all five surfaces, and runtime/`HEAD` handling for Woodpecker Generator's puzzle index.
