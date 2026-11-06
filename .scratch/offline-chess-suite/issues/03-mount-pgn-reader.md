# 03: Mount PGN Reader at `/pgn-reader/` with Suite Theme and palette

**What to build:** Integrate PGN Reader's browser/mobile build into the Suite's assembled output at `/pgn-reader/` so a player can open it from the Landing Page, import PGN sources, search games, and step through moves, variations, and board annotations. Align PGN Reader's visual appearance with the rest of the Suite by adopting the Blind Chess / Woodpecker warm paper and deep green light palette, deep green-black and mint dark palette, Inter typography, and Woodpecker Trainer's chessboard square colors. Connect its header Sun/Moon toggle to the shared Suite Theme key (defaulting to dark), switch its favicon and Apple touch icon to the Suite icon, and remove its standalone manifest and service-worker registration in the assembled Suite.

**Blocked by:** 01: Transfer Source Apps and bootstrap the Suite Landing Page

**Status:** ready-for-agent

- [ ] The root Suite build compiles PGN Reader's browser build and places it under `/pgn-reader/` with all scripts, stylesheets, piece SVGs, and web workers loading cleanly from that subpath.
- [ ] PGN Reader adopts the Suite's light and dark color tokens, header styling, Inter font stack, and Woodpecker Trainer's light/dark chessboard square colors (`#e8d6bd` and `#9a6b4d`).
- [ ] PGN Reader reads and writes the shared Suite Theme key, defaults to `dark` on a fresh browser profile, and uses the consistent Sun/Moon icon button in its header so Theme changes sync between the Landing Page and PGN Reader.
- [ ] PGN Reader uses the Suite favicon and Apple touch icon and does not expose a standalone web manifest or register a per-Tool service worker in the Suite build.
- [ ] PGN Reader's existing test suites pass with updated expectations for the Suite Theme/palette, and the Suite E2E test verifies navigating from the Landing Page to `/pgn-reader/`, syncing the Theme, and importing and viewing a PGN game.
