import { hydrateGame } from "../hydration.js";
import { renderMobileReader } from "./reader.js";
import { SOLUTION_STUDY_KEY as KEY, decodeSolutionStudy, encodeSolutionStudy, verifySolutionStudyOrigin, type SolutionStudyContext } from "../../../../shared/solution-study.js";

export function solutionStudyLink(): HTMLAnchorElement | null {
  try {
    if (!localStorage.getItem(KEY)) return null;
    const link = document.createElement("a");
    link.href = "/pgn-reader/?solution=1";
    link.textContent = "Resume Puzzle Solution Study";
    return link;
  } catch { return null; }
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
  normal.setAttribute("data-suite-navigation", "");
  normal.textContent = "Ordinary PGN study / Library";
  controls.append(label, status, normal);
  app.append(controls, panel);
  let context: SolutionStudyContext;
  try {
    context = decodeSolutionStudy(localStorage.getItem(KEY));
    await verifySolutionStudyOrigin(context);
    const payload = hydrateGame(new TextEncoder().encode(context.pgn));
    if (payload.warnings.length) throw new Error("The supplied solution could not be read safely.");
    const back = document.createElement("a");
    back.href = `/woodpecker-trainer/?solutionRun=${encodeURIComponent(context.runId)}&puzzle=${encodeURIComponent(context.puzzleId)}`;
    back.setAttribute("data-suite-navigation", "");
    back.textContent = "Return to Trainer";
    controls.append(" · ", back);
    const reader = await renderMobileReader(panel, { ...payload, gameId: 0, fileId: 0, fileName: "Puzzle solution", idxInFile: 0, neighbors: { prev: null, next: null } }, {
      initialPosition: context.position ?? { path: [], fen: payload.nodes[payload.rootId].fen, flipped: payload.nodes[payload.rootId].fen.split(" ")[1] === "b" },
      onBack: () => {
        if (window.dispatchEvent(new Event("offline-chess:before-navigate", { cancelable: true }))) location.assign("/pgn-reader/");
      },
      onNavigate: () => {},
      onRecovery: (message) => { status.textContent = message; },
      onPositionChange: (position) => {
        context.position = position;
        try { localStorage.setItem(KEY, encodeSolutionStudy(context)); }
        catch { status.textContent = "This solution move is page-only: it could not be saved. Your ordinary PGN study and Run are unchanged."; }
      },
    });
    panel.querySelector(".kicker")!.textContent = `Puzzle ${context.index + 1} · ${context.puzzleId} · supplied line`;
    panel.querySelector(".reader-title")!.textContent = "Recorded solution";
    // Separate from normal Study: retry only this solution's current position.
    window.addEventListener("offline-chess:before-navigate", (event) => {
      try {
        localStorage.setItem(KEY, encodeSolutionStudy(context));
        status.textContent = "Solution position saved on this device. Your ordinary PGN study and Run are unchanged. Trainer timing is paused.";
      } catch {
        event.preventDefault();
        status.textContent = "This solution move is page-only: it could not be saved. Your ordinary PGN study and Run are unchanged. Stay here and retry navigation when storage is available.";
      }
    });
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
