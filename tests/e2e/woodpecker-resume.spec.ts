import { expect, test } from "@playwright/test";

test("whole-line move, error, reveal, and retries survive reopening without recovering a point", async ({ page, browser, baseURL }) => {
  await page.goto("/woodpecker-trainer/");
  const demo = await (await page.request.get("/woodpecker-trainer/demo-set.json")).json();
  const set = { ...demo, id: "resume-line", name: "Whole line", puzzles: [demo.puzzles[1]], selection: { ...demo.selection, count: 1 } };
  await page.getByRole("button", { name: "Import set" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "line.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(set)) });
  await page.locator(".set-card").filter({ hasText: "Whole line" }).getByRole("button", { name: "Start new Run" }).click();
  await page.locator('[data-square="f5"]').click();
  await page.locator('[data-square="e5"]').click();
  await expect(page.locator('[data-square="f1"] [data-piece="wK"]')).toBeVisible();
  await expect(page.getByText("0 scored", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  const reopened = await browser.newContext({ baseURL, storageState: await page.context().storageState({ indexedDB: true }) });
  const returning = await reopened.newPage();
  try {
    await returning.goto("/woodpecker-trainer/");
    await returning.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(returning.locator('[data-square="e5"] [data-piece="bR"]')).toBeVisible();
    await expect(returning.locator('[data-square="f1"] [data-piece="wK"]')).toBeVisible();
    await returning.locator('[data-square="e5"]').click();
    await returning.locator('[data-square="d5"]').click();
    await expect(returning.getByText("First try missed", { exact: true })).toBeVisible();
    await returning.reload();
    await returning.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(returning.getByText("First try missed", { exact: true })).toBeVisible();
    await returning.getByRole("button", { name: "Retry puzzle" }).click();
    await returning.getByRole("button", { name: "Show solution" }).click();
    await expect(returning.getByText("Solution revealed", { exact: true })).toBeVisible();
    await returning.reload();
    await returning.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(returning.getByText("Solution revealed", { exact: true })).toBeVisible();
    await returning.getByRole("button", { name: "Retry puzzle" }).click();
    await returning.locator('[data-square="f5"]').click();
    await returning.locator('[data-square="e5"]').click();
    await expect(returning.locator('[data-square="f1"] [data-piece="wK"]')).toBeVisible();
    // Wait for the normal automatic reply playback to release board input.
    await expect(returning.getByRole("button", { name: "Show solution" })).toBeEnabled();
    await returning.locator('[data-square="e5"]').click();
    await returning.locator('[data-square="e6"]').click();
    await expect(returning.getByText("Good recovery.")).toBeVisible();
    await returning.getByRole("button", { name: "Next puzzle" }).click();
    await expect(returning.getByText("0%", { exact: true })).toBeVisible();
    await returning.getByRole("button", { name: "Inspect results" }).click();
    await expect(returning.getByText("Completed after error", { exact: true })).toBeVisible();
    await expect(returning.getByText("2 retries", { exact: true })).toBeVisible();
    await expect(returning.locator(".history-row")).toHaveCount(1);
  } finally { await reopened.close(); }
});

test("storage failure stays visible and cannot claim a reveal was saved", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () { throw new DOMException("Full", "QuotaExceededError"); };
  });
  await page.getByRole("button", { name: "Show solution" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByText("Find the best move.")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Find the best move.")).toBeVisible();
});

test("Suite navigation waits for a durable checkpoint and blocks on write failure", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () { throw new DOMException("Full", "QuotaExceededError"); };
  });
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Navigation paused");
  await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
});

test("multiple Puzzle Sets retain independent active Runs and a fresh Run replaces only its own set", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await page.getByRole("button", { name: "Show solution" }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  const demo = await (await page.request.get("/woodpecker-trainer/demo-set.json")).json();
  const set = { ...demo, id: "independent", name: "Independent set", puzzles: [demo.puzzles[1]], selection: { ...demo.selection, count: 1 } };
  await page.getByRole("button", { name: "Import set" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "independent.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(set)) });
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(2);
  page.once("dialog", dialog => dialog.accept());
  await page.locator(".set-card").filter({ hasText: "Independent set" }).getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await page.locator(".set-card").filter({ hasText: "Warm-up tactics" }).getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History" }).click();
  await expect(page.locator(".history-row")).toHaveCount(3);
  await expect(page.locator(".history-row").filter({ hasText: "active" })).toHaveCount(2);
});

test("back-forward cache reentry requires explicit Resume and excludes entry wall time", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-21T10:00:00Z") });
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.clock.fastForward(4_000);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await expect(page.getByText(/Timing stays paused/)).toBeVisible();
  await page.clock.fastForward(86_400_000);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.clock.fastForward(2_000);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await expect(page.getByText(/Active solving time: [6-8]s/)).toBeVisible();
});

test("denied optional localStorage metadata does not hide existing Puzzle Sets", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === "woodpecker-demo-seeded") throw new DOMException("Denied", "SecurityError");
      return get.call(this, key);
    };
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "woodpecker-demo-seeded") throw new DOMException("Denied", "SecurityError");
      return set.call(this, key, value);
    };
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
});

test("failed Start fresh rolls back abandonment and retains the saved Run", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await page.getByRole("button", { name: "Show solution" }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (value.status === "active") throw new DOMException("Full", "QuotaExceededError");
      return key === undefined ? put.call(this, value) : put.call(this, value, key);
    };
  });
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByRole("alert")).toContainText("existing Run and history are unchanged");
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History" }).click();
  await expect(page.locator(".history-row")).toHaveCount(1);
  await expect(page.locator(".history-row")).toContainText("active");
});

test("invalid activity records do not hide valid imported content", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("offline-woodpecker-trainer", 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("runs", "readwrite");
      tx.objectStore("runs").put({ id: "broken", setId: "demo-warmup", status: "active", currentPuzzle: { kind: "invalid" } });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
    request.onerror = () => reject(request.error);
  }));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
});

test("unavailable IndexedDB reports an actionable failure instead of perpetual loading", async ({ page }) => {
  await page.addInitScript(() => { indexedDB.open = () => { throw new DOMException("Denied", "SecurityError"); }; });
  await page.goto("/woodpecker-trainer/");
  await expect(page.getByRole("alert")).toContainText("Reload to try again");
  await expect(page.getByText("Saved activity is unavailable. No Run has been started.")).toBeVisible();
  await expect(page.getByText("Opening local Trainer storage...")).toHaveCount(0);
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Offline Chess", exact: true })).toBeVisible();
});

test("unfinished Run entry is paused, informative, and replacement requires confirmation", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-21T10:00:00Z") });
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.getByRole("button", { name: "Show solution" }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.clock.fastForward(5_000);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await expect(page.getByText(/Timing stays paused until you choose Resume/)).toBeVisible();
  await expect(page.getByText(/Puzzle 1 of 4 · Solution revealed/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Timing stays paused/)).toBeVisible();
  await page.clock.fastForward(86_400_000);
  page.once("dialog", async dialog => { expect(dialog.message()).toContain("Abandoned Run"); await dialog.dismiss(); });
  await page.getByRole("button", { name: "Start fresh" }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Start fresh" }).click();
  await expect(page.getByText("Find the best move.")).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History" }).click();
  await expect(page.getByText(/abandoned/, { exact: false })).toBeVisible();
  await expect(page.locator(".history-row")).toHaveCount(2);
});

for (const width of [320, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`Trainer controls and board remain usable at ${width}px in ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(theme => localStorage.setItem("offline-chess.theme.v1", theme), theme);
      await page.goto("/woodpecker-trainer/");
      await page.getByRole("button", { name: "Start new Run" }).click();
      const board = page.locator('[data-square="a8"]');
      await expect(board).toBeVisible();
      const square = await board.boundingBox();
      expect(square!.width).toBeGreaterThan(30);
      await page.getByRole("button", { name: "Show solution" }).click();
      await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`trainer-${width}-${theme}.png`), fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
      await expect(page).toHaveURL(/\/$/);
      await page.getByRole("link", { name: /Woodpecker Trainer/ }).click();
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
    });
  }
}
