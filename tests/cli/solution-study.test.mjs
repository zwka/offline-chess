import { test } from "node:test";
import assert from "node:assert/strict";
import { canStudySolution, createSolutionStudy, decodeSolutionStudy, encodeSolutionStudy } from "../../shared/solution-study.js";

const origin = { runId: "run", setId: "set", puzzleId: "puzzle", index: 0, pgn: "1. e4 *", line: '["fen",["e2e4"]]' };

test("Solution Study v1 codec round-trips existing contexts and exact Reader position", () => {
  const context = createSolutionStudy(origin);
  assert.deepEqual(decodeSolutionStudy(JSON.stringify({ version: 1, ...origin })), context);
  context.position = { path: [0, 1, 0], fen: "position", flipped: true };
  assert.deepEqual(decodeSolutionStudy(encodeSolutionStudy(context)), context);
});

test("Solution Study codec rejects unsupported, corrupt and unsafe position metadata", () => {
  for (const raw of [null, "{", "null", ...[
    { ...origin, version: 2 }, { ...origin, version: 1, index: -1 },
    { ...origin, version: 1, runId: "" }, { ...origin, version: 1, pgn: null },
    ...[null, { path: [-1], fen: "fen", flipped: false }, { path: [], fen: "fen", flipped: "false" }].map(position => ({ ...origin, version: 1, position })),
  ].map(value => JSON.stringify(value))]) assert.throws(() => decodeSolutionStudy(raw), /No valid saved/);
});

test("one eligibility boundary distinguishes historical revelation, retry and wrong-move-only failures", () => {
  const run = { status: "active", currentPuzzleIndex: 0, currentPuzzle: { kind: "error" }, results: [{ status: "failed", completion: "pending" }] };
  assert.equal(canStudySolution(run, 0), false);
  run.currentPuzzle.kind = "solution-revealed";
  assert.equal(canStudySolution(run, 0), true); // old current revelation needs no new marker
  run.currentPuzzleIndex = 1;
  assert.equal(canStudySolution(run, 0), false); // old skipped failure is ambiguous
  run.results[0].solutionRevealed = true;
  assert.equal(canStudySolution(run, 0), true);
  run.currentPuzzleIndex = 0;
  run.currentPuzzle.kind = "playing";
  assert.equal(canStudySolution(run, 0), false); // Retry retains its existing re-lock
  run.results[0].completion = "completed";
  assert.equal(canStudySolution(run, 0), true);
  run.results[0] = { status: "first-try-solved" };
  assert.equal(canStudySolution(run, 0), true);
  assert.equal(canStudySolution(run, 1), false);
});
