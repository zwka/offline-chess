import { expect, test } from "@playwright/test";

if (process.env.CHROME_BIN) {
  test.use({ launchOptions: { executablePath: process.env.CHROME_BIN } });
}

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

const legacyBackup = {
  kind: "trainer-backup",
  schemaVersion: 2,
  exportedAt: "2026-10-01T12:00:00.000Z",
  puzzleSets: [{ set: onePuzzleSet, archived: false }],
  runs: [
    {
      kind: "run",
      schemaVersion: 2,
      id: "legacy-completed-run",
      setId: onePuzzleSet.id,
      status: "completed",
      startedAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:01:00.000Z",
      currentPuzzleIndex: null,
      currentPuzzle: null,
      endedAt: "2026-10-01T10:01:00.000Z",
      results: [{
        puzzleId: "mate-in-one",
        status: "first-try-solved",
        errorCount: 0,
        retryCount: 0,
        completedAt: "2026-10-01T10:01:00.000Z",
      }],
    },
    {
      kind: "run",
      schemaVersion: 2,
      id: "legacy-active-run",
      setId: onePuzzleSet.id,
      status: "active",
      startedAt: "2026-10-20T09:00:00.000Z",
      updatedAt: "2026-10-20T09:00:00.000Z",
      currentPuzzleIndex: 0,
      currentPuzzle: { kind: "playing", moveIndex: 1, retryCount: 0 },
      results: [{ puzzleId: "mate-in-one", status: "pending", errorCount: 0, retryCount: 0 }],
    },
  ],
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
  await page.clock.fastForward(24 * 60 * 60 * 1_000);
  await page.locator(".set-card").filter({ has: page.getByRole("heading", { name: "Active time test" }) })
    .getByRole("button", { name: /Resume/i }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.clock.fastForward(2_500);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.clock.fastForward(24 * 60 * 60 * 1_000);
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
  await page.clock.fastForward(2_500);

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

test("shows legacy completed time as unavailable and tracks an older active Run from resume", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-15T10:00:00.000Z") });
  await page.goto("/woodpecker-trainer/");
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();

  await page.getByRole("button", { name: /Restore backup/i }).click();
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "legacy-trainer-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(legacyBackup)),
  });
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History" }).click();

  await page.locator(".history-row").filter({ hasText: "Oct 1, 2026" }).click();
  await expect(page.getByText("Not recorded", { exact: true })).toBeVisible();

  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
  await page.locator(".set-card").filter({ has: page.getByRole("heading", { name: "Active time test" }) })
    .getByRole("button", { name: /Resume/i }).click();
  await expect(page.getByText("Puzzle 01")).toBeVisible();
  await page.clock.fastForward(3_000);

  await page.locator('[data-square="d5"]').click();
  await page.locator('[data-square="g2"]').click();
  await page.clock.fastForward(300);

  const activeTime = page.locator(".summary-metrics div").filter({ hasText: "Active solving time" }).locator("strong");
  await expect(activeTime).toHaveText(/^\d+s$/);
  await expect(page.getByText("Started Oct 20, 2026", { exact: false })).toBeVisible();
  await expect(page.getByText("Completed Nov 15, 2026", { exact: false })).toBeVisible();
});
