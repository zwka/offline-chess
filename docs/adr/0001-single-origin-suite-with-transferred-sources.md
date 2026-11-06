# Single-origin Suite with transferred sources

Blind Chess, PGN Reader and Woodpecker (Generator and Trainer) are combined into one installable, offline-first Suite. Each Source App is transferred into this repository with `git subtree`, keeping its history, and the original repositories are frozen; all further changes happen here only. The Landing Page is served at `/` and each Tool from its own flat subpath on the same origin. One Suite service worker precaches every Tool, and only the Suite exposes a web manifest, so one install on Android makes the whole Suite available offline.

## Considered Options

- **Separate deployments linked from a Landing Page**: rejected. Links leave the installed app's scope, and offline use would need each Tool to be visited and installed separately.
- **Submodules or a build that reads sibling repositories**: rejected. The Theme alignment and subpath fixes would then have to be made in the Source Apps, which must stay untouched.
- **One service worker per Tool at nested scopes**: rejected. Each Tool would only work offline after it had been opened once, there would be four update lifecycles, and Woodpecker's worker deletes every cache it doesn't own.

## Consequences

- "No change in functionality" means users can do exactly what they could before. Changes that are not functional are allowed: base paths, absolute URLs, removing per-Tool manifests and service workers, and Theme alignment.
- Each Tool keeps its own `package.json` and lockfile. A root build script puts their outputs together into one `dist/`.
- Generator's full puzzle index (~437 MB) is never precached. It is cached at runtime, as the Source App already does.
- Data saved by installs of the Source Apps on their own origins is not migrated.
- Deliberate functional exceptions: the Theme is reduced to light/dark only, defaults to dark, and is shared across the Suite. The Handoff ("Do Puzzles") is added between Generator and Trainer, which only works because both are on the same origin.
