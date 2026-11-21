import { hydrateGame } from "../hydration.js";
import { renderMobileReader } from "./reader.js";
import type { StudyPosition } from "./study-bookmark.js";

const KEY = "offline-chess.reader.solution-study.v1";
type Context = { version: 1; runId: string; setId: string; puzzleId: string; index: number; pgn: string; line: string; position?: StudyPosition };
type OriginRun = { setId: string; status: string; currentPuzzleIndex: number | null; currentPuzzle?: { kind: string }; results: Array<{ puzzleId: string; status: string; completion?: string }> };
type OriginSet = { set: { puzzles: Array<{ id: string; fen: string; moves: string[] }> } };

export function solutionStudyLink(): HTMLAnchorElement | null {
  try {
    if (!localStorage.getItem(KEY)) return null;
    const link = document.createElement("a");
    link.href = "/pgn-reader/?solution=1";
    link.textContent = "Resume Puzzle Solution Study";
    return link;
  } catch { return null; }
}

/** Read-only boundary: Reader must never create, score, resume, or checkpoint a Run. */
async function verifyOrigin(context: Context): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("offline-woodpecker-trainer", 1);
    request.onupgradeneeded = () => { request.transaction?.abort(); };
    request.onerror = () => reject(new Error("The originating Trainer storage is missing or unavailable."));
    request.onsuccess = () => resolve(request.result);
  });
  try {
    const tx = db.transaction(["runs", "puzzle-sets"], "readonly");
    const read = <T>(store: string, id: string): Promise<T | undefined> => new Promise((resolve, reject) => {
      const request = tx.objectStore(store).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [run, record] = await Promise.all([read<OriginRun>("runs", context.runId), read<OriginSet>("puzzle-sets", context.setId)]);
    const puzzle = record?.set?.puzzles?.[context.index];
    const result = run?.results?.[context.index];
    if (!run || run.setId !== context.setId || !puzzle || puzzle.id !== context.puzzleId || result?.puzzleId !== puzzle.id || JSON.stringify([puzzle.fen, puzzle.moves]) !== context.line) {
      throw new Error("The originating Run or Puzzle is missing, deleted, or changed.");
    }
    if (!(result.status === "first-try-solved" || (result.status === "failed" && result.completion === "completed") ||
      (run.status === "active" && run.currentPuzzleIndex === context.index && run.currentPuzzle?.kind === "solution-revealed"))) {
      throw new Error("Solve the Puzzle or explicitly reveal its solution in Trainer before studying it.");
    }
  } finally { db.close(); }
}

export async function openSolutionStudy(): Promise<void> {
  const app = document.getElementById("app")!;
  app.classList.add("solution-open", "study-open");
  const panel = document.createElement("section");
  panel.className = "solution-study-panel";
  const controls = document.createElement("section");
  controls.className = "meta-panel solution-study-controls";
  const label = document.createElement("h1");
  label.textContent = "Puzzle Solution Study";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent = "Supplied recorded line only — not engine analysis. Your ordinary PGN study and Library are separate. Trainer timing is paused.";
  const normal = document.createElement("a");
  normal.href = "/pgn-reader/";
  normal.textContent = "Ordinary PGN study / Library";
  controls.append(label, status, normal);
  app.append(controls, panel);
  let context: Context;
  try {
    context = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (!context || context.version !== 1 || typeof context.runId !== "string" || typeof context.setId !== "string" || typeof context.puzzleId !== "string" || !Number.isInteger(context.index) || context.index < 0 || typeof context.pgn !== "string" || typeof context.line !== "string") throw new Error("No valid saved Puzzle Solution Study is available.");
    await verifyOrigin(context);
    const payload = hydrateGame(new TextEncoder().encode(context.pgn));
    if (payload.warnings.length) throw new Error("The supplied solution could not be read safely.");
    const back = document.createElement("a");
    back.href = `/woodpecker-trainer/?solutionRun=${encodeURIComponent(context.runId)}&puzzle=${encodeURIComponent(context.puzzleId)}`;
    back.textContent = "Return to Trainer";
    controls.append(" · ", back);
    const reader = await renderMobileReader(panel, { ...payload, gameId: 0, fileId: 0, fileName: "Puzzle solution", idxInFile: 0, neighbors: { prev: null, next: null } }, {
      initialPosition: context.position ?? { path: [], fen: payload.nodes[payload.rootId].fen, flipped: payload.nodes[payload.rootId].fen.split(" ")[1] === "b" },
      onBack: () => location.assign("/pgn-reader/"),
      onNavigate: () => {},
      onRecovery: (message) => { status.textContent = message; },
      onPositionChange: (position) => {
        context.position = position;
        try { localStorage.setItem(KEY, JSON.stringify(context)); }
        catch { status.textContent = "This solution move is page-only: it could not be saved. Your ordinary PGN study and Run are unchanged."; }
      },
    });
    panel.querySelector(".kicker")!.textContent = `Puzzle ${context.index + 1} · ${context.puzzleId} · supplied line`;
    panel.querySelector(".reader-title")!.textContent = "Recorded solution";
    back.focus();
    window.addEventListener("beforeunload", () => reader.cleanup(), { once: true });
  } catch (error) {
    panel.replaceChildren();
    status.setAttribute("role", "alert");
    status.textContent = `${error instanceof Error ? error.message : "Solution storage is unavailable."} Your ordinary PGN Library remains available. No Run was created or changed.`;
    const trainer = document.createElement("a");
    trainer.href = "/woodpecker-trainer/";
    trainer.textContent = "Trainer Library";
    controls.append(" · ", trainer);
    normal.focus();
  }
}
