/** Versioned Suite connection; no Tool framework or write access to Trainer data. */
export const SOLUTION_STUDY_KEY = "offline-chess.reader.solution-study.v1";
export const TRAINER_STORAGE = Object.freeze({ name: "offline-woodpecker-trainer", version: 1, runs: "runs", sets: "puzzle-sets" });

const nonempty = value => typeof value === "string" && value.length > 0;
const indexNumber = value => Number.isSafeInteger(value) && value >= 0;

export function decodeSolutionStudy(raw) {
  try {
    const context = JSON.parse(raw ?? "null");
    const position = context?.position;
    if (!context || context.version !== 1 || ![context.runId, context.setId, context.puzzleId, context.pgn, context.line].every(nonempty) || !indexNumber(context.index) ||
      (position !== undefined && (!position || !Array.isArray(position.path) || !position.path.every(indexNumber) || !nonempty(position.fen) || typeof position.flipped !== "boolean"))) throw new Error();
    return context;
  } catch { throw new Error("No valid saved Puzzle Solution Study is available."); }
}

export function encodeSolutionStudy(context) {
  const raw = JSON.stringify(context);
  decodeSolutionStudy(raw);
  return raw;
}

export function createSolutionStudy(origin) {
  return decodeSolutionStudy(JSON.stringify({ ...origin, version: 1 }));
}

export function solutionLineIdentity(puzzle) {
  return JSON.stringify([puzzle.fen, puzzle.moves]);
}

/** Retry re-locks the current unfinished Puzzle; historical revelation survives Next. */
export function canStudySolution(run, index) {
  if (!indexNumber(index)) return false;
  const result = run?.results?.[index];
  if (result?.status === "first-try-solved" || (result?.status === "failed" && result.completion === "completed")) return true;
  const current = run?.status === "active" && run.currentPuzzleIndex === index;
  return result?.status === "failed" && (current
    ? run.currentPuzzle?.kind === "solution-revealed"
    : result.solutionRevealed === true);
}

/** Independent readonly verification on Reader entry, never a Trainer load/resume. */
export async function verifySolutionStudyOrigin(context) {
  const storage = TRAINER_STORAGE;
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open(storage.name, storage.version);
    request.onupgradeneeded = () => { request.transaction?.abort(); };
    request.onerror = () => reject(new Error("The originating Trainer storage is missing or unavailable."));
    request.onsuccess = () => resolve(request.result);
  });
  try {
    const tx = db.transaction([storage.runs, storage.sets], "readonly");
    const read = (store, id) => new Promise((resolve, reject) => {
      const request = tx.objectStore(store).get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [run, record] = await Promise.all([read(storage.runs, context.runId), read(storage.sets, context.setId)]);
    const puzzle = record?.set?.puzzles?.[context.index];
    const result = run?.results?.[context.index];
    if (!run || run.kind !== "run" || ![1, 2].includes(run.schemaVersion) || run.id !== context.runId || run.setId !== context.setId ||
      record?.set?.id !== context.setId || !puzzle || puzzle.id !== context.puzzleId || result?.puzzleId !== puzzle.id || solutionLineIdentity(puzzle) !== context.line) {
      throw new Error("The originating Run or Puzzle is missing, deleted, or changed.");
    }
    if (!canStudySolution(run, context.index)) throw new Error("Solve the Puzzle or explicitly reveal its solution in Trainer before studying it.");
  } finally { db.close(); }
}
