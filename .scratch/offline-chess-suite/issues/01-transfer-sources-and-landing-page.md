# 01: Transfer Source Apps and bootstrap the Suite Landing Page

**What to build:** Bring the three Source Apps (Blind Chess, PGN Reader, and Woodpecker) into the Suite repository with their git history preserved while leaving the original Source App repositories untouched. Pin the Suite Node runtime to 24.11.1, generate the Suite's neon line-art chess-knight icon family (matching the visual style of the three existing Tool icons), and serve the Offline Chess Landing Page at the root of the assembled static output. A player opening the Landing Page sees the Suite in dark mode by default, can switch between dark and light using the header Sun/Moon button (persisted in the shared Suite Theme preference), and sees four cards in order—Blind Chess, PGN Reader, Woodpecker Generator, and Woodpecker Trainer—each displaying its Tool icon, name, and description.

**Blocked by:** None (can start immediately)

**Status:** claimed

- [ ] All three Source Apps are imported into the Suite repository via `git subtree` with full commit history preserved, and the original Source App repositories have zero uncommitted or new commits.
- [ ] The Suite pins Node 24.11.1 and provides a root build and preview workflow that outputs the Landing Page at the root of the assembled distribution directory.
- [ ] A newly generated Suite icon (neon line-art chess knight on an indigo-to-plum rounded square with wood-grain curves, sparkles, and coral-orange glow) is exported in 32×32, 180×180, 192×192, 512×512, and 512×512 maskable PNG sizes and wired as the Landing Page favicon and Apple touch icon.
- [ ] The Landing Page renders a header with the title "Offline Chess" and a Sun/Moon icon button that toggles only between `dark` and `light`, defaulting to `dark` on a fresh browser profile and persisting the selection under the shared Suite Theme storage key.
- [ ] The Landing Page displays four cards in the exact order: Blind Chess, PGN Reader, Woodpecker Generator, and Woodpecker Trainer, each showing its existing neon Tool icon, title, and one-line description, and linking to its respective flat subpath in the same window.
- [ ] An automated Suite browser E2E test verifies that the Landing Page loads in dark mode by default, toggles between dark and light cleanly across reloads, and renders all four Tool cards with their icons and target links.
