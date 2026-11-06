import { useLayoutEffect, useState } from "react";
import {
  applyTheme,
  readThemePreference,
  saveThemePreference
} from "./preferences";
import type { ThemePreference } from "./preferences";

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);

  useLayoutEffect(() => {
    applyTheme(preference);
  }, [preference]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    saveThemePreference(next);
  };

  return { preference, setPreference };
}
