import {
  PersistentMobileLibrary,
  MOBILE_PAGE_SIZE,
  type MobileLibrary,
  type MobileGameRecord,
  type MobileScanWorker,
  type MobileSourceRecord,
} from "./library.js";
import { renderMobileReader, type MobileReaderHandle } from "./reader.js";
import { NormalStudyBookmark, type StudyBookmark } from "./study-bookmark.js";
import { openSolutionStudy, solutionStudyLink } from "./solution-study.js";

const importPanel = getElement<HTMLElement>("import-panel");
const sourcePanel = getElement<HTMLElement>("source-panel");
const sourceList = getElement<HTMLElement>("source-list");
const sourceListSummary = getElement<HTMLElement>("source-list-summary");
const recordsPanel = getElement<HTMLElement>("records-panel");
const readerPanel = getElement<HTMLElement>("reader-panel");
const libraryHeading = getElement<HTMLElement>("library-heading");
const returnStudy = getElement<HTMLButtonElement>("return-study");
const sourceName = getElement<HTMLElement>("source-name");
const sourceStatus = getElement<HTMLElement>("source-status");
const sourceSize = getElement<HTMLElement>("source-size");
const gameCount = getElement<HTMLElement>("game-count");
const warningCount = getElement<HTMLElement>("warning-count");
const scanProgress = getElement<HTMLProgressElement>("scan-progress");
const progressLabel = getElement<HTMLElement>("scan-progress-label");
const replacementStatus = getElement<HTMLElement>("replacement-status");
const sourceError = getElement<HTMLElement>("source-error");
const sourceInput = getElement<HTMLInputElement>("source-input");
const cancelIntake = getElement<HTMLButtonElement>("cancel-intake");
const clearSource = getElement<HTMLButtonElement>("clear-source");
const searchInput = getElement<HTMLInputElement>("metadata-search");
const recordList = getElement<HTMLElement>("record-list");
const listSummary = getElement<HTMLElement>("list-summary");
const previousPage = getElement<HTMLButtonElement>("previous-page");
const nextPage = getElement<HTMLButtonElement>("next-page");
const themeToggle = getElement<HTMLButtonElement>("theme-toggle");
const themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const solutionLink = solutionStudyLink();
if (solutionLink) libraryHeading.append(solutionLink);

type Theme = "light" | "dark";
const THEME_KEY = "offline-chess.theme.v1";
const DARK_THEME_COLOR = "#172321";
const LIGHT_THEME_COLOR = "#f4f0e7";
let theme: Theme = readTheme() ?? "dark";

function readTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(nextTheme: Theme, persist = true): void {
  theme = nextTheme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  const nextLabel = `Switch to ${theme === "dark" ? "light" : "dark"} mode`;
  themeToggle.title = nextLabel;
  themeToggle.setAttribute("aria-label", nextLabel);
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  if (themeColorMeta) {
    themeColorMeta.content = theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  }
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // The selected theme still applies for this page when storage is unavailable.
    }
  }
}

applyTheme(theme, false);
themeToggle.addEventListener("click", () => applyTheme(theme === "dark" ? "light" : "dark"));
window.addEventListener("pageshow", () => applyTheme(readTheme() ?? "dark", false));
window.addEventListener("storage", () => applyTheme(readTheme() ?? "dark", false));

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // Ignore service worker registration errors in unsupported contexts.
  });
}

const library: MobileLibrary = new PersistentMobileLibrary(() =>
  new Worker(new URL("./scan-worker.js", import.meta.url), { type: "module" }) as unknown as MobileScanWorker,
);

let query = "";
let offset = 0;
let selectedGameId: number | null = null;
let readerGeneration = 0;
let activeReader: MobileReaderHandle | null = null;
let studySourceId: number | null = null;
const normalStudy = new NormalStudyBookmark();
const studyNotice = h("section", { class: "meta-panel study-activity", "aria-label": "Saved study" });
const studyMessage = h("p", { role: "status" });
const resumeStudy = h("button", { type: "button", class: "reader-secondary-button" }, "Resume");
const freshStudy = h("button", { type: "button", class: "reader-secondary-button" }, "Start fresh");
studyNotice.append(studyMessage, resumeStudy, freshStudy);
libraryHeading.after(studyNotice);
resumeStudy.addEventListener("click", () => {
  const bookmark = normalStudy.value;
  if (!bookmark) return;
  const source = library.sources.find((candidate) => candidate.id === bookmark.sourceId);
  if (!source || source.name !== bookmark.sourceName || source.size !== bookmark.sourceSize) {
    normalStudy.message = "The saved source is missing. Your other Library content is still available; choose a game to recover.";
    renderStudyNotice();
    return;
  }
  void library.selectSource(source.id).then(() => {
    if (library.activeSourceId !== source.id) {
      normalStudy.message = "Could not select the saved source. Your saved study is unchanged; Library remains available.";
      renderStudyNotice();
      return;
    }
    openGame(bookmark.gameId, bookmark);
  });
});
freshStudy.addEventListener("click", () => {
  if (!window.confirm("Replace your unfinished PGN study? Start fresh clears its saved place only. Imported PGNs and completed history are retained.")) return;
  if (!normalStudy.save(null)) { renderStudyNotice(); return; }
  closeReader();
  getElement<HTMLElement>("library-title").focus();
  renderStudyNotice();
});
function renderStudyNotice(): void {
  const reading = !readerPanel.hidden;
  studyMessage.textContent = normalStudy.message || (normalStudy.value ? "Unfinished PGN study. Resume your saved place or start fresh." : "");
  resumeStudy.hidden = reading || !normalStudy.value || activeReader !== null;
  freshStudy.hidden = reading || !normalStudy.value;
  studyNotice.hidden = !studyMessage.textContent || (reading && normalStudy.message === "Study saved on this device.");
}
// Retry the current synchronous bookmark before Suite navigation. Merely visiting
// an entry choice must not rewrite it; Puzzle Solution Study owns its own state.
window.addEventListener("offline-chess:before-navigate", (event) => {
  if (!activeReader || !normalStudy.value) return;
  if (!normalStudy.save(normalStudy.value)) event.preventDefault();
  renderStudyNotice();
});
void library.ready().then(() => {
  if (normalStudy.legacy) {
    const source = library.source;
    if (source?.resumeBookmark) {
      normalStudy.value = { version: 1, sourceId: source.id, gameId: source.resumeBookmark.gameId, sourceName: source.name, sourceSize: source.size };
      normalStudy.message = "Older study bookmark: Resume opens the saved game at its start; an exact move was not stored.";
    }
  }
  renderStudyNotice();
});

returnStudy.addEventListener("click", () => {
  setReaderMode(true);
  readerPanel.querySelector<HTMLButtonElement>(".reader-back")?.focus();
});

sourceInput.addEventListener("change", () => {
  const file = sourceInput.files?.[0];
  if (!file) return;
  const previousActiveSourceId = library.activeSourceId;
  query = "";
  offset = 0;
  searchInput.value = "";
  void library.replaceSource({ name: file.name, blob: file }).then(() => {
    if (library.replacement !== null) return;
    if (library.activeSourceId === previousActiveSourceId && library.error && selectedGameId !== null) {
      showReaderError(`Could not import the source: ${library.error}`);
    }
  });
  sourceInput.value = "";
});

cancelIntake.addEventListener("click", () => library.cancelReplacement());

clearSource.addEventListener("click", () => {
  const sourceId = library.activeSourceId;
  if (sourceId === null) return;
  void library.removeSource(sourceId).then(() => {
    if (library.error && selectedGameId !== null) {
      showReaderError(`Could not remove the source: ${library.error}`);
    }
  });
});

searchInput.addEventListener("input", () => {
  query = searchInput.value;
  offset = 0;
  renderGames();
});

previousPage.addEventListener("click", () => {
  offset = Math.max(0, offset - MOBILE_PAGE_SIZE);
  renderGames();
});

nextPage.addEventListener("click", () => {
  offset += MOBILE_PAGE_SIZE;
  renderGames();
});

library.subscribe(() => {
  renderSourceList(library.sources);
  renderSource(library.source);
  if (selectedGameId !== null && !library.sources.some((source) => source.id === studySourceId)) closeReader();
  if (library.replacement === null) renderGames();
});

window.addEventListener("beforeunload", () => {
  activeReader?.cleanup();
  library.close();
});
setReaderMode(false);
renderSourceList(library.sources);
renderSource(library.source);
renderGames();

if (new URLSearchParams(location.search).get("solution") === "1") void openSolutionStudy();

function renderSourceList(sources: MobileSourceRecord[]): void {
  sourceListSummary.textContent = sources.length === 0
    ? "No sources"
    : `${sources.length} source${sources.length === 1 ? "" : "s"}`;
  sourceList.replaceChildren(...sources.map(renderSourceItem));
}

function renderSourceItem(source: MobileSourceRecord): HTMLElement {
  const active = source.id === library.activeSourceId;
  const bookmark = source.resumeBookmark;
  const select = h(
    "button",
    {
      class: `source-select${active ? " source-select-active" : ""}`,
      type: "button",
      "aria-label": `Select ${source.name}`,
      ...(active ? { "aria-current": "true" } : {}),
    },
    h("strong", { class: "source-select-name" }, source.name),
    h("span", { class: "source-select-meta" }, `${source.game_count} Game record${source.game_count === 1 ? "" : "s"}`),
    active ? h("span", { class: "source-active-mark" }, "Active") : null,
  );
  select.addEventListener("click", () => {
    query = "";
    offset = 0;
    searchInput.value = "";
    void library.selectSource(source.id);
  });

  const continueButton = bookmark
    ? h(
        "button",
        {
          class: "source-continue",
          type: "button",
        },
        "Continue",
      )
    : null;
  if (continueButton && bookmark) {
    continueButton.addEventListener("click", () => continueSource(source.id, bookmark.gameId));
  }

  const remove = h(
    "button",
    {
      class: "source-remove",
      type: "button",
      "aria-label": `Remove ${source.name}`,
      title: `Remove ${source.name}`,
    },
    "Remove",
  );
  remove.addEventListener("click", () => {
    void library.removeSource(source.id);
  });

  return h(
    "div",
    { class: `source-item${active ? " source-item-active" : ""}`, role: "listitem" },
    select,
    continueButton,
    remove,
  );
}

function renderSource(source: MobileSourceRecord | null): void {
  sourceName.textContent = source?.name ?? "No PGN source selected";
  sourceStatus.textContent = source?.scan_status ?? "idle";
  sourceStatus.className = `status status-${source?.scan_status ?? "idle"}`;
  sourceSize.textContent = source ? formatBytes(source.size) : "-";
  gameCount.textContent = source ? String(source.game_count) : "0";
  warningCount.textContent = source && source.warning_count > 0
    ? `${source.warning_count} warning${source.warning_count === 1 ? "" : "s"}`
    : "No warnings";
  sourceError.hidden = !source?.scan_error;
  sourceError.textContent = source?.scan_error ?? "";

  const progress = source?.progress;
  scanProgress.hidden = !source;
  scanProgress.max = Math.max(1, progress?.bytesTotal ?? source?.size ?? 1);
  scanProgress.value = Math.min(progress?.bytesDone ?? 0, scanProgress.max);
  progressLabel.textContent = progressText(source);
  clearSource.disabled = !source;

  const replacement = library.replacement;
  replacementStatus.hidden = !replacement;
  replacementStatus.textContent = replacement ? replacementText(replacement) : "";
  cancelIntake.hidden = !replacement;
  cancelIntake.disabled = replacement?.scan_status !== "scanning";
  sourceError.hidden = !library.error;
  sourceError.textContent = library.error ?? "";
}

function renderGames(): void {
  let page = library.listGames(query, offset, MOBILE_PAGE_SIZE);
  if (page.total > 0 && page.offset >= page.total) {
    offset = Math.floor((page.total - 1) / page.limit) * page.limit;
    page = library.listGames(query, offset, MOBILE_PAGE_SIZE);
  }

  recordList.replaceChildren(...page.games.map(renderGame));
  const from = page.total === 0 ? 0 : page.offset + 1;
  const to = Math.min(page.offset + page.limit, page.total);
  listSummary.textContent = page.total === 0
    ? query ? "No matching Game records" : "No Game records"
    : `${from}-${to} of ${page.total}`;
  previousPage.disabled = page.offset === 0;
  nextPage.disabled = to >= page.total;
}

function renderGame(game: MobileGameRecord): HTMLElement {
  const record = document.createElement("article");
  record.className = "game-record";
  record.tabIndex = 0;
  record.setAttribute("role", "button");
  record.setAttribute("aria-label", gameLabel(game));
  record.dataset.index = String(game.idx_in_file);
  const open = () => openGame(game.id);
  record.addEventListener("click", open);
  record.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    open();
  });
  record.append(
    labeledValue("Game", String(game.idx_in_file + 1), "record-number"),
    players(game.white, game.black),
    labeledValue("Result", game.result || "*", "record-result"),
    metadataGrid(game),
  );
  if (game.warning) record.append(warningValue(game.warning));
  return record;
}

function warningValue(warning: string): HTMLElement {
  const element = document.createElement("p");
  element.className = "record-warning";
  element.textContent = `Warning: ${warning}`;
  return element;
}

function gameLabel(game: MobileGameRecord): string {
  const white = game.white || "Unknown White";
  const black = game.black || "Unknown Black";
  return `Game ${game.idx_in_file + 1}, ${white} versus ${black}`;
}

function players(white: string, black: string): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "players";
  const whiteName = document.createElement("strong");
  whiteName.textContent = white || "Unknown White";
  const separator = document.createElement("span");
  separator.textContent = "vs";
  const blackName = document.createElement("strong");
  blackName.textContent = black || "Unknown Black";
  wrapper.append(whiteName, separator, blackName);
  return wrapper;
}

function metadataGrid(game: MobileGameRecord): HTMLElement {
  const grid = document.createElement("dl");
  grid.className = "metadata-grid";
  for (const [label, value] of [
    ["Event", game.event],
    ["Site", game.site],
    ["Date", game.date],
    ["Round", game.round],
    ["ECO", game.eco],
    ["Opening", game.opening],
  ] as const) {
    grid.append(labeledValue(label, value || "-"));
  }
  return grid;
}

function labeledValue(label: string, value: string, className = ""): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = className;
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

function progressText(source: MobileSourceRecord | null): string {
  if (!source) return "Choose a local PGN source to begin.";
  if (source.scan_status === "error") return "Scan failed.";
  if (source.scan_status === "ready") return "Scan complete.";
  const progress = source.progress;
  if (!progress || progress.bytesTotal === 0) return "Scanning source...";
  const percent = Math.round((100 * progress.bytesDone) / progress.bytesTotal);
  return `Scanning source... ${percent}% (${progress.gamesFound} found)`;
}

function replacementText(replacement: NonNullable<MobileLibrary["replacement"]>): string {
  if (replacement.scan_status === "committing") return `Saving ${replacement.name} to the Mobile Library...`;
  const progress = replacement.progress;
  if (progress.bytesTotal === 0) return `Adding ${replacement.name}...`;
  const percent = Math.round((100 * progress.bytesDone) / progress.bytesTotal);
  return `Adding ${replacement.name}... ${percent}% (${progress.gamesFound} found)`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function openGame(gameId: number, bookmark?: StudyBookmark): void {
  if (activeReader && selectedGameId === gameId && studySourceId === library.activeSourceId) {
    setReaderMode(true);
    readerPanel.querySelector<HTMLButtonElement>(".reader-back")?.focus();
    return;
  }
  const saved = normalStudy.value;
  if (!bookmark && saved) {
    if (saved.sourceId === library.activeSourceId && saved.gameId === gameId) bookmark = saved;
    else if (!window.confirm("Replace your unfinished PGN study with this game? Imported PGNs and completed history are retained.")) return;
  }
  selectedGameId = gameId;
  studySourceId = library.activeSourceId;
  const generation = ++readerGeneration;
  activeReader?.cleanup();
  activeReader = null;
  returnStudy.hidden = true;
  setReaderMode(true);
  readerPanel.replaceChildren(
    loading("Opening Game record..."),
  );

  void loadGame(gameId, generation, bookmark);
}

async function loadGame(gameId: number, generation: number, bookmark?: StudyBookmark): Promise<void> {
  try {
    const document = await library.getGameDocument(gameId);
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(document.source))), (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (generation !== readerGeneration || selectedGameId !== gameId) return;
    let recovery = bookmark && !bookmark.position ? "Older bookmark restored at the start of the game; no exact move was stored." : "";
    if (bookmark?.digest && bookmark.digest !== digest) recovery = "The saved game content changed. Opened at its start instead.";
    const source = library.sources.find((candidate) => candidate.id === document.fileId)!;
    const reader = await renderMobileReader(readerPanel, document, {
      initialPosition: bookmark?.digest && bookmark.digest !== digest ? undefined : bookmark?.position,
      onRecovery: (message) => { recovery = message; },
      onPositionChange: (position) => {
        if (generation !== readerGeneration) return;
        normalStudy.save({ version: 1, sourceId: document.fileId, gameId: document.gameId, sourceName: source.name, sourceSize: source.size, digest, position });
        if (recovery) normalStudy.message = `${recovery} ${normalStudy.message}`;
        recovery = "";
        renderStudyNotice();
      },
      onBack: browseLibrary,
      onNavigate: (nextId) => {
        if (studySourceId === null) return;
        void library.selectSource(studySourceId).then(() => openGame(nextId));
      },
    });
    if (generation !== readerGeneration || selectedGameId !== gameId) {
      reader.cleanup();
      return;
    }
    activeReader = reader;
    renderStudyNotice();
    returnStudy.hidden = false;
    if (!readerPanel.hidden) readerPanel.querySelector<HTMLButtonElement>(".reader-back")?.focus();
    await library.rememberGame(document.fileId, document.gameId);
    if (generation !== readerGeneration || selectedGameId !== gameId) {
      reader.cleanup();
      return;
    }
  } catch (error) {
    if (generation !== readerGeneration || selectedGameId !== gameId) return;
    const message = error instanceof Error ? error.message : String(error);
    normalStudy.message = `Could not resume the saved game: ${message}. Your Library is still available; choose a game to recover.`;
    renderStudyNotice();
    readerPanel.replaceChildren(
      h("div", { class: "reader-error", role: "alert" }, `Could not open Game record: ${message}`),
      h(
        "button",
        { class: "reader-back", type: "button" },
        "Back to Library",
      ),
    );
    readerPanel.querySelector<HTMLButtonElement>(".reader-back")?.addEventListener("click", closeReader);
  }
}

function closeReader(): void {
  selectedGameId = null;
  studySourceId = null;
  returnStudy.hidden = true;
  readerGeneration += 1;
  activeReader?.cleanup();
  activeReader = null;
  renderStudyNotice();
  setReaderMode(false);
  renderGames();
}

function browseLibrary(): void {
  setReaderMode(false);
  renderGames();
  getElement<HTMLElement>("library-title").focus();
}

function resetListView(): void {
  query = "";
  offset = 0;
  searchInput.value = "";
  renderGames();
}

function continueSource(sourceId: number, gameId: number): void {
  resetListView();
  void library.selectSource(sourceId).then(() => {
    const source = library.sources.find((candidate) => candidate.id === sourceId);
    const bookmark = source?.resumeBookmark;
    if (library.activeSourceId !== sourceId || !bookmark || bookmark.gameId !== gameId) return;
    const exact = normalStudy.value;
    openGame(bookmark.gameId, exact?.sourceId === sourceId && exact.gameId === gameId ? exact : undefined);
  });
}

function showReaderError(message: string): void {
  readerPanel.querySelector(".replacement-error")?.remove();
  readerPanel.prepend(h("p", { class: "reader-error replacement-error", role: "alert" }, message));
}

function setReaderMode(readerOpen: boolean): void {
  libraryHeading.hidden = readerOpen;
  document.getElementById("app")?.classList.toggle("study-open", readerOpen);
  importPanel.hidden = readerOpen;
  sourcePanel.hidden = readerOpen;
  recordsPanel.hidden = readerOpen;
  readerPanel.hidden = !readerOpen;
  renderStudyNotice();
}

function loading(message: string): HTMLElement {
  return h("div", { class: "loading" }, message);
}

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, string> = {},
  ...children: Array<Node | string | null>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === "class") element.className = value;
    else element.setAttribute(name, value);
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    element.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return element;
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`mobile shell is missing #${id}`);
  return element as T;
}
