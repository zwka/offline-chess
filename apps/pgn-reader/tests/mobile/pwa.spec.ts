import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const requiredStaticAssets = [
  "/index.html",
  "/mobile.css",
  "/dist/mobile/app.js",
  "/dist/mobile/scan-worker.js",
  "/dist/vendor/chess.js",
  "/dist/vendor/pgn.js",
  "/pieces/wK.svg",
  "/pieces/bK.svg",
  "/favicon-32.png",
  "/apple-touch-icon.png",
  "/icons/icon-32.png",
  "/icons/icon-180.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

test("serves the complete static mobile build with Suite icons and no standalone manifest or per-Tool service worker", async ({ page }) => {
  const healthResponse = await page.request.get("/api/health");
  expect(healthResponse.status()).toBe(404);

  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(404);

  const workerResponse = await page.request.get("/service-worker.js");
  expect(workerResponse.status()).toBe(404);

  for (const asset of requiredStaticAssets) {
    const response = await page.request.get(asset);
    expect(response.ok(), `expected ${asset} to return 200`).toBe(true);
  }

  await page.goto("/");
  await expect(page).toHaveTitle("PGN Reader Mobile");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon-32.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
  await expect(page.locator("#source-input")).toBeVisible();
  await expect(page.locator("#source-status")).toHaveText("idle");

  const registrations = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) return [];
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((r) => r.scope);
  });
  expect(registrations).toEqual([]);
});

test("restores the persisted reader across reloads without API requests", async ({ page }) => {
  const pageErrors: string[] = [];
  const blockedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.locator("#source-input").setInputFiles({
    name: "offline-reader.pgn",
    mimeType: "application/x-chess-pgn",
    buffer: mobileReaderSource(),
  });
  await expect(page.locator("#source-status")).toHaveText("ready", { timeout: 10_000 });
  await expect(page.locator("#record-list .game-record")).toHaveCount(4);

  const webkit = isWebKit(page);
  await page.route("**/api/**", (route) => {
    blockedRequests.push(route.request().url());
    return route.abort();
  });
  try {
    await verifyOfflineStartup(page);
    if (webkit) {
      expect(await readPersistedMobileLibrary(page)).toEqual({
        sourceName: "offline-reader.pgn",
        gameCount: 4,
      });
    }
    await expect(page.locator("#source-status")).toHaveText("ready", { timeout: 10_000 });
    await expect(page.locator("#source-name")).toHaveText("offline-reader.pgn");
    await expect(page.locator("#record-list .game-record")).toHaveCount(4);

    await page.locator("#record-list .game-record").first().click();
    await expect(page.locator(".reader-title")).toContainText("Annotator");
    await expect(page.locator('.board .sq[data-square="e2"] .piece')).toHaveAttribute("alt", "P");
    await expect(page.locator(".notation-body .cmt").first()).toContainText("Pre-game introduction comment.");
    await expect(page.locator(".notation-body .mv").filter({ hasText: "e4" }).first()).toContainText("!");

    await page.locator(".meta-panel summary").click();
    await expect(page.locator(".meta-table")).toContainText("Annotator");
    await page.getByRole("button", { name: "Raw PGN source" }).click();
    await expect(page.locator(".raw-source")).toContainText('[Event "Annotated"]');

    await page.locator('[data-action="next-game"]').click();
    await expect(page.locator(".reader-title")).toContainText("Arrows");
    await expect(page.locator('.board .sq[data-square="d4"] .csl')).toHaveCount(1);
    await expect(page.locator(".variation .mv").first()).toContainText("c5");
    await page.locator(".variation .mv").first().click();
    await expect(page.locator(".notation-body .mv.current")).toContainText("c5");

    await page.locator('[data-action="next-game"]').click();
    await expect(page.locator(".reader-title")).toContainText("Tree - Builder");
    expect(await page.locator(".variation").count()).toBeGreaterThan(0);
  } finally {
    await page.unroute("**/api/**");
  }

  expect(blockedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("migrates a v1 one-source IndexedDB record without losing its Game record", async ({ page }) => {
  const sourceText = '[Event "Browser legacy"]\n[White "Migrated"]\n\n1. e4 *\n';
  await page.goto("/");
  await expect(page.locator("#source-status")).toHaveText("idle", { timeout: 10_000 });
  await page.evaluate(async (sourceText) => {
    const databaseName = "offline-pgn-reader-mobile";
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("could not reset Mobile Library database"));
    });

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => request.result.createObjectStore("library");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const sourceBytes = new TextEncoder().encode(sourceText).buffer;
        const transaction = request.result.transaction("library", "readwrite");
        transaction.objectStore("library").put({
          schemaVersion: 1,
          source: {
            name: "browser-legacy.pgn",
            size: sourceBytes.byteLength,
            game_count: 1,
            warning_count: 0,
            scan_status: "ready",
            scan_error: null,
            progress: {
              bytesDone: sourceBytes.byteLength,
              bytesTotal: sourceBytes.byteLength,
              gamesFound: 1,
            },
          },
          sourceBytes,
          games: [{
            scanned: {
              idxInFile: 0,
              offsetStart: 0,
              offsetEnd: sourceBytes.byteLength,
              headers: [["Event", "Browser legacy"], ["White", "Migrated"]],
              warning: null,
            },
            record: {
              id: 1,
              idx_in_file: 0,
              event: "Browser legacy",
              site: "",
              date: "",
              round: "",
              white: "Migrated",
              black: "",
              result: "",
              eco: "",
              opening: "",
              has_fen: 0,
              warning: null,
              byte_size: sourceBytes.byteLength,
            },
          }],
        }, "active");
        transaction.oncomplete = () => {
          request.result.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, sourceText);

  await page.reload();
  await expect(page.locator("#source-status")).toHaveText("ready", { timeout: 10_000 });
  await expect(page.locator("#source-name")).toHaveText("browser-legacy.pgn");
  await expect(page.locator("#record-list .game-record")).toHaveCount(1);
  await page.locator("#record-list .game-record").click();
  await expect(page.locator(".reader-title")).toContainText("Migrated");

  const migrated = await page.evaluate(async () => {
    const request = indexedDB.open("offline-pgn-reader-mobile");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const snapshot = await new Promise<any>((resolve, reject) => {
      const transaction = database.transaction("library", "readonly");
      const read = transaction.objectStore("library").get("active");
      read.onsuccess = () => resolve(read.result);
      read.onerror = () => reject(read.error);
    });
    database.close();
    return {
      schemaVersion: snapshot.schemaVersion,
      activeSourceId: snapshot.activeSourceId,
      sourceCount: snapshot.sources.length,
      sourceBytes: snapshot.sources[0].sourceBytes.byteLength,
    };
  });
  expect(migrated).toEqual({
    schemaVersion: 3,
    activeSourceId: 1,
    sourceCount: 1,
    sourceBytes: new TextEncoder().encode(sourceText).byteLength,
  });
});

test("retains each source and reads the selected source across reloads", async ({ page }) => {
  const pageErrors: string[] = [];
  const blockedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  await page.locator("#source-input").setInputFiles({
    name: "offline-first.pgn",
    mimeType: "application/x-chess-pgn",
    buffer: Buffer.from('[Event "Offline First"]\n[White "First"]\n\n1. e4 *\n'),
  });
  await expect(page.locator("#source-status")).toHaveText("ready", { timeout: 10_000 });
  await page.locator("#source-input").setInputFiles({
    name: "offline-second.pgn",
    mimeType: "application/x-chess-pgn",
    buffer: Buffer.from('[Event "Offline Second"]\n[White "Second"]\n\n1. d4 *\n'),
  });
  await expect(page.locator("#source-name")).toHaveText("offline-second.pgn", { timeout: 10_000 });
  await page.getByRole("button", { name: "Select offline-first.pgn" }).click();
  await expect(page.locator("#source-name")).toHaveText("offline-first.pgn");
  await expect(page.locator("#reader-panel")).toBeHidden();

  await page.route("**/api/**", (route) => {
    blockedRequests.push(route.request().url());
    return route.abort();
  });
  try {
    await verifyOfflineStartup(page);
    await expect(page.locator("#source-name")).toHaveText("offline-first.pgn", { timeout: 10_000 });
    await expect(page.locator("#record-list")).toContainText("Offline First");
    await page.locator("#record-list .game-record").click();
    await expect(page.locator(".reader-title")).toContainText("First");
    await page.getByRole("button", { name: "Raw PGN source" }).click();
    await expect(page.locator(".raw-source")).toContainText('[Event "Offline First"]');
    await page.getByRole("button", { name: "Back to Game records" }).click();

    await page.getByRole("button", { name: "Select offline-second.pgn" }).click();
    await expect(page.locator("#source-name")).toHaveText("offline-second.pgn");
    await expect(page.locator("#record-list")).toContainText("Offline Second");
    await page.locator("#record-list .game-record").click();
    await expect(page.locator(".reader-title")).toContainText("Second");
    await page.getByRole("button", { name: "Raw PGN source" }).click();
    await expect(page.locator(".raw-source")).toContainText('[Event "Offline Second"]');
  } finally {
    await page.unroute("**/api/**");
  }

  expect(blockedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("keeps the retained snapshot when adding a source exceeds browser storage", async ({ page }) => {
  await page.addInitScript(() => {
    let writes = 0;
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(this: IDBObjectStore, value: any, key?: IDBValidKey) {
      writes += 1;
      if (writes === 2) throw new DOMException("Quota exceeded", "QuotaExceededError");
      return key === undefined
        ? originalPut.call(this, value)
        : originalPut.call(this, value, key);
    } as typeof originalPut;
  });

  await page.goto("/");
  await page.locator("#source-input").setInputFiles({
    name: "quota-first.pgn",
    mimeType: "application/x-chess-pgn",
    buffer: Buffer.from('[Event "Quota first"]\n[White "Kept"]\n\n1. e4 *\n'),
  });
  await expect(page.locator("#source-status")).toHaveText("ready", { timeout: 10_000 });

  await page.locator("#source-input").setInputFiles({
    name: "quota-second.pgn",
    mimeType: "application/x-chess-pgn",
    buffer: Buffer.from('[Event "Quota second"]\n[White "Rejected"]\n\n1. d4 *\n'),
  });
  await expect(page.locator("#source-error")).toContainText("Could not save the Mobile Library", { timeout: 10_000 });
  await expect(page.locator("#source-name")).toHaveText("quota-first.pgn");
  await expect(page.locator("#record-list")).toContainText("Kept");
  await expect(page.locator("#record-list")).not.toContainText("Rejected");
  await expect(page.locator("#source-list .source-select-name")).toHaveText(["quota-first.pgn"]);

  await page.reload();
  await expect(page.locator("#source-name")).toHaveText("quota-first.pgn", { timeout: 10_000 });
  await expect(page.locator("#record-list")).toContainText("Kept");
  await expect(page.locator("#source-list .source-select-name")).toHaveText(["quota-first.pgn"]);
});

test("keeps an empty Mobile Library usable across reloads", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/");
  const webkit = isWebKit(page);
  const blockedRequests: string[] = [];
  await page.route("**/api/**", (route) => {
    blockedRequests.push(route.request().url());
    return route.abort();
  });
  try {
    await verifyOfflineStartup(page);
    if (webkit) {
      expect(await readPersistedMobileLibrary(page)).toEqual({ sourceName: null, gameCount: 0 });
    }
    await expect(page.locator("#source-status")).toHaveText("idle");
    await expect(page.locator("#source-name")).toHaveText("No PGN source selected");
    await expect(page.locator("#record-list .game-record")).toHaveCount(0);
    await expect(page.locator("#source-error")).toBeHidden();
  } finally {
    await page.unroute("**/api/**");
  }

  expect(blockedRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

async function verifyOfflineStartup(page: import("@playwright/test").Page): Promise<void> {
  if (isWebKit(page)) {
    // WebKit's Playwright navigation cannot commit with network blocking;
    // fetch the precached shell and verify IndexedDB restoration separately.
    await page.evaluate(async () => {
      const response = await fetch("./index.html", { cache: "reload" });
      if (!response.ok) throw new Error(`cached PWA shell request failed: ${response.status}`);
    });
    return;
  }
  await page.reload({ waitUntil: "commit" });
}

function isWebKit(page: import("@playwright/test").Page): boolean {
  return page.context().browser()?.browserType().name() === "webkit";
}

async function readPersistedMobileLibrary(page: import("@playwright/test").Page): Promise<{
  sourceName: string | null;
  gameCount: number;
}> {
  return page.evaluate(async () => {
    const modulePath: string = "./dist/mobile/library.js";
    const { PersistentMobileLibrary } = await import(modulePath);
    const library = new PersistentMobileLibrary(() => {
      throw new Error("restore should not start a Scan worker");
    });
    await library.ready();
    const source = library.source;
    const result = { sourceName: source?.name ?? null, gameCount: library.listGames().total };
    library.close();
    return result;
  });
}

function mobileReaderSource(): Buffer {
  return Buffer.from([
    readFileSync(resolve("tests/fixtures/annotations.pgn"), "utf8").trimEnd(),
    readFileSync(resolve("tests/fixtures/graphics.pgn"), "utf8").trimEnd(),
    readFileSync(resolve("tests/fixtures/variations.pgn"), "utf8").trimEnd(),
    readFileSync(resolve("tests/fixtures/fen_start.pgn"), "utf8").trimEnd(),
  ].join("\n\n"));
}
