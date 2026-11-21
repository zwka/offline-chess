import { beforeEach, expect, it, vi } from "vitest";
import { answerRound, pauseRound, prepareRound, startRoundClock } from "./domain";
import { ACTIVITY_KEY, clearActivity, readActivity, saveActivity } from "./activity";

const values = new Map<string, string>();
beforeEach(() => {
  values.clear();
  vi.stubGlobal("window", { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  } });
});

it("rejects saved feedback that contradicts the actual prompt or accumulated score", () => {
  values.set(ACTIVITY_KEY, JSON.stringify({ version: 1, activity: {
    kind: "paused", training: "square-colors", prompt: { file: "a", rank: 1 },
    correct: 1, answered: 1, remainingMs: 59_000,
    feedback: { kind: "correct", picked: "light", expected: "light" }
  } }));
  expect(readActivity()).toEqual({ status: "invalid" });
});

it("rejects corrupt, unknown-version, impossible and mismatched saved rounds without touching history", () => {
  const ready = prepareRound({ training: "square-colors", prompt: { file: "a", rank: 1 } });
  for (const value of ["{", JSON.stringify({ version: 2, activity: ready }),
    JSON.stringify({ version: 1, activity: { ...ready, correct: 3 } }),
    JSON.stringify({ version: 1, activity: { ...ready, prompt: [{ file: "a", rank: 1 }] } }),
    JSON.stringify({ version: 1, activity: { ...ready, kind: "paused", answered: 1, remainingMs: -1 } }),
    JSON.stringify({ version: 1, activity: { ...ready, kind: "running", endsAt: 123 } })]) {
    values.set(ACTIVITY_KEY, value);
    values.set("offline-blind-chess.attempts.v1", "history stays untouched");
    expect(readActivity()).toEqual({ status: "invalid" });
    expect(values.get("offline-blind-chess.attempts.v1")).toBe("history stays untouched");
  }
});

it("reports unavailable reads, quota writes and interrupted replacement honestly", () => {
  const fail = () => { throw new Error("Storage denied"); };
  vi.stubGlobal("window", { localStorage: { getItem: fail, setItem: fail, removeItem: fail } });
  expect(readActivity()).toEqual({ status: "unavailable" });
  expect(saveActivity({ kind: "preparation", training: "knight" })).toBe(false);
  expect(clearActivity()).toBe(false);
});

it("round-trips every drill, untimed preparation and readiness without inventing a clock", () => {
  for (const training of ["square-colors", "same-color", "coordinates", "diagonals", "quadrant", "knight"] as const) {
    expect(saveActivity({ kind: "preparation", training })).toBe(true);
    expect(readActivity()).toEqual({ status: "saved", activity: { kind: "preparation", training } });
  }
  const ready = prepareRound({ training: "coordinates", prompt: { file: "h", rank: 8 } });
  saveActivity(ready);
  expect(readActivity()).toEqual({ status: "saved", activity: ready });
  expect(clearActivity()).toBe(true);
  expect(readActivity()).toEqual({ status: "empty" });
});

it("checkpoints the exact answered prompt and remaining time without a wall-clock deadline", () => {
  const running = startRoundClock(prepareRound({ training: "square-colors", prompt: { file: "a", rank: 1 } }), 1000);
  const answered = answerRound({ state: running, answer: "dark", now: 1000 });
  expect(saveActivity(answered, 12_345)).toBe(true);
  expect(readActivity()).toEqual({ status: "saved", activity: pauseRound(answered, 12_345) });
  expect(readActivity()).toMatchObject({ activity: { remainingMs: 48_655, correct: 1, answered: 1, feedback: { picked: "dark" } } });
});
