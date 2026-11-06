export type ThemeChoice = "light" | "dark";

export const THEME_KEY = "offline-chess.theme.v1";
export const DARK_THEME_COLOR = "#172321";
export const LIGHT_THEME_COLOR = "#f4f0e7";

export function readSuiteTheme(): ThemeChoice {
  try {
    const stored = globalThis.localStorage?.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function persistSuiteTheme(theme: ThemeChoice): void {
  try {
    globalThis.localStorage?.setItem(THEME_KEY, theme);
  } catch {
    // Ignore storage failures so the active session still reflects the selected theme.
  }
}
