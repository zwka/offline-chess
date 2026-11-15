export type ActiveTimeTracker = {
  accumulatedMs: number;
  startedAtMs: number | null;
};

export function createActiveTimeTracker(accumulatedMs = 0): ActiveTimeTracker {
  return {
    accumulatedMs: Math.max(0, accumulatedMs),
    startedAtMs: null,
  };
}

export function resumeActiveTime(tracker: ActiveTimeTracker, nowMs: number): ActiveTimeTracker {
  if (tracker.startedAtMs !== null) return tracker;
  return { ...tracker, startedAtMs: nowMs };
}

export function pauseActiveTime(tracker: ActiveTimeTracker, nowMs: number): ActiveTimeTracker {
  if (tracker.startedAtMs === null) return tracker;
  return {
    accumulatedMs: tracker.accumulatedMs + Math.max(0, nowMs - tracker.startedAtMs),
    startedAtMs: null,
  };
}

export function readActiveTimeMs(tracker: ActiveTimeTracker, nowMs: number): number {
  if (tracker.startedAtMs === null) return tracker.accumulatedMs;
  return tracker.accumulatedMs + Math.max(0, nowMs - tracker.startedAtMs);
}
