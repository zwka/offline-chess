import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  Filter,
  Moon,
  Play,
  RefreshCw,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";
import {
  createPuzzleSet,
  DARK_THEME_COLOR,
  enqueuePuzzleSetHandoff,
  LIGHT_THEME_COLOR,
  parsePuzzleJsonl,
  persistSuiteTheme,
  readSuiteTheme,
  selectPuzzlesFromStream,
  type PuzzleIndexManifest,
  type PuzzleSet,
  type PuzzleSetSelection,
  type ThemeChoice,
} from "@offline-woodpecker/domain";
import { loadPuzzleIndex } from "./load-puzzle-index";

const FALLBACK_THEMES = ["advantage", "crushing", "endgame", "fork", "mate", "middlegame", "short"];
const TRAINER_URL = import.meta.env.VITE_TRAINER_URL ?? "/woodpecker-trainer/";

function useTheme() {
  const [theme, setTheme] = useState<ThemeChoice>(readSuiteTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    }
  }, [theme]);

  useEffect(() => {
    const sync = () => setTheme(readSuiteTheme());
    window.addEventListener("pageshow", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggleTheme() {
    const next: ThemeChoice = theme === "dark" ? "light" : "dark";
    setTheme(next);
    persistSuiteTheme(next);
  }

  return { theme, toggleTheme };
}

function formatTheme(theme: string): string {
  return theme
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function downloadPuzzleSet(set: PuzzleSet) {
  const body = JSON.stringify(set, null, 2);
  const blob = new Blob([body], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${set.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "puzzle-set"}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ThemeControl({ theme, onToggle }: { theme: ThemeChoice; onToggle: () => void }) {
  const nextLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={onToggle}
      title={nextLabel}
      aria-label={nextLabel}
      aria-pressed={theme === "dark"}
    >
      {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
    </button>
  );
}

function App() {
  const theme = useTheme();
  const [manifest, setManifest] = useState<PuzzleIndexManifest | null>(null);
  const [indexPath, setIndexPath] = useState(`${import.meta.env.BASE_URL}puzzle-index.jsonl`);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [setName, setSetName] = useState("Focused tactics");
  const [ratingMin, setRatingMin] = useState(1100);
  const [ratingMax, setRatingMax] = useState(1600);
  const [count, setCount] = useState(12);
  const [themeMatch, setThemeMatch] = useState<"all" | "any">("all");
  const [selectedThemes, setSelectedThemes] = useState<string[]>(["short"]);
  const [seed, setSeed] = useState("woodpecker-2026");
  const [generatedSet, setGeneratedSet] = useState<PuzzleSet | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ scanned: 0, matches: 0 });
  const [notice, setNotice] = useState<{ kind: "info" | "error" | "success"; text: string }>({
    kind: "info",
    text: "The sample index is ready. A release build can replace it with the full local index.",
  });

  useEffect(() => {
    let cancelled = false;
    loadPuzzleIndex()
      .then(({ manifest: nextManifest, index }) => {
        if (cancelled) return;
        setManifest(nextManifest);
        setIndexPath(index);
        setRatingMin(Math.max(nextManifest.ratingMin, 1100));
        setRatingMax(Math.min(nextManifest.ratingMax, 1600));
        setManifestError(null);
      })
      .catch((error: unknown) => {
        if (!cancelled) setManifestError(error instanceof Error ? error.message : "The local puzzle index is unavailable.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableThemes = useMemo(() => manifest?.themes ?? FALLBACK_THEMES, [manifest]);
  const ratingLabel = `${ratingMin.toLocaleString()} - ${ratingMax.toLocaleString()}`;

  function toggleTheme(themeName: string) {
    setSelectedThemes((current) => current.includes(themeName)
      ? current.filter((theme) => theme !== themeName)
      : [...current, themeName]);
  }

  function randomizeSeed() {
    setSeed(globalThis.crypto.randomUUID().slice(0, 12));
  }

  function resolveNamedGeneratedSet(): PuzzleSet | null {
    if (!generatedSet) return null;
    const trimmedName = setName.trim();
    if (trimmedName.length === 0) {
      setNotice({ kind: "error", text: "Give the Puzzle Set a name before exporting." });
      return null;
    }
    if (trimmedName === generatedSet.name) {
      return generatedSet;
    }
    const updatedSet = { ...generatedSet, name: trimmedName };
    setGeneratedSet(updatedSet);
    return updatedSet;
  }

  function handleExportJson() {
    const namedSet = resolveNamedGeneratedSet();
    if (!namedSet) return;
    downloadPuzzleSet(namedSet);
  }

  async function handleDoPuzzles() {
    const namedSet = resolveNamedGeneratedSet();
    if (!namedSet) return;
    try {
      await enqueuePuzzleSetHandoff(namedSet);
      window.location.assign(TRAINER_URL);
    } catch {
      setNotice({ kind: "error", text: "Could not hand off the Puzzle Set to Trainer." });
    }
  }

  async function generate() {
    if (!manifest) {
      setNotice({ kind: "error", text: "The local puzzle index has not loaded yet." });
      return;
    }
    if (ratingMin > ratingMax) {
      setNotice({ kind: "error", text: "The minimum rating must be at or below the maximum rating." });
      return;
    }
    if (count < 1) {
      setNotice({ kind: "error", text: "Choose at least one puzzle." });
      return;
    }
    if (setName.trim().length === 0) {
      setNotice({ kind: "error", text: "Give the Puzzle Set a name before exporting." });
      return;
    }

    const selection: PuzzleSetSelection = {
      ratingMin,
      ratingMax,
      themes: selectedThemes,
      themeMatch,
      count,
      seed: seed.trim() || "woodpecker",
    };

    setIsGenerating(true);
    setGeneratedSet(null);
    setProgress({ scanned: 0, matches: 0 });
    setNotice({ kind: "info", text: "Scanning the local puzzle index..." });

    try {
      const response = await fetch(indexPath);
      if (!response.ok) throw new Error("The local puzzle index could not be opened");
      const result = await selectPuzzlesFromStream(parsePuzzleJsonl(response, indexPath.endsWith(".gz")), selection, setProgress);
      if (result.kind === "insufficient") {
        setNotice({
          kind: "error",
          text: `Only ${result.matches} puzzles match these filters; ${result.requested} are required.`,
        });
        return;
      }

      const nextSet = await createPuzzleSet({
        name: setName,
        source: manifest.source,
        selection,
        puzzles: result.puzzles,
      });
      setGeneratedSet(nextSet);
      setNotice({ kind: "success", text: `${nextSet.puzzles.length} puzzles selected from ${result.matches} matches.` });
    } catch {
      setNotice({ kind: "error", text: "The local index contains an invalid record or could not be read." });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="app-shell generator-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">W</div>
          <div>
            <div className="brand-name">Woodpecker</div>
            <div className="brand-section">Generator</div>
          </div>
        </div>
        <div className="topbar-actions">
          <a className="quiet-link" href={TRAINER_URL}>Trainer →</a>
          <ThemeControl theme={theme.theme} onToggle={theme.toggleTheme} />
        </div>
      </header>

      <main className="generator-main">
        <section className="page-intro">
          <div>
            <p className="eyebrow">Offline set builder</p>
            <h1>Shape the work before you sit down to solve.</h1>
            <p className="intro-copy">Select a narrow training slice from the local Lichess index, keep its order reproducible, and carry the finished set into Trainer.</p>
          </div>
          <div className="source-badge">
            <span className="status-dot" />
            <span>{manifest ? `${manifest.recordCount.toLocaleString()} local records` : "Loading local index"}</span>
          </div>
        </section>

        <div className="generator-grid">
          <section className="panel filter-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">01 / Selection</p>
                <h2>Build your set</h2>
              </div>
              <Filter size={20} className="heading-icon" />
            </div>

            <label className="field-label" htmlFor="set-name">Set name</label>
            <input id="set-name" className="text-input" value={setName} onChange={(event) => setSetName(event.target.value)} />

            <div className="field-group">
              <div className="field-label-row">
                <span className="field-label">Puzzle rating</span>
                <span className="field-value">{ratingLabel}</span>
              </div>
              <div className="range-grid">
                <label>
                  <span className="mini-label">Minimum</span>
                  <input className="number-input" type="number" min={manifest?.ratingMin ?? 0} max={manifest?.ratingMax ?? 4000} value={ratingMin} onChange={(event) => setRatingMin(Number(event.target.value))} />
                </label>
                <label>
                  <span className="mini-label">Maximum</span>
                  <input className="number-input" type="number" min={manifest?.ratingMin ?? 0} max={manifest?.ratingMax ?? 4000} value={ratingMax} onChange={(event) => setRatingMax(Number(event.target.value))} />
                </label>
              </div>
            </div>

            <div className="field-group">
              <div className="field-label-row">
                <span className="field-label">Tactic themes</span>
                <span className="field-value">{selectedThemes.length === 0 ? "Any" : `${selectedThemes.length} selected`}</span>
              </div>
              <div className="segmented-control" role="group" aria-label="Theme matching">
                <button className={themeMatch === "all" ? "segment active" : "segment"} type="button" onClick={() => setThemeMatch("all")}>All selected</button>
                <button className={themeMatch === "any" ? "segment active" : "segment"} type="button" onClick={() => setThemeMatch("any")}>Any selected</button>
              </div>
              <div className="theme-grid">
                {availableThemes.map((themeName) => (
                  <label className={selectedThemes.includes(themeName) ? "theme-chip selected" : "theme-chip"} key={themeName}>
                    <input type="checkbox" checked={selectedThemes.includes(themeName)} onChange={() => toggleTheme(themeName)} />
                    <span>{formatTheme(themeName)}</span>
                    {selectedThemes.includes(themeName) && <Check size={13} />}
                  </label>
                ))}
              </div>
            </div>

            <div className="form-row">
              <label className="field-grow" htmlFor="puzzle-count">
                <span className="field-label">Puzzles</span>
                <input id="puzzle-count" className="number-input wide" type="number" min="1" max="1000" value={count} onChange={(event) => setCount(Number(event.target.value))} />
              </label>
              <label className="field-grow" htmlFor="random-seed">
                <span className="field-label">Random seed</span>
                <div className="input-with-action">
                  <input id="random-seed" className="text-input" value={seed} onChange={(event) => setSeed(event.target.value)} />
                  <button className="icon-button input-action" type="button" onClick={randomizeSeed} title="Create a new seed" aria-label="Create a new seed"><RefreshCw size={16} /></button>
                </div>
              </label>
            </div>

            <button className="primary-button generate-button" type="button" onClick={generate} disabled={isGenerating || !manifest}>
              {isGenerating ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
              {isGenerating ? "Generating..." : "Generate puzzle set"}
              {!isGenerating && <ChevronRight size={17} />}
            </button>

            {manifestError && <p className="inline-error">{manifestError}</p>}
            <div className={`notice ${notice.kind}`} role="status">
              <span className="notice-mark">{notice.kind === "success" ? <Check size={15} /> : notice.kind === "error" ? "!" : <CircleHelp size={15} />}</span>
              <span>{notice.text}</span>
            </div>
          </section>

          <section className="workspace-panel">
            <div className="workspace-heading">
              <div>
                <p className="eyebrow">02 / Output</p>
                <h2>{generatedSet ? (setName.trim() || generatedSet.name) : "Your set will appear here"}</h2>
              </div>
              {generatedSet && (
                <div className="workspace-actions">
                  <button className="primary-button compact" type="button" onClick={() => void handleDoPuzzles()}>
                    <Play size={16} /> Do Puzzles
                  </button>
                  <button className="secondary-button compact" type="button" onClick={handleExportJson}>
                    <Download size={16} /> Export JSON
                  </button>
                </div>
              )}
            </div>

            {!generatedSet ? (
              <div className="empty-workspace">
                <div className="empty-orbit"><Target size={26} /></div>
                <h3>Make the first selection</h3>
                <p>Generated puzzles will stay in this browser until you export the set. The stored seed makes the order reproducible.</p>
                {isGenerating && <div className="scan-progress"><span style={{ width: `${Math.min(100, Math.max(8, progress.scanned / Math.max(1, manifest?.recordCount ?? 1) * 100))}%` }} /></div>}
              </div>
            ) : (
              <div className="set-preview">
                <div className="metric-strip">
                  <div><span className="metric-label">Puzzles</span><strong>{generatedSet.puzzles.length}</strong></div>
                  <div><span className="metric-label">Matches</span><strong>{progress.matches.toLocaleString()}</strong></div>
                  <div><span className="metric-label">Rating</span><strong>{generatedSet.selection.ratingMin}-{generatedSet.selection.ratingMax}</strong></div>
                  <div><span className="metric-label">Order seed</span><strong className="seed-value">{generatedSet.selection.seed}</strong></div>
                </div>
                <div className="preview-heading"><span>Puzzle order</span><span>{generatedSet.source.name} / {generatedSet.source.snapshot}</span></div>
                <div className="puzzle-list">
                  {generatedSet.puzzles.slice(0, 8).map((puzzle, index) => (
                    <div className="puzzle-row" key={puzzle.id}>
                      <span className="puzzle-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="puzzle-id">{puzzle.id}</span>
                      <span className="puzzle-themes">{puzzle.themes.slice(0, 3).map(formatTheme).join(" / ")}</span>
                      <span className="puzzle-rating">{puzzle.rating}</span>
                    </div>
                  ))}
                </div>
                {generatedSet.puzzles.length > 8 && <p className="list-footer">+ {generatedSet.puzzles.length - 8} more puzzles in the exported set</p>}
                <div className="source-note"><span className="status-dot" /> Self-contained export. No network is needed by Trainer.</div>
              </div>
            )}
          </section>
        </div>
      </main>

      <footer className="app-footer"><span>Woodpecker / local-first chess practice</span><span>Source data: <a href="https://database.lichess.org/" target="_blank" rel="noreferrer">Lichess open database</a></span></footer>
    </div>
  );
}

export default App;
