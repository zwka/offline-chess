import { z } from "zod";

const THEME_PREFERENCE_KEY = "offline-chess.theme.v1";
const ThemePreferenceSchema = z.enum(["light", "dark"]);

export type ThemePreference = z.infer<typeof ThemePreferenceSchema>;

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_PREFERENCE_KEY);
    const result = ThemePreferenceSchema.safeParse(stored);
    return result.success ? result.data : "dark";
  } catch {
    return "dark";
  }
}

export function saveThemePreference(preference: ThemePreference): boolean {
  try {
    window.localStorage.setItem(THEME_PREFERENCE_KEY, preference);
    return true;
  } catch {
    return false;
  }
}

export function applyTheme(preference: ThemePreference): ThemePreference {
  document.documentElement.dataset.theme = preference;
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    preference === "dark" ? "#172321" : "#f4f0e7"
  );
  return preference;
}
