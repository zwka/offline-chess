export const SOLUTION_STUDY_KEY: string;
export const TRAINER_STORAGE: Readonly<{ name: string; version: number; runs: string; sets: string }>;
export type SolutionStudyPosition = { path: number[]; fen: string; flipped: boolean };
export type SolutionStudyContext = {
  version: 1;
  runId: string;
  setId: string;
  puzzleId: string;
  index: number;
  pgn: string;
  line: string;
  position?: SolutionStudyPosition;
};
export type StudyOriginRun = {
  status: string;
  currentPuzzleIndex: number | null;
  currentPuzzle: { kind: string } | null;
  results: Array<{ status: string; completion?: string; solutionRevealed?: boolean }>;
};
export function decodeSolutionStudy(raw: string | null): SolutionStudyContext;
export function encodeSolutionStudy(context: SolutionStudyContext): string;
export function createSolutionStudy(origin: Omit<SolutionStudyContext, "version">): SolutionStudyContext;
export function solutionLineIdentity(puzzle: { fen: string; moves: string[] }): string;
export function canStudySolution(run: StudyOriginRun, index: number): boolean;
export function verifySolutionStudyOrigin(context: SolutionStudyContext): Promise<void>;
