# Offline Chess

A single installable, offline-first chess app that brings together several standalone chess training and study apps behind one home screen.

## Language

**Suite**:
The single installable app, "Offline Chess", that contains every Tool.
_Avoid_: App, bundle, launcher, shell

**Landing Page**:
The Suite's home screen, which links to each Tool and nothing more.
_Avoid_: Home, dashboard, menu, index

**Tool**:
One self-contained chess app reachable from the Landing Page: Blind Chess, PGN Reader, Woodpecker Generator, or Woodpecker Trainer.
_Avoid_: App, module, sub-app, feature

**Source App**:
The original standalone repository a Tool was transferred from; frozen once its Tool lives in the Suite.
_Avoid_: Upstream, original app, legacy app

**Handoff**:
Passing a generated Puzzle Set from Woodpecker Generator directly to Woodpecker Trainer inside the Suite, without a file, so the player can start solving at once.
_Avoid_: Transfer, send, share, export

**Theme**:
The Suite-wide visual appearance (light or dark) shared by the Landing Page and every Tool.
_Avoid_: Skin, color mode, Tactic Theme (a Woodpecker puzzle motif, unrelated)
