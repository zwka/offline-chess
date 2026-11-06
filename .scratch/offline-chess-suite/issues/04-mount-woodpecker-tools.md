# 04: Mount Woodpecker Generator and Trainer with cross-links and shared Theme

**What to build:** Integrate both Woodpecker Generator (`/woodpecker-generator/`) and Woodpecker Trainer (`/woodpecker-trainer/`) into the Suite's assembled build so a player can launch either Tool from the Landing Page and move directly between them via always-visible same-window header links ("Trainer →" and "Generator →"). Update both Tools so all assets, demo Puzzle Sets, and sample/generated puzzle index requests resolve relative to their subpaths, replace their three-state Theme controls with the Suite's two-state dark-default Sun/Moon icon button backed by the shared Suite Theme key, switch their favicons and Apple touch icons to the Suite icon, and remove their standalone web manifests and service-worker registrations.

**Blocked by:** 01: Transfer Source Apps and bootstrap the Suite Landing Page

**Status:** ready-for-agent

- [ ] The root Suite build compiles Woodpecker Generator under `/woodpecker-generator/` and Woodpecker Trainer under `/woodpecker-trainer/`, with all asset, demo Puzzle Set, and puzzle-index URLs resolving relative to each Tool's subpath.
- [ ] Both Woodpecker Generator and Woodpecker Trainer use the shared Suite Theme key, default to `dark` when no preference is stored, remove the `system` option, and render the consistent Sun/Moon header icon toggle.
- [ ] Header cross-links ("Trainer →" in Generator and "Generator →" in Trainer) are always visible in production and development builds, point to `/woodpecker-trainer/` and `/woodpecker-generator/`, and navigate within the same window without opening a new browser tab.
- [ ] Both Tools use the Suite favicon and Apple touch icon and neither exposes a standalone web manifest or registers its own service worker.
- [ ] Existing Woodpecker unit tests pass, and the Suite E2E test verifies launching both Tools from the Landing Page, navigating between them via the header cross-links in the same window, and sharing the Theme state across the Suite.
