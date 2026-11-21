import { Chess, type Square, type PieceSymbol } from "chess.js";

/** The source's first move sets up the Puzzle; only the remaining line is studied. */
export function solutionStudyPgn(puzzle: { fen: string; moves: string[] }): string {
  const setup = new Chess(puzzle.fen);
  const apply = (game: Chess, uci: string) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error("Invalid supplied move");
    game.move({ from: uci.slice(0, 2) as Square, to: uci.slice(2, 4) as Square, promotion: uci[4] as PieceSymbol | undefined });
  };
  if (puzzle.moves.length < 2) throw new Error("Missing solution");
  apply(setup, puzzle.moves[0]);
  const game = new Chess(setup.fen());
  for (const move of puzzle.moves.slice(1)) apply(game, move);
  return game.pgn();
}

export const SOLUTION_STUDY_KEY = "offline-chess.reader.solution-study.v1";
