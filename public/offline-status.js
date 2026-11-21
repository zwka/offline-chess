// The worker owns the versioned required-resource list. Verification only reads
// that cache; it never fetches, repairs, or probes the optional full index.
const host = document.createElement("div");
host.id = "suite-offline-status";
host.innerHTML = `<button type="button" aria-haspopup="dialog">Offline status: Checking</button>
  <dialog aria-labelledby="suite-offline-title">
    <h2 id="suite-offline-title">Offline readiness</h2>
    <p data-connectivity></p><p data-result aria-live="polite"></p>
    <p>Tool resources include the sample puzzle index only.</p>
    <section data-offline-database><p>Full puzzle database: not checked. Tool readiness does not establish full-database readiness.</p></section>
    <p>Checked locally now; your browser can remove stored resources later. Recheck before leaving connectivity.</p>
    <details><summary>Required resource details</summary><p data-count></p><ul data-missing></ul></details>
    <button type="button" data-recheck>Recheck resources</button>
    <form method="dialog"><button>Close</button></form>
  </dialog>`;
// Optional hook for refreshed headers; the fallback stays in normal flow.
(document.querySelector("[data-offline-status-slot], .topbar-actions") || document.body).append(host);
const button = host.querySelector("button");
const dialog = host.querySelector("dialog");
const labels = { checking: "Checking", ready: "Tools ready", incomplete: "Tools incomplete", unavailable: "Unavailable", failure: "Check failed" };
let generation = 0;
let installationFailed = false;
function show(result) {
  button.textContent = `Offline status: ${labels[result.state]}`;
  host.querySelector("[data-connectivity]").textContent = `${navigator.onLine ? "Online" : "Offline"} — connectivity is not offline readiness`;
  host.querySelector("[data-result]").textContent = {
    checking: "Checking required Tool resources locally…",
    ready: "All required Tool resources verified locally.",
    incomplete: `Required Tool resources are missing. ${result.installFailures ? "Some resources failed to cache during installation." : "Installation may be incomplete or browser storage may have been removed."}`,
    unavailable: "Local verification is unavailable. No controlling Suite service worker or browser support; readiness is not established.",
    failure: "Local verification failed. Browser storage could not be read or the worker did not respond; readiness is not established.",
  }[result.state];
  host.querySelector("[data-count]").textContent = result.total ? `${result.total - result.missing.length} of ${result.total} required resources available.` : "";
  host.querySelector("[data-missing]").replaceChildren(...(result.missing || []).map(path => {
    const item = document.createElement("li");
    item.textContent = path;
    return item;
  }));
  // Extension boundary for optional database details (#16), not a download trigger.
  host.dispatchEvent(new CustomEvent("suite:tools-verified", { bubbles: true, detail: result }));
}
async function verify() {
  const id = ++generation;
  show({ state: "checking" });
  if (!navigator.serviceWorker || !window.caches) return show({ state: "unavailable" });
  const controller = navigator.serviceWorker.controller;
  if (!controller) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (id === generation) show({ state: installationFailed ? "failure" : registration?.installing || registration?.waiting ? "checking" : "unavailable" });
    } catch {
      if (id === generation) show({ state: "failure" });
    }
    return;
  }
  const channel = new MessageChannel();
  const timeout = setTimeout(() => {
    channel.port1.close();
    if (id === generation) show({ state: "failure" });
  }, 10000);
  channel.port1.onmessage = event => {
    clearTimeout(timeout);
    channel.port1.close();
    if (id === generation) show(event.data);
  };
  controller.postMessage({ type: "suite:verify-tools" }, [channel.port2]);
}
button.addEventListener("click", () => { dialog.showModal(); verify(); });
host.querySelector("[data-recheck]").addEventListener("click", verify);
for (const event of ["online", "offline", "focus", "pageshow"]) window.addEventListener(event, verify);
document.addEventListener("visibilitychange", () => { if (!document.hidden) verify(); });
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener("controllerchange", verify);
  navigator.serviceWorker.register("/sw.js").then(registration => {
    const watchInstallation = () => {
      const worker = registration.installing;
      if (!worker) return;
      installationFailed = false;
      show({ state: "checking" });
      worker.addEventListener("statechange", () => {
        if (worker.state === "redundant") installationFailed = true;
        verify();
      });
    };
    registration.addEventListener("updatefound", watchInstallation);
    watchInstallation();
    verify();
  }).catch(() => show({ state: "failure" }));
}
// Cache Storage has no eviction event. Bound stale success while visible, and
// always verify again when details open or a page returns to the foreground.
setInterval(() => { if (!document.hidden) verify(); }, 15000);
verify();
