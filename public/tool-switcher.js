// Plain anchors deliberately preserve Trainer's asynchronous navigation boundary.
// The other Tools expose a synchronous, cancelable checkpoint event.
const tools = [
  ["Blind Chess", "/blind-chess/", "blind-chess"],
  ["PGN Reader", "/pgn-reader/", "pgn-reader"],
  ["Woodpecker Generator", "/woodpecker-generator/", "woodpecker-generator"],
  ["Woodpecker Trainer", "/woodpecker-trainer/", "woodpecker-trainer"],
];
const current = tools.find(([, path]) => location.pathname.startsWith(path));

function mount() {
  const header = document.querySelector("header.topbar, header.mobile-header");
  if (!header || !current) return false;
  const host = document.createElement("div");
  host.id = "suite-tool-switcher";
  host.innerHTML = `<button type="button" aria-expanded="false" aria-controls="suite-tool-links">Switch Tool <span aria-hidden="true">▾</span></button>
    <nav id="suite-tool-links" aria-label="Switch Tool" hidden>${tools.map(([name, path, icon]) =>
      `<a href="${path}" data-suite-navigation ${path === current[1] ? 'aria-current="page"' : ""}><svg viewBox="0 0 48 48" width="24" height="24" aria-hidden="true"><use href="/identity/symbols.svg#${icon}"></use></svg><span>${name}</span>${path === current[1] ? '<small aria-hidden="true">Current</small>' : ""}</a>`
    ).join("")}</nav>`;
  const actions = header.querySelector(".topbar-actions, .header-actions") || header;
  actions.prepend(host);
  header.querySelector('a[href="/"]')?.setAttribute("data-suite-navigation", "");
  const button = host.querySelector("button");
  const navigation = host.querySelector("nav");
  function close(restoreFocus = false) {
    navigation.hidden = true;
    button.setAttribute("aria-expanded", "false");
    if (restoreFocus) button.focus();
  }
  button.addEventListener("click", () => {
    navigation.hidden = !navigation.hidden;
    button.setAttribute("aria-expanded", String(!navigation.hidden));
  });
  host.addEventListener("keydown", event => {
    if (event.key === "Escape" && !navigation.hidden) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  });
  document.addEventListener("click", event => { if (!host.contains(event.target)) close(); });
  host.addEventListener("focusout", event => { if (!host.contains(event.relatedTarget)) close(); });
  // Do not turn a same-Tool selection into a reload or an implicit Resume.
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const anchor = event.target instanceof Element ? event.target.closest("a[data-suite-navigation]") : null;
    if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
    const destination = new URL(anchor.href);
    if (destination.pathname === location.pathname && destination.search === location.search) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close(true);
      return;
    }
    if (host.contains(anchor)) close(true);
    if (current[1] !== "/woodpecker-trainer/" && !window.dispatchEvent(new Event("offline-chess:before-navigate", { cancelable: true }))) {
      event.preventDefault();
      close(true);
    }
  }, true);
  return true;
}

// React Tools mount after their entry script; do not require framework changes.
if (!mount()) {
  const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
}
