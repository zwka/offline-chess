import type { GameDocument, TagPair } from "../wire.js";
import { createBoard, renderBoard } from "./reader-board.js";
import { buildNotation, revealToken, type MobileNotation } from "./reader-notation.js";
import type { StudyPosition } from "./study-bookmark.js";

export type MobileReaderOptions = {
  onBack: () => void;
  onNavigate: (gameId: number) => void;
  initialPosition?: StudyPosition;
  onPositionChange?: (position: StudyPosition) => void;
  onRecovery?: (message: string) => void;
};

export type MobileReaderHandle = {
  cleanup: () => void;
};

export async function renderMobileReader(
  panel: HTMLElement,
  doc: GameDocument,
  options: MobileReaderOptions,
): Promise<MobileReaderHandle> {
  const boardHost = h("div", {
    class: "board-host",
    role: "region",
    tabindex: "-1",
    "aria-label": "Chess board",
  });
  const board = createBoard(boardHost);
  const caption = h("p", { class: "move-caption", "aria-live": "polite" });
  const notationPane = h(
    "div",
    { class: "notation mobile-notation" },
    h("div", { class: "loading" }, "Rendering notation..."),
  );
  const source = h("pre", { class: "raw-source", hidden: true });
  const title = gameTitle(doc.headers);
  let notation: MobileNotation | null = null;
  let currentId = doc.rootId;
  if (options.initialPosition) {
    let node = doc.nodes[doc.rootId];
    let found = true;
    for (const index of options.initialPosition.path) {
      const next = doc.nodes[node.children[index]];
      if (!next) { found = false; break; }
      node = next;
    }
    if (found && node.fen === options.initialPosition.fen) currentId = node.id;
    else options.onRecovery?.("The saved move or variation is missing. Opened this game at its start instead.");
    board.flipped = options.initialPosition.flipped;
  }
  const previousGame = navigationButton(
    "Previous game",
    "previous-game",
    doc.neighbors.prev,
    () => doc.neighbors.prev != null && options.onNavigate(doc.neighbors.prev),
  );
  const nextGame = navigationButton(
    "Next game",
    "next-game",
    doc.neighbors.next,
    () => doc.neighbors.next != null && options.onNavigate(doc.neighbors.next),
  );

  const rawButton = h(
    "button",
    {
      class: "reader-secondary-button",
      type: "button",
      "aria-expanded": "false",
    },
    "Raw PGN source",
  );
  rawButton.addEventListener("click", () => {
    source.hidden = !source.hidden;
    rawButton.setAttribute("aria-expanded", String(!source.hidden));
  });
  source.textContent = doc.source;

  const boardControls = h(
    "div",
    { class: "board-controls", "aria-label": "Reader controls" },
    controlButton("Start", "start", () => selectNode(doc.rootId, true)),
    controlButton("Back", "back", stepBack),
    controlButton("Forward", "forward", stepForward),
    controlButton("End", "end", toLineEnd),
    controlButton("Flip", "flip", flip),
    controlButton("Prev variation", "prev-variation", () => cycleSibling(-1)),
    controlButton("Next variation", "next-variation", () => cycleSibling(1)),
  );

  const header = h(
    "div",
    { class: "reader-header" },
    h(
      "button",
      { class: "reader-back", type: "button" },
      "Back to Library",
    ),
    h(
      "div",
      { class: "reader-heading" },
      h("p", { class: "kicker" }, "PGN Reader · Study"),
      h("h1", { class: "reader-title" }, title),
      h(
        "div",
        { class: "reader-summary" },
        h("span", { class: "reader-result" }, doc.result || "*"),
        h("span", {}, `Game ${doc.idxInFile + 1}`),
        doc.warnings.length > 0
          ? h("span", { class: "reader-warning-mark", title: doc.warnings.join("\n") }, "Warning")
          : null,
      ),
    ),
    h("div", { class: "game-nav" }, previousGame, nextGame),
  );
  header.querySelector<HTMLButtonElement>(".reader-back")?.addEventListener("click", options.onBack);

  const metadata = h(
    "details",
    { class: "meta-panel" },
    h("summary", {}, "Game tags"),
    metadataTable(doc.headers),
  );
  const warningPanel = doc.warnings.length > 0
    ? h(
        "section",
        { class: "reader-warning warn-panel", "aria-label": "Parser warnings" },
        h("strong", {}, "Parser warnings"),
        h("ul", {}, ...doc.warnings.map((warning) => h("li", {}, warning))),
      )
    : null;

  panel.replaceChildren(
    header,
    h(
      "div",
      { class: "mobile-reader-layout" },
      h(
        "section",
        { class: "board-column" },
        h("div", { class: "board-wrap" }, boardHost, boardControls, caption),
      ),
      h(
        "section",
        { class: "notation-column", "aria-label": "Game notation" },
        notationPane,
      ),
      h(
        "section",
        { class: "study-details", "aria-label": "Game details" },
        metadata,
        warningPanel,
        h("div", { class: "pgn-drawer raw-source-drawer" }, rawButton, source),
        h(
          "p",
          { class: "piece-credit" },
          "Chess pieces by ",
          h("a", { href: "https://commons.wikimedia.org/wiki/Category:SVG_chess_pieces/Standard_transparent" }, "Cburnett, Wikimedia Commons"),
          " · ",
          h("a", { href: "https://creativecommons.org/licenses/by-sa/3.0/" }, "CC BY-SA 3.0"),
        ),
      ),
    ),
  );

  notation = await buildNotation(doc, selectNode);
  notationPane.replaceChildren(notation.rootEl);
  selectNode(currentId);

  const onKey = (event: KeyboardEvent): void => {
    if (panel.hidden) return;
    const target = event.target as HTMLElement | null;
    if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "BUTTON") return;
    const actions: Record<string, () => void> = {
      ArrowRight: stepForward,
      ArrowLeft: stepBack,
      ArrowDown: () => cycleSibling(1),
      ArrowUp: () => cycleSibling(-1),
      Home: () => selectNode(doc.rootId, true),
      End: toLineEnd,
      f: flip,
      p: () => rawButton.click(),
      "]": () => doc.neighbors.next != null && options.onNavigate(doc.neighbors.next),
      "[": () => doc.neighbors.prev != null && options.onNavigate(doc.neighbors.prev),
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  };
  document.addEventListener("keydown", onKey);

  return {
    cleanup: () => document.removeEventListener("keydown", onKey),
  };

  function selectNode(id: number, focusBoard = false): void {
    const node = doc.nodes[id];
    if (!node) return;
    const previous = notation?.nodeEls.get(currentId);
    previous?.classList.remove("current");
    previous?.removeAttribute("aria-current");
    currentId = id;
    renderBoard(board, node.fen, node.uci, node);
    const token = notation?.nodeEls.get(id);
    if (token) {
      token.classList.add("current");
      token.setAttribute("aria-current", "step");
      revealToken(token);
      if (!focusBoard) token.scrollIntoView({ block: "nearest", behavior: "auto" });
    }
    if (focusBoard) boardHost.focus();
    caption.textContent = node.san
      ? `${node.color === "w" ? `${node.moveNumber}.` : `${node.moveNumber}…`} ${node.san}${node.glyphs.join("")} - ply ${node.ply}`
      : "start position";
    savePosition();
  }

  function savePosition(): void {
    const path: number[] = [];
    let node = doc.nodes[currentId];
    while (node.parentId !== null) {
      const parent = doc.nodes[node.parentId];
      path.unshift(parent.children.indexOf(node.id));
      node = parent;
    }
    options.onPositionChange?.({ path, fen: doc.nodes[currentId].fen, flipped: board.flipped });
  }

  function stepForward(): void {
    const node = doc.nodes[currentId];
    if (node.children.length > 0) selectNode(node.children[0], true);
  }

  function stepBack(): void {
    const node = doc.nodes[currentId];
    if (node.parentId != null) selectNode(node.parentId, true);
  }

  function toLineEnd(): void {
    let node = doc.nodes[currentId];
    while (node.children.length > 0) node = doc.nodes[node.children[0]];
    selectNode(node.id, true);
  }

  function cycleSibling(direction: number): void {
    const node = doc.nodes[currentId];
    if (node.parentId == null) return;
    const siblings = doc.nodes[node.parentId].children;
    if (siblings.length < 2) return;
    const index = siblings.indexOf(node.id);
    selectNode(siblings[(index + direction + siblings.length) % siblings.length], true);
  }

  function flip(): void {
    board.flipped = !board.flipped;
    const node = doc.nodes[currentId];
    renderBoard(board, node.fen, node.uci, node);
    savePosition();
  }
}

function navigationButton(
  label: string,
  action: string,
  gameId: number | null,
  onClick: () => void,
): HTMLButtonElement {
  const button = h(
    "button",
    {
      class: "game-nav-button",
      type: "button",
      "data-action": action,
      "aria-label": label,
      disabled: gameId == null,
    },
    label,
  );
  button.addEventListener("click", onClick);
  return button;
}

function controlButton(label: string, action: string, onClick: () => void): HTMLButtonElement {
  const symbols: Record<string, string> = {
    Start: "|<",
    Back: "<",
    Forward: ">",
    End: ">|",
    Flip: "Flip",
    "Prev variation": "V<",
    "Next variation": "V>",
  };
  const button = h(
    "button",
    {
      class: "reader-control",
      type: "button",
      "data-action": action,
      "aria-label": label,
      title: label,
    },
    symbols[label] ?? label,
  );
  button.addEventListener("click", onClick);
  return button;
}

function metadataTable(headers: TagPair[]): HTMLTableElement {
  const table = h("table", { class: "meta-table" });
  const body = document.createElement("tbody");
  for (const [name, value] of headers) {
    const row = document.createElement("tr");
    const key = document.createElement("td");
    key.textContent = name;
    const content = document.createElement("td");
    content.textContent = value;
    row.append(key, content);
    body.appendChild(row);
  }
  table.appendChild(body);
  return table;
}

function gameTitle(headers: TagPair[]): string {
  const white = lastTagValue(headers, "White");
  const black = lastTagValue(headers, "Black");
  return [white, black].filter((value) => value && value !== "?").join(" - ") || "Untitled game";
}

function lastTagValue(headers: TagPair[], name: string): string {
  let value = "";
  for (const [key, candidate] of headers) {
    if (key === name) value = candidate;
  }
  return value;
}

type AttributeValue = string | boolean | ((event: Event) => void) | null;

function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Record<string, AttributeValue> = {},
  ...children: Array<Node | string | null>
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value == null) continue;
    if (name === "class") {
      element.className = String(value);
    } else if (name === "hidden") {
      element.hidden = Boolean(value);
    } else if (name === "disabled" && "disabled" in element) {
      (element as HTMLButtonElement).disabled = Boolean(value);
    } else if (name.startsWith("on") && typeof value === "function") {
      element.addEventListener(name.slice(2), value);
    } else {
      element.setAttribute(name, String(value));
    }
  }
  for (const child of children.flat()) {
    if (child == null) continue;
    element.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return element;
}
