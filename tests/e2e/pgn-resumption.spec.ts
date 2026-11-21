import { chromium, expect, test } from "@playwright/test";

const pgn = `[Event "Exact study"]
[White "Ada"]
[Black "Boris"]
[Result "*"]

1. e4 e5 (1... c5 2. Nf3 (2. Nc3 Nc6 (2... d6 {Nested destination}))) 2. Nf3 *
`;

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`Resume choice is keyboard and touch accessible at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.addInitScript((value) => localStorage.setItem("offline-chess.theme.v1", value), theme);
      await page.goto("/pgn-reader/");
      await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
      await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
      await page.getByRole("button", { name: "Forward", exact: true }).click();
      await page.reload();
      const resume = page.getByRole("button", { name: "Resume", exact: true });
      await expect(resume).toBeVisible();
      for (const button of [resume, page.getByRole("button", { name: "Start fresh", exact: true })]) {
        const target = await button.boundingBox();
        expect(target!.width).toBeGreaterThanOrEqual(44);
        expect(target!.height).toBeGreaterThanOrEqual(44);
      }
      await resume.focus();
      await expect(resume).toBeFocused();
      await page.screenshot({ path: `test-results/reader-resume-${width}-${theme}.png`, fullPage: true });
      await page.keyboard.press("Enter");
      await expect(page.locator('[aria-current="step"]')).toContainText("e4");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });
  }
}

for (const recovery of ["source", "game", "node", "older", "legacy", "corrupt"] as const) {
  test(`safe ${recovery} bookmark recovery keeps valid Library content`, async ({ page }) => {
    await page.goto("/pgn-reader/");
    await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
    await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
    await page.getByRole("button", { name: "Forward", exact: true }).click();
    await page.getByRole("button", { name: "Back to Library" }).click();
    await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
    await page.evaluate((kind) => {
      const key = "offline-chess.reader.normal-study.v1";
      const value = JSON.parse(localStorage.getItem(key)!);
      if (kind === "source") value.sourceId = 999999;
      if (kind === "game") value.gameId = 999999;
      if (kind === "node") value.position.path = [999999];
      if (kind === "older") delete value.position;
      if (kind === "legacy") localStorage.removeItem(key);
      else localStorage.setItem(key, kind === "corrupt" ? "not json" : JSON.stringify(value));
    }, recovery);
    await page.reload();
    await expect(page.getByRole("button", { name: "Game 1, Ada versus Boris" })).toBeVisible();
    if (recovery === "corrupt") {
      await expect(page.getByRole("region", { name: "Saved study" }).getByRole("status")).toContainText("could not be read");
      await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
    } else {
      await page.getByRole("button", { name: "Resume", exact: true }).click();
      if (recovery === "source") {
        await expect(page.getByRole("region", { name: "Saved study" }).getByRole("status")).toContainText("source is missing");
        await expect(page.getByRole("button", { name: "Game 1, Ada versus Boris" })).toBeVisible();
        return;
      }
      if (recovery === "game") {
        await expect(page.getByRole("alert")).toContainText("was not found");
        await page.getByRole("button", { name: "Back to Library" }).click();
        await expect(page.getByRole("button", { name: "Game 1, Ada versus Boris" })).toBeVisible();
        return;
      }
      await expect(page.getByRole("status")).toContainText(recovery === "node" ? "saved move or variation is missing" : "no exact move was stored");
    }
    await expect(page.locator(".move-caption")).toHaveText("start position");
    await expect(page.locator('.sq[data-square="e2"] .piece')).toHaveAttribute("alt", "P");
  });
}

test("a failed study write is honest, keeps the live study, and does not overwrite the durable place", async ({ page }) => {
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "offline-chess.reader.normal-study.v1") throw new DOMException("full", "QuotaExceededError");
      original.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("e5");
  await expect(page.getByRole("status")).toContainText("Could not save on this device");
  await expect(page.getByRole("status")).not.toContainText("Study saved");
  await page.getByRole("button", { name: "Back to Library" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByRole("button", { name: "Return to Study", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("e5");
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("e4");
});

test("denied bookmark reads do not block retained PGNs", async ({ page }) => {
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem;
    const set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key === "offline-chess.reader.normal-study.v1") throw new DOMException("denied", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key === "offline-chess.reader.normal-study.v1") throw new DOMException("denied", "SecurityError");
      set.call(this, key, value);
    };
  });
  await page.reload();
  await expect(page.getByRole("region", { name: "Saved study" })).toContainText("could not be read");
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("e4");
  await expect(page.getByRole("region", { name: "Saved study" })).toContainText("Could not save on this device");
});

test("browsing another source does not replace normal study; choosing a different game confirms replacement", async ({ page }) => {
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await page.getByRole("button", { name: "Back to Library" }).click();
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "other.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn.replace("Ada", "Clara")) });
  await expect(page.getByRole("button", { name: "Game 1, Clara versus Boris" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ada - Boris" })).toBeVisible();
  await expect(page.locator('[aria-current="step"]')).toContainText("e4");
  await page.getByRole("button", { name: "Back to Library" }).click();
  await page.getByRole("button", { name: "Select other.pgn" }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Game 1, Clara versus Boris" }).click();
  await page.getByRole("button", { name: "Return to Study" }).click();
  await expect(page.getByRole("heading", { name: "Ada - Boris" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Library" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Game 1, Clara versus Boris" }).click();
  await expect(page.getByRole("heading", { name: "Clara - Boris" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Clara - Boris" })).toBeVisible();
});

test("a corrupted older bookmark cannot hide valid retained Library content", async ({ page }) => {
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Back to Library" }).click();
  await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeVisible();
  // Seed an older persisted installation with a damaged bookmark only.
  await page.evaluate(async () => {
    localStorage.removeItem("offline-chess.reader.normal-study.v1");
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("offline-pgn-reader-mobile");
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction("library", "readwrite");
        const store = tx.objectStore("library");
        const read = store.get("active");
        read.onsuccess = () => {
          const snapshot = read.result;
          snapshot.sources[0].source.resumeBookmark = { sourceId: 1, gameId: 999999 };
          store.put(snapshot, "active");
        };
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      request.onerror = () => reject(request.error);
    });
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Game 1, Ada versus Boris" })).toBeVisible();
  await expect(page.locator("#source-error")).toContainText("bookmark");
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await expect(page.locator(".move-caption")).toHaveText("start position");
});

test("Start fresh confirms replacement, cancellation retains study, and imports survive", async ({ page }) => {
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await page.reload();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Imported PGNs and completed history are retained");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("e4");
  await page.getByRole("button", { name: "Back to Library" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Game 1, Ada versus Boris" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Select exact.pgn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await expect(page.locator(".move-caption")).toHaveText("start position");
});

test("exact nested variation survives leaving, reload, and a persisted browser reopening", async ({ baseURL }, testInfo) => {
  const profile = testInfo.outputPath("browser-profile");
  const original = await chromium.launchPersistentContext(profile, { baseURL });
  const page = await original.newPage();
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "exact.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await expect(page.locator(".notation-body")).toBeVisible();
  for (const toggle of await page.locator(".collapsed > .var-toggle").all()) await toggle.click();
  // A deeply nested alternate, not a mainline move at the same ply.
  await page.locator(".mv").filter({ hasText: "d6" }).click();
  await page.getByRole("button", { name: "Flip", exact: true }).click();
  await page.getByRole("button", { name: "Back to Library" }).click();
  await page.getByRole("button", { name: "Return to Study" }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("d6");
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await page.goto("/pgn-reader/");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("d6");
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await original.close();
  const context = await chromium.launchPersistentContext(profile, { baseURL });
  const reopened = await context.newPage();
  await reopened.goto("/pgn-reader/");
  await reopened.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(reopened.locator('[aria-current="step"]')).toContainText("d6");
  await expect(reopened.getByText("Nested destination", { exact: true })).toBeVisible();
  await expect(reopened.locator('.sq[data-square="d6"] .piece')).toHaveAttribute("alt", "p");
  await expect(reopened.locator(".board .sq").first()).toHaveAttribute("data-square", "h1");
  await context.close();
});
