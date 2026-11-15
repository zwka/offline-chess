import { describe, expect, it } from "vitest";
import { formatActiveTime } from "./run-format";

describe("Active solving time formatting", () => {
  it("shows hours, minutes, and seconds for long durations", () => {
    expect(formatActiveTime(8_066_000)).toBe("2h 14m 26s");
  });

  it("keeps seconds visible for short durations", () => {
    expect(formatActiveTime(42_000)).toBe("42s");
    expect(formatActiveTime(60_000)).toBe("1m 0s");
  });

  it("marks duration unavailable when a Run predates time tracking", () => {
    expect(formatActiveTime(undefined)).toBe("Not recorded");
  });
});
