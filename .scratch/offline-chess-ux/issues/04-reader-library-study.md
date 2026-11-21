# Separate PGN Reader Library and focused Study

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/7

## Parent

https://github.com/zwka/offline-chess/issues/3

## What to build

Give PGN Reader a clear Library for importing and finding games and a focused Study view for board and notation, using the approved visual identity.

## Acceptance criteria

- [ ] Library supports retained sources, PGN import, game search and selection without crowding the focused Study view.
- [ ] Study provides board and notation with useful wide-screen composition and a readable phone layout.
- [ ] Keep moves, variations, comments, annotations, game metadata, parser warnings, and raw-PGN access available; secondary content may move but must not disappear.
- [ ] Provide a clear Library/Study return path that preserves the current in-memory study position; durable reopening is delivered by the dependent resumption ticket.
- [ ] Apply shared branding and richer Ink & Brass in both Themes, readable serif/sans-serif hierarchy, and accessible controls without replacing production chess artwork or dropping attribution.
- [ ] Existing imported sources remain usable; keep the current source/game identities and data safe.
- [ ] Add browser journeys with deterministic PGNs covering import, search, game opening, variation navigation, Library/Study return, and representative phone/desktop keyboard/touch layouts.

## Blocked by

- https://github.com/zwka/offline-chess/issues/4 — Branded Landing Page and Suite visual identity.
