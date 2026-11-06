import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyTheme,
  readThemePreference,
  saveThemePreference
} from "./preferences";

const values = new Map<string, string>();

describe("theme preference", () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value)
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["light", "dark"] as const)("defaults to dark and persists %s under offline-chess.theme.v1", (preference) => {
    expect(readThemePreference()).toBe("dark");
    expect(saveThemePreference(preference)).toBe(true);
    expect(values.get("offline-chess.theme.v1")).toBe(preference);
    expect(readThemePreference()).toBe(preference);
  });

  it.each(["sepia", "system"] as const)("falls back to dark when the saved preference is %s", (invalid) => {
    values.set("offline-chess.theme.v1", invalid);

    expect(readThemePreference()).toBe("dark");
  });

  it("continues with dark when browser storage is unavailable", () => {
    vi.stubGlobal("window", {
      get localStorage() {
        throw new Error("Storage access denied");
      }
    });

    expect(readThemePreference()).toBe("dark");
    expect(saveThemePreference("light")).toBe(false);
  });

  it("applies dataset.theme and theme-color meta content for dark and light", () => {
    const setAttribute = vi.fn();
    const dataset: Record<string, string | undefined> = {};
    vi.stubGlobal("document", {
      documentElement: { dataset },
      querySelector: (selector: string) =>
        selector === 'meta[name="theme-color"]' ? { setAttribute } : null
    });

    expect(applyTheme("dark")).toBe("dark");
    expect(dataset.theme).toBe("dark");
    expect(setAttribute).toHaveBeenLastCalledWith("content", "#172321");

    expect(applyTheme("light")).toBe("light");
    expect(dataset.theme).toBe("light");
    expect(setAttribute).toHaveBeenLastCalledWith("content", "#f4f0e7");
  });
});
