import { useEffect, useLayoutEffect, useState } from "react";
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

  useEffect(() => {
    const syncTheme = () => {
      const latest = readThemePreference();
      setPreferenceState(latest);
      applyTheme(latest);
    };
    window.addEventListener("pageshow", syncTheme);
    window.addEventListener("storage", syncTheme);
    return () => {
      window.removeEventListener("pageshow", syncTheme);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    saveThemePreference(next);
  };

  return { preference, setPreference };
}
