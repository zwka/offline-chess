import { describe, expect, it } from "vitest";
import {
  createActiveTimeTracker,
  pauseActiveTime,
  readActiveTimeMs,
  resumeActiveTime,
} from "./active-time";

describe("Active solving time", () => {
  it("accumulates visible solving intervals and excludes time away", () => {
    const initial = createActiveTimeTracker();
    const firstInterval = resumeActiveTime(initial, 1_000);

    expect(readActiveTimeMs(firstInterval, 2_500)).toBe(1_500);

    const paused = pauseActiveTime(firstInterval, 3_000);
    const resumed = resumeActiveTime(paused, 10_000);
    const completed = pauseActiveTime(resumed, 12_500);

    expect(completed.accumulatedMs).toBe(4_500);
    expect(readActiveTimeMs(completed, 30_000)).toBe(4_500);
  });

  it("does not double-count an already running or paused interval", () => {
    const running = resumeActiveTime(createActiveTimeTracker(2_000), 5_000);

    expect(resumeActiveTime(running, 8_000)).toBe(running);
    expect(pauseActiveTime(running, 5_000).accumulatedMs).toBe(2_000);
    expect(pauseActiveTime(running, 6_000).accumulatedMs).toBe(3_000);
  });
});
