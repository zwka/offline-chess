import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTheme, readThemePreference } from "./preferences";
import "./styles.css";

applyTheme(readThemePreference());

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // Ignore service worker registration errors in unsupported contexts.
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

