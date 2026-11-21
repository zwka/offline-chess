import { expect, test, type Page } from "@playwright/test";
test.use({ hasTouch: true });

async function runs(page: Page) {
  return page.evaluate(() => new Promise<unknown[]>((resolve, reject) => {
    const request = indexedDB.open("offline-woodpecker-trainer", 1);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction("runs", "readonly");
      const get = tx.objectStore("runs").getAll();
      tx.oncomplete = () => { db.close(); resolve(get.result); };
      tx.onerror = () => reject(tx.error);
    };
  }));
}

async function importFixture(page: Page, puzzle: Record<string, unknown>) {
  const demo = await (await page.request.get("/woodpecker-trainer/demo-set.json")).json();
  const set = { ...demo, id: "solution-fixture", name: "Solution fixture", puzzles: [{ ...demo.puzzles[0], ...puzzle }], selection: { ...demo.selection, count: 1 } };
  await page.getByRole("button", { name: "Import set" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({ name: "fixture.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(set)) });
  await page.locator(".set-card").filter({ hasText: "Solution fixture" }).getByRole("button", { name: "Start new Run" }).click();
}

test("revealed solution opens separate Reader playback and returns paused to the same Puzzle", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-21T10:00:00Z") });
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await expect(page.getByRole("button", { name: "Study solution", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Show solution" }).click();
  await page.getByRole("button", { name: "Study solution", exact: true }).click();
  await expect(page).toHaveURL(/pgn-reader\/\?solution=1/);
  await expect(page.getByText("Puzzle Solution Study", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "End", exact: true }).click();
  const caption = await page.locator(".move-caption").textContent();
  await page.reload();
  await expect(page.locator(".move-caption")).toHaveText(caption!);
  const before = await runs(page);
  await page.clock.fastForward(86_400_000);
  await page.getByRole("link", { name: "Return to Trainer", exact: true }).click();
  await expect(page.getByText(/Review paused/)).toBeVisible();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
  await page.clock.fastForward(86_400_000);
  expect(await runs(page)).toEqual(before);
});

test("incorrect move alone and direct Reader entry cannot expose the supplied line", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await page.locator('[data-square="a7"]').click();
  await page.locator('[data-square="a6"]').click();
  await expect(page.getByText("First try missed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Study solution", exact: true })).toHaveCount(0);
  await page.goto("/pgn-reader/?solution=1");
  await expect(page.getByRole("alert")).toContainText("No valid saved");
  await expect(page.getByRole("button", { name: "Forward", exact: true })).toHaveCount(0);
});

const fixtures = [
  { name: "black full line", fen: "8/4R3/1p2P3/p4r2/P6p/1P3Pk1/4K3/8 w - - 1 64", moves: ["e7f7", "f5e5", "e2f1", "e5e6"], sans: ["Re5+", "Kf1", "Rxe6"], square: "e6", piece: "r" },
  { name: "white underpromotion", fen: "8/P7/8/8/8/8/7k/4K3 b - - 0 1", moves: ["h2h3", "a7a8n"], sans: ["a8=N"], square: "a8", piece: "N" },
];
for (const fixture of fixtures) {
  test(`${fixture.name} preserves exact unrelated variation and Library`, async ({ page, browser, baseURL }) => {
    await page.goto("/pgn-reader/");
    await page.getByLabel("Choose PGN source").setInputFiles({ name: "ordinary.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from('[White "Ada"]\n[Black "Boris"]\n\n1. e4 e5 (1... c5 2. Nc3) 2. Nf3 *') });
    await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
    await page.locator('.mv').filter({ hasText: "Nc3" }).click();
    await page.getByRole("button", { name: "Flip", exact: true }).click();
    const bookmark = await page.evaluate(() => localStorage.getItem("offline-chess.reader.normal-study.v1"));
    await page.goto("/woodpecker-trainer/");
    await importFixture(page, fixture);
    await page.getByRole("button", { name: "Show solution" }).click();
    await page.getByRole("button", { name: "Study solution", exact: true }).click();
    await expect(page.locator(".move-caption")).toHaveText("start position");
    for (const san of fixture.sans) {
      await page.getByRole("button", { name: "Forward", exact: true }).click();
      await expect(page.locator(".move-caption")).toContainText(san);
    }
    await expect(page.locator(`.sq[data-square="${fixture.square}"] .piece`)).toHaveAttribute("alt", fixture.piece);
    expect(await page.evaluate(() => localStorage.getItem("offline-chess.reader.normal-study.v1"))).toBe(bookmark);
    const reopened = await browser.newContext({ baseURL, storageState: await page.context().storageState({ indexedDB: true }) });
    try {
      const returning = await reopened.newPage();
      await returning.goto("/pgn-reader/?solution=1");
      await expect(returning.locator(".move-caption")).toContainText(fixture.sans.at(-1)!);
      await returning.getByRole("link", { name: "Ordinary PGN study / Library" }).click();
      await expect(returning.locator(".game-record")).toHaveCount(1);
      await returning.getByRole("button", { name: "Resume", exact: true }).click();
      await expect(returning.locator('[aria-current="step"]')).toContainText("Nc3");
      expect(await returning.evaluate(() => localStorage.getItem("offline-chess.reader.normal-study.v1"))).toBe(bookmark);
    } finally { await reopened.close(); }
  });
}

test("solved entry uses the supplied line, returns to the completed Run without changing its score", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await importFixture(page, { fen: "8/8/8/8/8/8/k1Q5/2K5 b - - 0 1", moves: ["a2a1", "c2a4"], themes: ["mateIn1"] });
  await page.locator('[data-square="c2"]').click();
  await page.locator('[data-square="a4"]').click();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Study solution · Puzzle 1", exact: true }).click();
  await page.getByRole("button", { name: "End", exact: true }).click();
  await expect(page.locator(".move-caption")).toContainText("Qa4#");
  const before = await runs(page);
  await page.getByRole("link", { name: "Return to Trainer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Run history" })).toBeVisible();
  await expect(page.locator(".detail-score")).toContainText("1/1");
  expect(await runs(page)).toEqual(before);
});

test("completion after error unlocks study without recovering the first-try point", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await importFixture(page, { fen: "8/8/8/8/8/8/k1Q5/2K5 b - - 0 1", moves: ["a2a1", "c2a4"], themes: ["mateIn1"] });
  await page.locator('[data-square="c2"]').click();
  await page.locator('[data-square="d2"]').click();
  await expect(page.getByText("First try missed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Study solution", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Retry puzzle" }).click();
  await expect(page.getByText("Find the best move.")).toBeVisible();
  await page.locator('[data-square="c2"]').click();
  await page.locator('[data-square="a4"]').click();
  await expect(page.getByText("Good recovery.")).toBeVisible();
  await page.getByRole("button", { name: "Study solution", exact: true }).click();
  const before = await runs(page);
  await page.getByRole("link", { name: "Return to Trainer", exact: true }).click();
  await expect(page.getByText("Good recovery.")).toBeVisible();
  await expect(page.getByText("0 scored", { exact: true })).toBeVisible();
  expect(await runs(page)).toEqual(before);
});

test("deleted origins recover to normal navigation without fabricating a Run", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await page.getByRole("button", { name: "Show solution" }).click();
  await page.getByRole("button", { name: "Study solution", exact: true }).click();
  await page.getByRole("link", { name: "Return to Trainer", exact: true }).click();
  const returnUrl = page.url();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library", exact: true }).click();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Delete set and history" }).click();
  await expect(page.getByText("Puzzle Set and its history were deleted.")).toBeVisible();
  await page.goto("/pgn-reader/?solution=1");
  await expect(page.getByRole("alert")).toContainText("missing, deleted, or changed");
  await expect(page.getByRole("button", { name: "Forward", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Ordinary PGN study / Library" }).click();
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  await page.goto(returnUrl);
  await expect(page.getByText(/originating Run or Puzzle is missing or deleted/)).toBeVisible();
  expect(await runs(page)).toEqual([]);
});

test("a retained solution cannot bypass the gate after returning to an unsolved retry", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await page.getByRole("button", { name: "Show solution" }).click();
  await page.getByRole("button", { name: "Study solution", exact: true }).click();
  await page.getByRole("link", { name: "Return to Trainer", exact: true }).click();
  await page.getByRole("button", { name: "Resume solving", exact: true }).click();
  await page.getByRole("button", { name: "Retry puzzle" }).click();
  await expect(page.getByText("Find the best move.")).toBeVisible();
  await page.goto("/pgn-reader/?solution=1");
  await expect(page.getByRole("alert")).toContainText("Solve the Puzzle or explicitly reveal");
  await expect(page.getByRole("button", { name: "End", exact: true })).toHaveCount(0);
});

test("failed solution-context write leaves the durable Run intact and navigation safe", async ({ page }) => {
  await page.goto("/woodpecker-trainer/");
  await page.getByRole("button", { name: "Start new Run" }).click();
  await page.getByRole("button", { name: "Show solution" }).click();
  await page.evaluate(() => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "offline-chess.reader.solution-study.v1") throw new DOMException("Full", "QuotaExceededError");
      set.call(this, key, value);
    };
  });
  await page.getByRole("button", { name: "Study solution", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page).toHaveURL(/woodpecker-trainer/);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByText("Solution revealed", { exact: true })).toBeVisible();
});

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`offline solution playback and paused return at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(theme => localStorage.setItem("offline-chess.theme.v1", theme), theme);
    await page.goto("/");
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true }));
    });
    await page.goto("/woodpecker-trainer/");
    await page.getByRole("button", { name: "Start new Run" }).click();
    await page.getByRole("button", { name: "Show solution" }).click();
    await page.getByRole("button", { name: "Study solution", exact: true }).click();
    await expect(page.locator(".move-caption")).toHaveText("start position");
    await page.context().setOffline(true);
    const before = await runs(page);
    await page.getByRole("button", { name: "Forward", exact: true }).tap();
    await page.locator('.board-host').focus();
    await page.keyboard.press("End");
    await expect(page.locator(".move-caption")).toContainText("Qg2#");
    await page.reload();
    await expect(page.locator(".move-caption")).toContainText("Qg2#");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`solution-${width}-${theme}.png`), fullPage: true });
    await page.getByRole("link", { name: "Return to Trainer", exact: true }).click();
    await expect(page.getByRole("button", { name: "Resume solving", exact: true })).toBeVisible();
    expect(await runs(page)).toEqual(before);
  });
}
