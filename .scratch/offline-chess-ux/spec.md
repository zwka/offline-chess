# Offline Chess: independent Tools, cohesive design, durable progress

Status: ready-for-agent
GitHub issue: https://github.com/zwka/offline-chess/issues/3

## Problem Statement

Offline Chess works, but moving among its four Tools feels like leaving one independent application for another. There is no consistent way back to the Landing Page or directly between every Tool, and leaving or reopening can discard unfinished work. The player cannot reliably tell what is ready offline, and archived Puzzle Sets cannot be browsed and restored.

The player uses every Tool without a fixed routine, on both phone and desktop. They want a more attractive, intuitive Suite without a mandatory training program, an activity dashboard, or the loss of each Tool's independence.

## Solution

Create a cohesive, richer Ink & Brass design with serif major headings, readable sans-serif controls, a gallery-style Landing Page, and an original Open board logo alongside the Offline Chess name. The brand links to the Landing Page; a compact Switch Tool control inside each Tool provides direct access to all four Tools without a redundant Landing Page item.

Preserve each Tool's unfinished activity across navigation, reloads, and reopening. Offer Resume or Start fresh before restoring unfinished activity; opening a Tool must not restart timing. Clarify each Tool's primary tasks, restore access to Archived Puzzle Sets, and report separately verified offline readiness for the Tools and the optional full puzzle database.

Add one optional connection: after solving a Puzzle or revealing its solution, study its supplied line in a separate PGN Reader view and return to the originating Trainer Run without disturbing an existing PGN study.

## User Stories

1. As a player, I want all four Tools equally accessible, so that I can choose freely without following a prescribed routine.
2. As a player, I want a gallery-style Landing Page with clear Tool names and descriptions, so that I can find the task I want.
3. As a player, I want the Suite to feel cohesive while retaining purpose-built Tool layouts, so that familiarity does not come at the expense of usability.
4. As a phone user, I want readable, touch-friendly controls and boards, so that I can practice comfortably on a small screen.
5. As a desktop user, I want useful side-by-side layouts where space permits, so that I can study without unnecessary scrolling.
6. As a player, I want Ink & Brass in both light and dark, so that I can use the same visual identity in different environments.
7. As a player, I want major headings with chess-book character and clear functional typography, so that the Suite feels distinctive without making moves and controls harder to read.
8. As a player, I want a recognizable Open board symbol beside Offline Chess, so that the Suite has a coherent identity.
9. As an installed-Suite user, I want legible app icons derived from the logo, so that I can recognize the Suite at small sizes.
10. As a player, I want task-specific Tool icons, so that board vision, PGN study, Puzzle Set generation, and solving are easy to distinguish.
11. As a player, I want clicking the brand to return to the Landing Page, so that I have a predictable navigation anchor.
12. As a player, I want a compact Switch Tool control inside every Tool, so that I need not visit the Landing Page to switch tasks.
13. As a player, I want the switcher to omit a redundant Landing Page item, so that navigation remains concise.
14. As a player, I want my unfinished activity retained when switching Tools, so that navigation does not discard work.
15. As a player, I want unfinished activity to survive reloads and reopening, so that I can continue later.
16. As a returning player, I want a clear Resume or Start fresh choice, so that I control whether to continue previous work.
17. As a returning player, I want timers to remain stopped until I explicitly resume, so that opening a Tool does not consume time.
18. As a player, I want Start fresh to explain and confirm replacement of unfinished work, so that I do not lose it accidentally.
19. As a player, I want Start fresh to retain imported content and completed history, so that a new activity is not a destructive reset.
20. As a PGN Reader user, I want Resume to restore the exact game, move, and variation, so that I can continue at my actual stopping point.
21. As a Generator user, I want my filters and generated output retained, so that I do not need to rebuild a Puzzle Set after navigating away.
22. As a Trainer user, I want current Run and Puzzle progress retained, so that switching Tools does not abandon or duplicate a Run.
23. As a Blind Chess user, I want an unfinished round saved with its remaining time and current task, so that I can resume rather than restart.
24. As a Generator user, I want rating, Tactic Themes, and puzzle count immediately accessible, so that common generation tasks are straightforward.
25. As a Generator user, I want seed and all/any matching under expandable Advanced options, so that advanced control remains available without dominating the form.
26. As a Generator user, I want generated output, Do Puzzles, and export easy to reach on phone and desktop, so that finishing generation has an obvious next action.
27. As a Generator user, I want the existing reproducible selection and direct Handoff preserved, so that simplification does not remove capabilities.
28. As a PGN Reader user, I want a dedicated Library view for importing and finding games, so that management has a clear home.
29. As a PGN Reader user, I want a focused Study view with board and notation, so that library controls do not distract from reading.
30. As a PGN Reader user, I want a clear route between Library and Study without losing my place, so that browsing is safe.
31. As a Blind Chess user, I want drill instructions before an explicit Start action, so that I can prepare without pressure.
32. As a Blind Chess user, I want clear explanation that the 60-second clock begins with the first answer, so that timing is predictable.
33. As a Trainer user, I want to browse Archived Puzzle Sets, so that archiving does not make them inaccessible.
34. As a Trainer user, I want to restore an Archived Puzzle Set without losing its Runs, so that archiving is reversible.
35. As a Trainer user, I want archive/restore separate from deletion, so that destructive actions are unambiguous.
36. As a Trainer user, I want Study solution after a Puzzle is solved or its solution revealed, so that I can examine its recorded line.
37. As a Trainer user, I want unanswered solutions protected from accidental exposure, so that opening Reader cannot spoil an active Puzzle.
38. As a player, I want Puzzle Solution Study identified as supplied-line playback rather than engine analysis, so that its meaning is honest.
39. As a player studying a solution, I want its correct starting position and full supplied line available, so that I can step through it accurately.
40. As a PGN Reader user, I want Puzzle Solution Study separate from my current game and position, so that the connection does not overwrite my existing study.
41. As a PGN Reader user, I want solution study not to add a source automatically to my Library, so that temporary review does not clutter it.
42. As a Trainer user, I want Return to Trainer to retain the originating Run and Puzzle, so that reviewing a solution does not interrupt progress.
43. As a player, I want a quiet offline-status control with details, so that I can check readiness without persistent visual clutter.
44. As a player, I want Tool readiness distinguished from full puzzle database availability, so that one does not falsely imply the other.
45. As a player, I want readiness to reflect verified local resources rather than service-worker registration alone, so that I can trust it before going offline.
46. As a player, I want status to reflect incomplete or failed caching and later cache changes, so that stale success messages do not mislead me.
47. As a player, I want existing local PGNs, Puzzle Sets, histories, backups, and scoring semantics protected during the upgrade, so that the redesign does not erase or reinterpret my work.

## Implementation Decisions

### Delivery and architectural boundaries

- This is a design-approved implementation spec, not authorization to begin implementation in the originating session.
- Phase 1: shared visual identity and navigation across the Landing Page and every Tool, validated on phone and desktop.
- Phase 2: durable Saved Activities, explicit entry choices, Tool-specific simplification, and archive recovery.
- Phase 3: Puzzle Solution Study and distinct, verifiable offline-readiness reporting.
- The phases describe delivery order, not permission to ship silently destructive intermediate navigation. Existing behavior and saved data must remain safe throughout.
- Retain the single-origin, installable, offline-first Suite, one root service worker, one Suite manifest, independent Tools, and current Tool URLs. No backend or cloud account is introduced.
- Deliberately extend the original integration-only functionality boundary in the existing Suite ADR. The new functionality is limited to this spec; this is not a framework rewrite or a change to the single-origin decision. Record the intentional expansion in domain documentation during implementation rather than silently presenting it as visual cleanup.
- Preserve existing Generator-to-Trainer Handoff deduplication, unarchiving, and active-Run reuse. Do Puzzles is an explicit request to start/continue the handed-off set; it must not create a duplicate or abandon an existing Run. General Tool-entry Resume/Start fresh behavior must not regress that contract.
- Reuse existing storage and runtime boundaries where practical. This spec does not prescribe one shared database, a new routing framework, or storage of the full puzzle database in Saved Activity records.

### Visual identity and navigation

- Richer Ink & Brass is the chosen exploration direction, including brass-toned header, board frame, and feedback-panel treatment, not merely a single accent button. Retain light/dark Theme behavior shared across the Suite, with the existing dark default.
- Use serif typography for major headings, sans-serif for controls and functional content, and legible move/timer text. Success and error feedback must remain distinguishable from the brass styling.
- Refine the original Open board concept: an open geometric board frame, four inset squares, and a separated corner detail. Keep symbol plus Offline Chess wordmark. Validate it at favicon, header, regular app-icon, and maskable app-icon sizes and in one color before finalizing assets.
- Use one coherent task-specific Tool icon family. Prototype chess-character placeholders and generic stock glyphs are not approved final assets.
- The brand is the Landing Page link. The Tool switcher is inside Tools, not an extra control on the Landing Page, and has no separate Landing Page entry.
- Use responsive layouts suited to each Tool rather than forcing identical screen composition. Keep boards readable and primary feedback/actions accessible on phone as well as desktop.
- Preserve existing production chess-piece artwork and its attribution unless a separate artwork decision is made. The sketch's Unicode pieces are not an approved replacement.

### Durable Saved Activities and safety

- A Saved Activity means unfinished work available to Resume; it is not an imported library item, a completed-history record, or a new kind of Trainer Run.
- Persist before navigation and as activity changes so reload/reopening can recover it. Handle unavailable, quota-limited, interrupted, or invalid storage without falsely claiming that work was saved. Avoid relying only on an unload event.
- Preserve enough state to restore the actual activity: Reader source/game/move/variation; Generator inputs and generated output; Trainer's established active-Run/Puzzle state; Blind Chess drill, prompt/round state, remaining time, and relevant accumulated answers.
- On ordinary entry to a Tool with unfinished work, show an informative Resume/Start fresh choice. Do not restart a clock just by entering, loading, or inspecting that choice.
- Explicit Resume of Blind Chess continues remaining time rather than resetting it. Untimed preparation remains untimed. The current first-answer clock start remains intact.
- Preserve Active Solving Time semantics: time outside Trainer's visible Solve view, including Reader solution study and resume-choice screens, is not Trainer Active Solving Time. Timer restoration must not add elapsed wall time while the Suite was closed.
- Start fresh must explain what unfinished work is replaced, require confirmation before replacement, and preserve imported content and completed history. In Trainer, retain existing rules for active and Abandoned Runs; do not delete a Run to simulate starting fresh.
- Do not add a general multiple-drafts feature or reduce Trainer's existing support for active Runs across different Puzzle Sets. Detailed storage schema/version migrations are implementation choices, subject to data-preservation tests.
- Preserve the existing shared Theme and stored Tool content across upgrades. Corrupt or unavailable Saved Activity metadata must not make otherwise valid libraries inaccessible.

### Tool-specific organization

- Generator keeps rating, Tactic Themes, count, and necessary naming/generation controls readily accessible. Seed and all/any matching are expandable advanced controls; expanding/collapsing must not reset their values or change generation semantics.
- Generator output must have an obvious completion cue and reachable Do Puzzles/export actions, including when a long filter form precedes it on a phone. Persist generated output instead of promising durability for React-only state.
- PGN Reader separates Library management from focused Study. Retain imports, sources, search, games, variation navigation, comments, annotations, parser warnings, and raw-PGN access; move secondary information appropriately rather than removing it.
- Blind Chess presents drill instructions and an explicit Start, explains the first-answer timing rule, and retains all six drills and existing completed Attempt history/personal bests.
- Trainer adds an Archived Puzzle Sets view and Restore action. Restoring preserves Puzzle Set identity and all Runs. Include never-played archived sets; discovery must not depend on having a History entry.
- Keep deletion explicit and separate from archiving. Do not change First-Try Solve, Failure, eventual-completion, legal-move, or mate-in-one acceptance rules as part of the redesign.

### Puzzle Solution Study

- Study solution is available only after the Puzzle is completed or its solution explicitly revealed. A wrong move alone must not expose the line through this connection. Revealing keeps the current scoring consequence.
- Provide recorded-line playback in a separate Reader context, not an arbitrary engine-analysis feature or an annotation editor.
- Derive a valid start position and legal continuation from the Puzzle and existing move interpretation. Respect the source setup move, side to move, promotion, and the whole supplied line; do not blindly serialize source moves against the wrong FEN.
- Opening this context must preserve the player's existing PGN source, game, move, and variation. It must not automatically create a PGN Library source.
- Retain stable originating Trainer context so Return to Trainer restores the same Run and Puzzle without duplication, abandonment, score changes, or accidental timing during Reader study.
- Keep this context usable offline and restorable after reload. If its origin is no longer available, explain the situation and offer safe normal Tool navigation instead of fabricating a Run or showing a blank view.
- Keep Solution Study terminology distinct from the established Handoff, which specifically describes Generator passing a Puzzle Set to Trainer.

### Offline confidence

- Provide a quiet status control opening understandable details, accessible from the Landing Page and Tools without turning the Landing Page into an activity dashboard.
- Distinguish verified Tool/resource readiness from availability of the optional full puzzle database. Sample-index availability must not be labeled full-database availability.
- Base readiness on locally available required resources, not solely connectivity or an active/registered service worker. Represent incomplete, checking, failed, and unavailable conditions honestly.
- Recheck or invalidate readiness after cache lifecycle changes, failed caching, and relevant updates. A historical verification is not an unconditional guarantee against later browser storage eviction.
- Keep the large full index outside mandatory precaching. Opening readiness details must not silently initiate a full-index download merely to discover its status.
- Preserve the single-install offline behavior and existing local-file workflows. No automatic full-index download, offline-download manager, or cloud synchronization is added by this spec.

## Testing Decisions

- The user approved the assembled Suite's existing Playwright browser boundary as the primary test seam. Test observable behavior through real navigation and controls rather than component structure, private state, or CSS class names.
- Reuse existing Suite offline, Theme/navigation, and Generator-to-Trainer Handoff journeys as prior art. Reuse per-Tool storage, parser/reader, scoring, and timer tests for focused edge cases rather than building a parallel test architecture.
- Use deterministic local PGNs and Puzzle Sets. Use a small fixture standing in for the optional full index to test its cache state and failure cases; do not download the production database in CI.
- Cover all four Tools, the Landing Page, phone/desktop viewports, both Themes, brand navigation, and direct Tool switching. Review representative screenshots and keyboard/touch interaction; do not use screenshot or CSS assertions as substitutes for functional assertions.
- Cover switching away, reload, browser reopening using persisted browser storage, Resume/Start fresh, replacement cancellation, confirmation, missing/invalid state, write failure, and preservation of existing imports/history. Fresh activity and previously completed activity should not produce misleading resume prompts.
- Assert exact Reader move/variation restoration, Generator filter/output restoration, unchanged Trainer progress, and Blind Chess remaining-time/prompt restoration. Use controllable clocks to assert paused time and explicit resumption without fragile real-time waits.
- Assert Generator advanced settings preserve values and selection semantics, output actions are reachable, and repeated Do Puzzles retains existing content-hash deduplication and active-Run behavior.
- Assert archive discovery/restoration for both played and never-played sets, preserving identity and Runs and keeping deletion separate.
- Exercise solved and explicitly revealed solution-study entry, deny premature access, and verify FEN/setup move/side-to-move/promotion/full-line correctness using real fixtures. Test Reader → Trainer return, reload, and missing-origin recovery while preserving an unrelated Reader study.
- Assert that revealing or viewing an existing revealed solution cannot recover a first-try point, that normal solving rules remain unchanged, and that Reader review does not accumulate Trainer Active Solving Time.
- Verify Tool readiness independently from optional full-index availability, including partial precache failure, unavailable resources, stale status after update, cache removal, and offline reload/navigation. Opening the status UI must not fetch the full index. Retain existing single-manifest/service-worker and no-full-index-precache coverage.
- Check labels, focus visibility/order, keyboard access, touch targets, and distinguishable feedback in both Themes as part of validating the new controls and richer brass treatment.
- No production implementation or tests were run during the design exploration. Interactive sketches demonstrate decisions, not verified production functionality.

## Out of Scope

- A guided training program, mandatory Tool sequence, recent-activity dashboard, streaks, or cross-Tool scoring.
- Chess engine integration, arbitrary best-move hints, automatic tactical extraction, PGN annotation editing, or judging arbitrary game continuations as objectively best moves.
- Additional connections such as Trainer-to-Generator weakness filters, Blind Chess warm-up journeys, or PGN-continuation practice.
- Cloud sync, accounts, migration from the former Source App origins, or a new Suite-wide backup format. Preserve existing backups; do not promise new backup capabilities.
- A generic multiple-draft manager, framework rewrite, backend, or replacement of production chess-piece artwork.
- An automatic full-database download or a full offline-download management feature.
- Starting implementation, creating implementation tickets, committing, or pushing to a remote repository as part of publishing this spec.

## Further Notes

- The user confirmed the complete design brief, requested `/to-spec`, and approved the proposed testing seams. Final logo proportions, exact colors/type sizing, layout breakpoints, and storage interfaces require refinement within the agreed direction; the inline sketches are not final production assets.
- Exploration selected the gallery over journal/compact-list alternatives; Ink & Brass over Forest & Parchment and Slate & Blue; Open board over the custom knight and OC monogram; richer brass over the quieter treatment.
- At the user's explicit request, publish this spec as a GitHub issue in zwka/offline-chess with the ready-for-agent label, retaining this local copy. This overrides the local-Markdown publication default for this spec only; the transferred Woodpecker Tool's separate GitHub tracker is not the destination.
- Respect the established domain glossary and the single-origin architecture. The Landing Page remains a Tool chooser rather than a training dashboard; its former “links to Tools and nothing more” wording must accommodate the explicitly approved offline-status details.
- Publish the agreed spec without silently turning approved visual exploration into production implementation. Further implementation breakdown can be requested separately.
