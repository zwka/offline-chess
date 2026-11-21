// Normal study only. Puzzle Solution Study must supply its own position/lifecycle
// to the Reader, never write this key. Content/history remain in the Library.
export const NORMAL_STUDY_KEY = "offline-chess.reader.normal-study.v1";
export type StudyPosition = {
  path: number[];
  fen: string;
  flipped: boolean;
};
export type StudyBookmark = {
  version: 1;
  sourceId: number;
  gameId: number;
  sourceName: string;
  sourceSize: number;
  digest?: string;
  position?: StudyPosition;
};

export class NormalStudyBookmark {
  value: StudyBookmark | null = null;
  message = "";
  // A persisted null means deliberately started fresh, not a legacy installation.
  legacy = false;

  constructor() {
    try {
      const raw = localStorage.getItem(NORMAL_STUDY_KEY);
      this.legacy = raw === null;
      if (raw === null || raw === "null") return;
      const value = JSON.parse(raw);
      if (!value || value.version !== 1 || !positive(value.sourceId) || !positive(value.gameId) ||
          typeof value.sourceName !== "string" || !Number.isSafeInteger(value.sourceSize) || value.sourceSize < 0 ||
          (value.digest !== undefined && typeof value.digest !== "string") ||
          (value.position !== undefined && (!Array.isArray(value.position.path) ||
            !value.position.path.every((n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0) ||
            typeof value.position.fen !== "string" || typeof value.position.flipped !== "boolean"))) {
        throw new Error("invalid bookmark");
      }
      this.value = value;
    } catch {
      this.message = "Saved study could not be read. Your Library is still available; choose a game to recover.";
    }
  }

  // Synchronous on every selection/flip: safe before any Suite navigation (#13),
  // with no dependency on unload, timers, or a Library snapshot write.
  save(value: StudyBookmark | null): boolean {
    this.legacy = false;
    try {
      localStorage.setItem(NORMAL_STUDY_KEY, JSON.stringify(value));
      this.value = value;
      this.message = value ? "Study saved on this device." : "Started fresh. Imported PGNs and completed history are unchanged.";
      return true;
    } catch {
      if (value) this.value = value;
      this.message = "Study changes are only available in this page. Could not save on this device; reopening may restore an older study.";
      return false;
    }
  }
}

function positive(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) > 0;
}
