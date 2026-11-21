import { z } from "zod";
import { AttemptSchema, isKnightMove, pauseRound, quadrantForSquare, sameDiagonal, sameSquare, squareColor, SquareSchema, TrainingModuleSchema } from "./domain";
import type { RoundState, TrainingModule } from "./domain";
import { readAttempts } from "./storage";

export const ACTIVITY_KEY = "offline-blind-chess.activity.v1";
export type Activity = Exclude<RoundState, { kind: "idle" | "running" }> | { kind: "preparation"; training: TrainingModule };

const count = z.number().int().nonnegative();
const timing = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ready"), correct: z.literal(0), answered: z.literal(0), feedback: z.null() }),
  z.object({ kind: z.literal("paused"), remainingMs: z.number().finite().min(0).max(60_000) })
]);
const feedback = <T extends z.ZodTypeAny>(answer: T) => z.object({
  kind: z.enum(["correct", "incorrect"]), picked: answer, expected: answer
}).nullable();
const pair = z.tuple([SquareSchema, SquareSchema]);
const relation = z.enum(["same", "different"]);
const snapshots = z.discriminatedUnion("training", [
  z.object({ training: z.literal("square-colors"), prompt: SquareSchema, feedback: feedback(z.enum(["light", "dark"])) }),
  z.object({ training: z.literal("coordinates"), prompt: SquareSchema, feedback: feedback(SquareSchema) }),
  z.object({ training: z.literal("quadrant"), prompt: SquareSchema, feedback: feedback(z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)])) }),
  z.object({ training: z.literal("same-color"), prompt: pair, feedback: feedback(relation) }),
  z.object({ training: z.literal("diagonals"), prompt: pair, feedback: feedback(relation) }),
  z.object({ training: z.literal("knight"), prompt: pair, feedback: feedback(z.enum(["valid", "invalid"])) })
]);
const roundSchema = z.intersection(z.intersection(snapshots, z.object({ correct: count, answered: count, activityId: z.string().uuid().optional() })), timing)
  .refine(s => s.correct <= s.answered && (s.kind === "ready" || s.answered > 0) && (s.feedback === null || s.answered > 0))
  .refine(s => {
    const f = s.feedback;
    if (f === null) return true;
    let expected: unknown;
    switch (s.training) {
      case "square-colors": expected = squareColor(s.prompt); break;
      case "coordinates": expected = s.prompt; break;
      case "quadrant": expected = quadrantForSquare(s.prompt); break;
      case "same-color": expected = squareColor(s.prompt[0]) === squareColor(s.prompt[1]) ? "same" : "different"; break;
      case "diagonals": expected = sameDiagonal(...s.prompt) ? "same" : "different"; break;
      case "knight": expected = isKnightMove(...s.prompt) ? "valid" : "invalid"; break;
    }
    const equal = (a: unknown, b: unknown) => typeof a === "object" && a !== null && typeof b === "object" && b !== null
      ? sameSquare(a as z.infer<typeof SquareSchema>, b as z.infer<typeof SquareSchema>) : a === b;
    const correct = equal(f.picked, expected);
    return equal(f.expected, expected) && (f.kind === "correct") === correct && (correct ? s.correct > 0 : s.correct < s.answered);
  });
const schema = z.object({ version: z.literal(1), activity: z.union([
  roundSchema,
  z.object({ kind: z.literal("preparation"), training: TrainingModuleSchema }),
  z.object({ kind: z.literal("finished"), attempt: AttemptSchema })
]) });

export function readActivity(): { status: "empty" | "invalid" | "unavailable"; activity?: never } | { status: "saved"; activity: Activity } {
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    if (raw === null) return { status: "empty" };
    try {
      const parsed = schema.safeParse(JSON.parse(raw));
      if (!parsed.success) return { status: "invalid" };
      const activity = parsed.data.activity as Activity;
      if (activity.kind === "ready" || activity.kind === "paused") {
        const completed = readAttempts().find(attempt => attempt.id === activity.activityId);
        if (completed) return { status: "saved", activity: { kind: "finished", attempt: completed } };
      }
      return { status: "saved", activity };
    } catch { return { status: "invalid" }; }
  } catch { return { status: "unavailable" }; }
}

/** Synchronous checkpoint: running clocks are always stored paused, never as deadlines. */
export function saveActivity(activity: Activity | RoundState, now = Date.now()): boolean {
  if (activity.kind === "idle") return true;
  const snapshot = activity.kind === "running" ? pauseRound(activity, now) : activity;
  try {
    window.localStorage.setItem(ACTIVITY_KEY, JSON.stringify({ version: 1, activity: snapshot }));
    return true;
  } catch { return false; }
}

export function clearActivity(): boolean {
  try { window.localStorage.removeItem(ACTIVITY_KEY); return true; } catch { return false; }
}
