import { useEffect, useRef } from "react";
import {
  createActiveTimeTracker,
  pauseActiveTime,
  readActiveTimeMs,
  resumeActiveTime,
  type ActiveRun,
  type ActiveTimeTracker,
  type Run,
} from "@offline-woodpecker/domain";

type TimerSession = {
  runId: string;
  tracker: ActiveTimeTracker;
  run: ActiveRun;
};

const CHECKPOINT_INTERVAL_MS = 1_000;

export function useActiveRunTimer(
  run: ActiveRun | undefined,
  isSolving: boolean,
  persist: (run: ActiveRun, updateView: boolean) => void,
): (run: Run, pause?: boolean) => Run {
  const runRef = useRef(run);
  const persistRef = useRef(persist);
  const sessionRef = useRef<TimerSession | null>(null);
  runRef.current = run;
  persistRef.current = persist;

  function persistSnapshot(runId: string, tracker: ActiveTimeTracker, updateView = false) {
    const session = sessionRef.current;
    const currentRun = runRef.current;
    if (!session || session.runId !== runId || !currentRun || currentRun.id !== runId) return;
    session.run = {
      ...session.run,
      activeTimeMs: Math.round(readActiveTimeMs(tracker, performance.now())),
    };
    persistRef.current(session.run, updateView);
  }

  function pauseSession(runId: string) {
    const session = sessionRef.current;
    if (!session || session.runId !== runId) return;
    session.tracker = pauseActiveTime(session.tracker, performance.now());
    persistSnapshot(runId, session.tracker, true);
  }

  function withActiveTime(nextRun: Run, pause = false): Run {
    const session = sessionRef.current;
    if (!session || session.runId !== nextRun.id) return nextRun;

    const now = performance.now();
    const paused = pauseActiveTime(session.tracker, now);
    const activeTimeMs = Math.round(paused.accumulatedMs);
    session.tracker = paused;
    if (nextRun.status === "active") {
      const timedRun: ActiveRun = { ...nextRun, activeTimeMs };
      session.run = timedRun;
      if (!pause && isSolving && document.visibilityState === "visible") {
        session.tracker = resumeActiveTime(paused, now);
      }
      return timedRun;
    }

    sessionRef.current = null;
    return { ...nextRun, activeTimeMs };
  }

  useEffect(() => {
    if (!run || !isSolving) {
      const session = sessionRef.current;
      if (session) pauseSession(session.runId);
      return;
    }

    const runId = run.id;
    if (sessionRef.current?.runId !== runId) {
      sessionRef.current = {
        runId,
        tracker: createActiveTimeTracker(run.activeTimeMs ?? 0),
        run,
      };
    }

    const session = sessionRef.current;
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      session.tracker = resumeActiveTime(session.tracker, performance.now());
    };
    const pause = () => pauseSession(runId);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") resume();
      else pause();
    };

    resume();
    const checkpoint = window.setInterval(() => persistSnapshot(runId, session.tracker), CHECKPOINT_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", pause);

    return () => {
      window.clearInterval(checkpoint);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", pause);
      pause();
    };
  }, [run?.id, isSolving]);

  return withActiveTime;
}
