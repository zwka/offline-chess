# 02: Mount Blind Chess at `/blind-chess/` with shared Suite Theme

**What to build:** Integrate Blind Chess into the Suite's assembled build at the `/blind-chess/` subpath so a player can click the Blind Chess card on the Landing Page and use all six 60-second blindfold training drills with their attempt history and personal bests preserved. Replace Blind Chess's three-state Theme selector with the Suite's unified two-state (light/dark, defaulting to dark) Sun/Moon icon button backed by the shared Suite Theme key, switch its browser favicon and Apple touch icon to the Suite icon, and remove its standalone web manifest and service-worker registration so it behaves strictly as a Tool inside the Suite.

**Blocked by:** 01: Transfer Source Apps and bootstrap the Suite Landing Page

**Status:** ready-for-agent

- [ ] The root Suite build compiles Blind Chess and places its static assets under `/blind-chess/` with all asset references resolving cleanly from that subpath.
- [ ] Blind Chess uses the shared Suite Theme storage key, defaults to `dark` when no valid preference is saved, removes the `system` Theme option, and renders the consistent Sun/Moon icon toggle button in its header.
- [ ] Toggling the Theme on the Landing Page and navigating to Blind Chess (or toggling inside Blind Chess and returning via browser back navigation) preserves the selected Theme across both surfaces.
- [ ] Blind Chess references the Suite favicon and Apple touch icon and no longer links a standalone web manifest or registers its own service worker.
- [ ] All existing Blind Chess unit tests pass (with Theme preference tests updated for the two-state dark-default contract), and the Suite E2E test verifies launching Blind Chess from the Landing Page, sharing the Theme, and completing a drill interaction.
