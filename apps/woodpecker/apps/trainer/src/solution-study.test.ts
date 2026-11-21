import { expect, it } from "vitest";
import { Chess } from "chess.js";
import { solutionStudyPgn } from "./solution-study";

it("records the complete supplied line from the post-setup FEN, including black and promotion", () => {
  const pgn = solutionStudyPgn({ fen: "8/4R3/1p2P3/p4r2/P6p/1P3Pk1/4K3/8 w - - 1 64", moves: ["e7f7", "f5e5", "e2f1", "e5e6"] });
  const game = new Chess();
  game.loadPgn(pgn);
  expect(game.getHeaders().FEN).toBe("8/5R2/1p2P3/p4r2/P6p/1P3Pk1/4K3/8 b - - 2 64");
  expect(game.history()).toEqual(["Re5+", "Kf1", "Rxe6"]);
  expect(game.fen()).toBe("8/5R2/1p2r3/p7/P6p/1P3Pk1/8/5K2 w - - 0 66");
  const promotion = new Chess();
  promotion.loadPgn(solutionStudyPgn({ fen: "8/P7/8/8/8/8/7k/4K3 b - - 0 1", moves: ["h2h3", "a7a8n"] }));
  expect(promotion.history()).toEqual(["a8=N"]);
  expect(promotion.get("a8")?.type).toBe("n");
});

it("rejects a broken supplied line rather than publishing partial notation", () => {
  expect(() => solutionStudyPgn({ fen: "8/P7/8/8/8/8/7k/4K3 b - - 0 1", moves: ["h2h3", "a7b8q"] })).toThrow();
});

it("retains setup promotion, castling rights, and en passant in the starting FEN", () => {
  const setupPromotion = new Chess();
  setupPromotion.loadPgn(solutionStudyPgn({ fen: "4k3/7P/8/8/8/8/p7/4K3 w - - 0 1", moves: ["h7h8n", "a2a1r"] }));
  expect(setupPromotion.history()).toEqual(["a1=R+"]);
  expect(setupPromotion.getHeaders().FEN).toBe("4k2N/8/8/8/8/8/p7/4K3 b - - 0 1");
  const castle = new Chess();
  castle.loadPgn(solutionStudyPgn({ fen: "4k3/7p/8/8/8/8/8/4K2R b K - 0 1", moves: ["h7h6", "e1g1"] }));
  expect(castle.history()).toEqual(["O-O"]);
  const enPassant = new Chess();
  enPassant.loadPgn(solutionStudyPgn({ fen: "4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1", moves: ["d7d5", "e5d6"] }));
  expect(enPassant.getHeaders().FEN).toBe("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2");
  expect(enPassant.history()).toEqual(["exd6"]);
});
