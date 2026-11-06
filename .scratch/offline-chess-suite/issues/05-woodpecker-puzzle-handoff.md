# 05: Direct Puzzle Set Handoff ("Do Puzzles") from Generator to Trainer

**What to build:** Enable a player who has generated a Puzzle Set in Woodpecker Generator to start solving it immediately in Woodpecker Trainer without exporting and importing a JSON file. Once a Puzzle Set is generated, Woodpecker Generator displays a primary "Do Puzzles" button alongside "Export JSON". Clicking "Do Puzzles" hands off the Puzzle Set through a shared IndexedDB inbox on the Suite origin and opens Woodpecker Trainer in the same window. Woodpecker Trainer consumes the pending Puzzle Set on startup through its existing validation and import pipeline, saves it if new and immediately starts a Run on the first Puzzle—or, if that Puzzle Set already exists in Trainer by content hash, resumes its active Run (or starts a new Run if none is active, unarchiving the set if needed) without duplicating the set or abandoning an active Run.

**Blocked by:** 04: Mount Woodpecker Generator and Trainer with cross-links and shared Theme

**Status:** resolved

- [x] When a Puzzle Set has been generated in Woodpecker Generator, a primary "Do Puzzles" button appears next to "Export JSON" and requires a non-empty Puzzle Set name before proceeding, just like "Export JSON".
- [x] Clicking "Do Puzzles" stores the generated Puzzle Set in a shared IndexedDB handoff inbox and navigates the current window to `/woodpecker-trainer/`.
- [x] When Woodpecker Trainer loads with a pending Puzzle Set in the handoff inbox, it clears the inbox item, validates and normalizes the set via its existing import logic, stores the new Puzzle Set, and automatically starts a Run so the player lands directly on Puzzle 1.
- [x] If the handed-off Puzzle Set already exists in Woodpecker Trainer (matched by content hash), Trainer does not create a duplicate set; if the existing set was archived it unarchives it, and if an active Run exists for that set it resumes that Run at the current puzzle—otherwise it starts a new Run—never abandoning an active Run.
- [x] Automated unit and Suite E2E tests verify the complete Handoff flow for both a newly generated Puzzle Set (landing on Puzzle 1) and a repeated Handoff of the same Puzzle Set after progress has been made (resuming the active Run without data loss or duplication).
