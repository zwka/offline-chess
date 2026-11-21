import { expect, test, type Page } from "@playwright/test";

async function begin(page: Page) {
  await page.clock.install({ time: new Date("2026-01-01") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.goto("/blind-chess/");
  await page.getByRole("button", { name: /Square Colors/ }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.clock.runFor(12_345);
}

for (const [drill, region, answer] of [
  ["Square Colors", "Square color question", "Dark"],
  ["Same Color", "Same color question", "Same"],
  ["Coordinates", "Coordinates question", "Select square a8"],
  ["Diagonals", "Diagonals question", "Different"],
  ["Quadrant", "Quadrant question", "Quadrant 1"],
  ["Knight", "Knight move question", "Yes"]]) {
  test(`${drill} restores the actual answered prompt and feedback before advancing`, async ({ page }) => {
    await page.clock.install({ time: new Date("2026-01-01") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    await page.goto("/blind-chess/");
    await page.getByRole("button", { name: new RegExp(drill) }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("button", { name: answer, exact: true }).click();
    const text = await page.getByRole("region", { name: region }).textContent();
    await page.reload();
    await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("1 answered");
    await page.clock.runFor(120_000);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByRole("region", { name: region })).toHaveText(text!);
    await page.clock.runFor(430);
    await expect(page.getByRole("button", { name: answer, exact: true })).toBeEnabled();
  });
}

test("navigation and persisted-browser reopening retain the exact prompt, answers and milliseconds", async ({ page, browser }) => {
  await begin(page);
  const question = page.getByRole("region", { name: "Square color question" });
  const prompt = await question.textContent();
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  const storageState = await page.context().storageState();
  await page.context().close();
  const context = await browser.newContext({ storageState });
  const reopened = await context.newPage();
  await reopened.clock.install({ time: new Date("2026-02-01") });
  await reopened.clock.pauseAt(new Date("2026-02-01T00:00:01Z"));
  await reopened.goto("/blind-chess/");
  await expect(reopened.getByRole("region", { name: "Saved activity" })).toContainText("1 answered");
  await expect(reopened.getByRole("region", { name: "Saved activity" })).toContainText("47.7 seconds");
  await reopened.clock.runFor(120_000);
  await reopened.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(reopened.getByRole("region", { name: "Square color question" })).toHaveText(prompt!);
  await reopened.clock.runFor(47_654);
  await expect(reopened.getByRole("heading", { name: "Good work." })).toHaveCount(0);
  await reopened.clock.runFor(101);
  await expect(reopened.getByRole("heading", { name: "Good work." })).toBeVisible();
  await reopened.reload();
  await expect(reopened.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await reopened.getByRole("button", { name: "History", exact: true }).click();
  await expect(reopened.getByRole("table").getByRole("row")).toHaveCount(2);
  await context.close();
});

test("pause, hidden visibility and Exit never resume automatically; fresh replacement requires confirmation and keeps history", async ({ page }) => {
  await begin(page);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.clock.runFor(90_000);
  await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("47.7 seconds");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(1000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(90_000);
  await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("46.7 seconds");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.clock.runFor(46_800);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  page.once("dialog", async dialog => { expect(dialog.message()).toContain("personal bests will be kept"); await dialog.accept(); });
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
});

test("preparation and the unanswered first prompt survive reload without starting a clock", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01") });
  await page.goto("/blind-chess/");
  await page.getByRole("button", { name: /Square Colors/ }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.clock.runFor(120_000);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Square Colors", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  const prompt = await page.getByRole("region", { name: "Square color question" }).textContent();
  await page.reload();
  await page.clock.runFor(120_000);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("region", { name: "Square color question" })).toHaveText(prompt!);
  await page.clock.runFor(120_000);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
});

test("quota and interrupted replacement failures are honest and cancel navigation until a successful retry", async ({ page }) => {
  await begin(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    const remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "offline-blind-chess.activity.v1") throw new DOMException("full", "QuotaExceededError");
      write.call(this, key, value);
    };
    Storage.prototype.removeItem = function(key) {
      if (key === "offline-blind-chess.activity.v1") throw new Error("interrupted");
      remove.call(this, key);
    };
    document.addEventListener("restore-storage", () => { Storage.prototype.setItem = write; Storage.prototype.removeItem = remove; });
  });
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page).toHaveURL(/\/blind-chess\/$/);
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  const navigationAllowed = await page.evaluate(() => window.dispatchEvent(new Event("offline-chess:before-navigate", { cancelable: true })));
  expect(navigationAllowed).toBe(false);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be replaced");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.evaluate(() => document.dispatchEvent(new Event("restore-storage")));
  await page.getByRole("button", { name: "Retry save", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("1 answered");
});

test("a failed history write leaves an idempotent completion receipt, not a resumable round", async ({ page }) => {
  await begin(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "offline-blind-chess.attempts.v1") throw new DOMException("full", "QuotaExceededError");
      write.call(this, key, value);
    };
  });
  await page.clock.runFor(48_000);
  await expect(page.getByRole("heading", { name: "Good work." })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: "This completed Attempt" })).toBeVisible();
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
  await page.reload();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
});

test("a completed Attempt suppresses a stale round even when activity writes and removal fail", async ({ page }) => {
  await begin(page);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    const remove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === "offline-blind-chess.activity.v1") throw new Error("activity unavailable");
      write.call(this, key, value);
    };
    Storage.prototype.removeItem = function(key) {
      if (key === "offline-blind-chess.activity.v1") throw new Error("activity unavailable");
      remove.call(this, key);
    };
  });
  await page.clock.runFor(48_000);
  await expect(page.getByRole("heading", { name: "Good work." })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
});

for (const failure of ["invalid", "unavailable"]) {
  test(`${failure} activity storage does not block completed history`, async ({ page }) => {
    await page.addInitScript(mode => {
      localStorage.setItem("offline-blind-chess.attempts.v1", JSON.stringify([{
        id: "e842882b-e4b0-46bc-8b1d-c7a4ccdf774e", completedAt: "2026-01-01T00:00:00.000Z", training: "square-colors", score: 7, answered: 7, accuracy: 100
      }]));
      if (mode === "invalid") localStorage.setItem("offline-blind-chess.activity.v1", "{broken");
      else {
        const read = Storage.prototype.getItem;
        Storage.prototype.getItem = function(key) {
          if (key === "offline-blind-chess.activity.v1") throw new Error("denied");
          return read.call(this, key);
        };
      }
    }, failure);
    await page.goto("/blind-chess/");
    await expect(page.getByRole("alert")).toContainText(failure === "invalid" ? "invalid" : "unavailable");
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.getByRole("table").getByRole("row")).toHaveCount(2);
    await expect(page.getByRole("region", { name: "Square Colors personal best" })).toContainText("7");
  });
}

for (const width of [320, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`resume choice is readable and keyboard accessible in ${theme} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(value => localStorage.setItem("offline-chess.theme.v1", value), theme);
      await begin(page);
      await page.getByRole("button", { name: "Pause", exact: true }).click();
      const resume = page.getByRole("button", { name: "Resume", exact: true });
      await resume.focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Start fresh", exact: true })).toBeFocused();
      for (const button of [resume, page.getByRole("button", { name: "Start fresh", exact: true })]) {
        expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath("saved-activity.png"), fullPage: true });
      await resume.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "48");
    });
  }
}
