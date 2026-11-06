const THEME_KEY = "offline-chess.theme.v1";
const DARK_THEME_COLOR = "#172321";
const LIGHT_THEME_COLOR = "#f4f0e7";

const themeToggle = document.getElementById("theme-toggle");
const themeColorMeta = document.querySelector('meta[name="theme-color"]');

function readTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" ? stored : "dark";
  } catch {
    return "dark";
  }
}

let currentTheme = readTheme();

function applyTheme(nextTheme, persist = false) {
  currentTheme = nextTheme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = currentTheme;
  if (themeColorMeta) {
    themeColorMeta.setAttribute(
      "content",
      currentTheme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR,
    );
  }
  if (themeToggle) {
    const nextLabel = currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    themeToggle.title = nextLabel;
    themeToggle.setAttribute("aria-label", nextLabel);
    themeToggle.setAttribute("aria-pressed", String(currentTheme === "dark"));
  }
  if (persist) {
    try {
      window.localStorage.setItem(THEME_KEY, currentTheme);
    } catch {
      // Ignore storage failures so the active session still reflects the selected theme.
    }
  }
}

applyTheme(currentTheme, false);

window.addEventListener("pageshow", () => {
  applyTheme(readTheme(), false);
});

window.addEventListener("storage", () => {
  applyTheme(readTheme(), false);
});

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    applyTheme(currentTheme === "dark" ? "light" : "dark", true);
  });
}

if ("serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
    // Ignore service worker registration errors in unsupported contexts.
  });
}

