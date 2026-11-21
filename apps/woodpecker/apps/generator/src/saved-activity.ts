import { useEffect, useRef, useState } from "react";
import { computePuzzleSetHash, parsePuzzleSet, type PuzzleSet } from "@offline-woodpecker/domain";

// One atomic localStorage replacement: a failed/quota-limited write retains the
// previous complete record. Never store the source index here.
export const GENERATOR_ACTIVITY_KEY = "offline-chess.generator.activity.v1";
export type GeneratorActivity = {
  setName: string;
  ratingMin: number;
  ratingMax: number;
  count: number;
  themeMatch: "all" | "any";
  selectedThemes: string[];
  seed: string;
  generatedSet: PuzzleSet | null;
  matches: number;
};

export const freshGeneratorActivity = (): GeneratorActivity => ({
  setName: "Focused tactics", ratingMin: 1100, ratingMax: 1600, count: 12,
  themeMatch: "all", selectedThemes: ["short"], seed: "woodpecker-2026",
  generatedSet: null, matches: 0,
});

function parseActivity(value: unknown): GeneratorActivity {
  if (!value || typeof value !== "object") throw new Error("Invalid activity");
  const record = value as Record<string, unknown>;
  if (record.kind !== "generator-activity" || record.schemaVersion !== 1) throw new Error("Unsupported activity");
  const a = record.activity as GeneratorActivity;
  if (!a || typeof a.setName !== "string" || typeof a.seed !== "string" ||
      ![a.ratingMin, a.ratingMax, a.count].every(n => typeof n === "number" && Number.isFinite(n)) ||
      !Number.isSafeInteger(a.matches) || a.matches < 0 ||
      !["all", "any"].includes(a.themeMatch) || !Array.isArray(a.selectedThemes) ||
      !a.selectedThemes.every(t => typeof t === "string" && t.length > 0)) throw new Error("Invalid filters");
  const generatedSet = a.generatedSet === null ? null : parsePuzzleSet(a.generatedSet);
  if (generatedSet && a.matches < generatedSet.puzzles.length) throw new Error("Invalid output");
  return { setName: a.setName, ratingMin: a.ratingMin, ratingMax: a.ratingMax, count: a.count,
    themeMatch: a.themeMatch, selectedThemes: a.selectedThemes, seed: a.seed, generatedSet, matches: a.matches };
}

const saveFailure = "Generator activity could not be saved on this device. Keep this page open or export your Puzzle Set before leaving. Previously saved activity may be older.";

export function useSavedGeneratorActivity() {
  const [activity, setActivity] = useState(freshGeneratorActivity);
  const [entry, setEntry] = useState<"checking" | "choice" | "active">("checking");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const saved = useRef<GeneratorActivity | null>(null);
  const hasSavedActivity = useRef(false);
  const lastSaved = useRef(JSON.stringify(activity));

  useEffect(() => {
    let cancelled = false;
    async function read() {
      try {
        const raw = localStorage.getItem(GENERATOR_ACTIVITY_KEY);
        if (raw === null) { if (!cancelled) setEntry("active"); return; }
        let restored: GeneratorActivity;
        try {
          restored = parseActivity(JSON.parse(raw));
          if (restored.generatedSet && await computePuzzleSetHash(restored.generatedSet) !== restored.generatedSet.contentHash) throw new Error("Invalid content hash");
        } catch {
          if (!cancelled) {
            setMessage("Saved Generator activity is invalid or from an unsupported version and cannot be resumed. Start with new filters; Trainer content and history are unchanged.");
            setEntry("active");
          }
          return;
        }
        if (!cancelled) {
          saved.current = restored;
          setMessage("");
          setFailed(false);
          setEntry("choice");
        }
      } catch {
        if (!cancelled) { setMessage(saveFailure); setFailed(true); setEntry("active"); }
      }
    }
    void read();
    const reenter = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setEntry("checking");
      void read();
    };
    window.addEventListener("pageshow", reenter);
    return () => { cancelled = true; window.removeEventListener("pageshow", reenter); };
  }, []);

  function persist(next = activity, force = false): boolean {
    if (entry !== "active") return true; // Never replace a pending entry choice.
    const serialized = JSON.stringify(next);
    if (!hasSavedActivity.current && serialized === lastSaved.current && !failed) return true;
    if (!force && serialized === lastSaved.current) return !failed;
    try {
      localStorage.setItem(GENERATOR_ACTIVITY_KEY, JSON.stringify({ kind: "generator-activity", schemaVersion: 1, activity: next }));
      lastSaved.current = serialized;
      hasSavedActivity.current = true;
      setMessage("Generator filters and completed output saved on this device.");
      setFailed(false);
      return true;
    } catch {
      setMessage(saveFailure);
      setFailed(true);
      return false;
    }
  }

  useEffect(() => { persist(); }, [activity, entry]);

  // Shared navigation can synchronously flush, then ask whether to leave if
  // dispatchEvent returns false. This also catches failures after an earlier save.
  useEffect(() => {
    const beforeNavigate = (event: Event) => {
      if (entry === "active" && !persist(activity, true)) event.preventDefault();
    };
    window.addEventListener("offline-chess:before-navigate", beforeNavigate);
    return () => window.removeEventListener("offline-chess:before-navigate", beforeNavigate);
  });

  function resume() {
    if (!saved.current) return;
    lastSaved.current = JSON.stringify(saved.current);
    hasSavedActivity.current = true;
    setActivity(saved.current);
    setFailed(false);
    setMessage("Saved Generator filters and completed output restored.");
    setEntry("active");
  }

  function startFresh() {
    if (!window.confirm("Replace your saved Generator filters and generated output? Imported Trainer Puzzle Sets and completed history will not be deleted.")) return;
    const next = freshGeneratorActivity();
    try {
      localStorage.removeItem(GENERATOR_ACTIVITY_KEY);
    } catch {
      setMessage("Saved Generator activity could not be replaced. Your previous filters and output are retained. Try Resume or retry Start fresh.");
      setFailed(true);
      return;
    }
    saved.current = null;
    hasSavedActivity.current = false;
    lastSaved.current = JSON.stringify(next);
    setActivity(next);
    setMessage("");
    setFailed(false);
    setEntry("active");
  }

  return { activity, setActivity, entry, message, failed, resume, startFresh, persist,
    savedSummary: saved.current ? `${saved.current.setName || "Unnamed Puzzle Set"} — ${saved.current.generatedSet ? `${saved.current.generatedSet.puzzles.length} generated puzzles` : "filters only"}` : "" };
}
