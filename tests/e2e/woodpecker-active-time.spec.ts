import { expect, test } from "@playwright/test";

const onePuzzleSet = {
  kind: "puzzle-set",
  schemaVersion: 1,
  id: "active-time-test-set",
  name: "Active time test",
  createdAt: "2026-11-01T10:00:00.000Z",
  source: {
    name: "Lichess Puzzle Database",
    url: "https://database.lichess.org/",
    snapshot: "2026-10-05",
    license: "CC0",
  },
  selection: {
    ratingMin: 0,
    ratingMax: 3000,
    themes: [],
    themeMatch: "all",
    count: 1,
    seed: "active-time-test",
  },
  contentHash: "a".repeat(64),
  puzzles: [{
    id: "mate-in-one",
    fen: "r4rk1/pp3ppp/8/2bqp2b/3N4/P2Bn2P/1PPN1P2/R1BQ1RK1 w - - 1 15",
    moves: ["d1h5", "d5g2"],
    rating: 1554,
    ratingDeviation: 223,
    popularity: 100,
    nbPlays: 11,
    themes: ["mateIn1"],
    gameUrl: "https://lichess.org/active-time-test",
    openingTags: [],
    dailyDate: null,
  }],
};

test("counts visible solving intervals across pauses and shows active time with Run dates", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-01T10:00:00.000Z") });
  await page.goto("/woodpecker-trainer/");
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();

  await page.getByRole("button", { name: /Import set/i }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "active-time-test-set.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(onePuzzleSet)),
  });
  await expect(page.getByRole("heading", { name: "Active time test" })).toBeVisible();

  await page.locator(".set-card").filter({ has: page.getByRole("heading", { name: "Active time test" }) })
    .getByRole("button", { name: /Start new Run/i }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.clock.fastForward(5_500);

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await page.clock.fastForward(2 * 24 * 60 * 60 * 1_000);
  await page.locator(".set-card").filter({ has: page.getByRole("heading", { name: "Active time test" }) })
    .getByRole("button", { name: /Resume/i }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.clock.fastForward(2_500);

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(24 * 60 * 60 * 1_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.fastForward(5_000);

  await page.locator('[data-square="d5"]').click();
  await page.locator('[data-square="g2"]').click();
  await page.clock.fastForward(300);

  const activeTime = page.locator(".summary-metrics div").filter({ hasText: "Active solving time" }).locator("strong");
  await expect(activeTime).toHaveText(/^(1[3-9]|2\d|30)s$/);
  const activeTimeText = await activeTime.textContent();
  await expect(page.getByText("Started Nov 1, 2026", { exact: false })).toBeVisible();
  await expect(page.getByText("Completed Nov 4, 2026", { exact: false })).toBeVisible();

  await page.getByRole("button", { name: /Inspect results/i }).click();
  await expect(page.getByText("Active solving time", { exact: true })).toBeVisible();
  await expect(page.getByText(activeTimeText ?? "", { exact: true })).toBeVisible();
  await expect(page.getByText("Nov 1, 2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Nov 4, 2026", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History" }).click();
  await page.locator(".history-row").filter({ hasText: "Active time test" }).click();
  await expect(page.getByText("Active solving time", { exact: true })).toBeVisible();
  await expect(page.getByText(activeTimeText ?? "", { exact: true })).toBeVisible();
});
