# Trainer solving workspace and safe Run resumption

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/11

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Deliver the richer Ink & Brass Trainer solving experience and an explicit safe choice to resume an existing Run or start fresh, without changing scoring or losing progress.

## Acceptance criteria

- [ ] Apply shared branding and typography, richer brass header/frame/panels, readable boards, and nearby feedback/actions on phone and desktop in both Themes. Preserve production chess artwork and attribution.
- [ ] Ordinary entry with unfinished activity offers an informative Resume/Start fresh choice and keeps timing paused until explicit Resume. Multiple Puzzle Sets may retain their existing active Runs.
- [ ] Restore current Run/Puzzle/move/error/reveal state across navigation, reload, and reopening; do not duplicate Runs or add closed-Suite wall time.
- [ ] Keep Active Solving Time limited to the visible Solve view, excluding entry choices, hidden/away time, and future Reader review; handle persistence failures honestly.
- [ ] Start fresh explains and confirms replacement, retains Puzzle Sets and history, and follows existing Abandoned Run semantics rather than deleting the previous Run. Cancellation preserves it.
- [ ] Preserve whole-line First-Try Solve, Failure, eventual completion, retries, legal-move checks, and legal mate-in-one alternatives. Revealing retains its first-try scoring consequence.
- [ ] Existing explicit Do Puzzles Handoff continues the handed-off set without an incompatible generic entry gate, duplication, or abandonment.
- [ ] Cover responsive interactions, persisted Run restoration, explicit resume, replacement/cancellation, storage failure, score regression, and controlled-clock behavior at existing browser/storage/scoring seams.

## Blocked by

- https://github.com/zwka/offline-chess/issues/4 — Branded Landing Page and Suite visual identity.
