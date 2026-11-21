import { AttemptSchema } from "./domain";
import type { Attempt } from "./domain";

const STORAGE_KEY = "offline-blind-chess.attempts.v1";
const AttemptsSchema = AttemptSchema.array();

function newestFirst(attempts: Attempt[]): Attempt[] {
  return [...attempts].sort((left, right) => right.completedAt.localeCompare(left.completedAt));
}

function loadAttempts(): { attempts: Attempt[]; readable: boolean } {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return { attempts: [], readable: true };
    }

    const parsed: unknown = JSON.parse(stored);
    const result = AttemptsSchema.safeParse(parsed);
    return result.success ? { attempts: newestFirst(result.data), readable: true } : { attempts: [], readable: false };
  } catch {
    return { attempts: [], readable: false };
  }
}

export function readAttempts(): Attempt[] {
  return loadAttempts().attempts;
}

export function saveAttempt(attempt: Attempt): { attempts: Attempt[]; saved: boolean } {
  const history = loadAttempts();
  const attempts = newestFirst([attempt, ...history.attempts.filter((saved) => saved.id !== attempt.id)]);
  if (!history.readable) return { attempts, saved: false };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts));
    return { attempts, saved: true };
  } catch {
    return { attempts, saved: false };
  }
}

export function clearAttemptHistory(): boolean {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
