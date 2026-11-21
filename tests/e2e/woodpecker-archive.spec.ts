import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

if (process.env.CHROME_BIN) {
  test.use({ launchOptions: { executablePath: process.env.CHROME_BIN } });
}

const trainer = "/woodpecker-trainer/";
const archivedView = (page: Page) => page.getByRole("button", { name: "Archived Puzzle Sets", exact: true });
const library = (page: Page) => page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library", exact: true });

async function exportedBackup(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup", exact: true }).click();
  const path = await (await download).path();
  return JSON.parse(await readFile(path!, "utf8"));
}

test("discovers and restores a never-played archived set offline after reload", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto(trainer);
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await archivedView(page).click();
  await expect(page.getByRole("heading", { name: "No Archived Puzzle Sets" })).toBeVisible();
  await library(page).click();
  await page.getByRole("button", { name: "Archive Warm-up tactics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toHaveCount(0);

  await context.setOffline(true);
  await page.reload();
  await archivedView(page).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await expect(page.getByText("Never played", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Restore Warm-up tactics", exact: true }).click();
  await expect(page.getByText("Puzzle Set restored to the Library. Its Runs and scores are unchanged.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No Archived Puzzle Sets" })).toBeVisible();
  await library(page).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toHaveCount(1);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toHaveCount(1);
  await page.getByRole("navigation").getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Runs yet" })).toBeVisible();
});

test("restores original identity and every Run from an existing backup without changing results or deletion", async ({ page }) => {
  await page.goto(trainer);
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  // Build a legacy-compatible backup using the shipped deterministic Puzzle Set.
  const set = JSON.parse(await readFile("apps/woodpecker/apps/trainer/public/demo-set.json", "utf8"));
  const timestamp = "2026-10-01T10:00:00.000Z";
  const runs = ["completed", "abandoned", "active"].map((status, index) => ({
    kind: "run", schemaVersion: 2, id: `archive-run-${status}`, setId: set.id,
    status, startedAt: timestamp, updatedAt: timestamp, activeTimeMs: 12345 + index,
    currentPuzzleIndex: status === "active" ? 0 : null,
    currentPuzzle: status === "active" ? { kind: "playing", moveIndex: 1, retryCount: 0 } : null,
    ...(status === "active" ? {} : { endedAt: timestamp }),
    results: set.puzzles.map((puzzle: { id: string }, puzzleIndex: number) => status === "completed"
      ? puzzleIndex === 0
        ? { puzzleId: puzzle.id, status: "first-try-solved", errorCount: 0, retryCount: 0, completedAt: timestamp }
        : { puzzleId: puzzle.id, status: "failed", completion: "skipped", errorCount: 1, retryCount: 0, completedAt: timestamp }
      : { puzzleId: puzzle.id, status: "pending", errorCount: 0, retryCount: 0 }),
  }));
  await page.getByRole("button", { name: "Restore backup", exact: true }).click();
  await page.locator('input[type="file"]').nth(1).setInputFiles({
    name: "archived-backup.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ kind: "trainer-backup", schemaVersion: 2, exportedAt: timestamp, puzzleSets: [{ set, archived: true }], runs })),
  });
  await expect(page.getByText("Backup merged with local sets and Run history.")).toBeVisible();
  const before = await exportedBackup(page);
  await archivedView(page).click();
  await page.getByRole("button", { name: "Restore Warm-up tactics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Archived Puzzle Sets" })).toBeVisible();
  const after = await exportedBackup(page);
  expect(after.puzzleSets).toEqual(before.puzzleSets.map((record: object) => ({ ...record, archived: false })));
  expect(after.runs).toEqual(before.runs);
  expect(after.runs).toHaveLength(3);
  await library(page).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.getByRole("navigation").getByRole("button", { name: "History", exact: true }).click();
  await page.getByRole("button").filter({ hasText: /Warm-up tactics.*completed/ }).click();
  await expect(page.getByText("First-try solve", { exact: true })).toBeVisible();
  await library(page).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete set and history", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete set and history", exact: true }).click();
  await expect(page.getByText("Puzzle Set and its history were deleted.")).toBeVisible();
  const deleted = await exportedBackup(page);
  expect(deleted.puzzleSets).toEqual([]);
  expect(deleted.runs).toEqual([]);
});

test("failed restoration stays archived, reports failure, and can be retried", async ({ page }) => {
  await page.goto(trainer);
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.getByRole("button", { name: "Archive Warm-up tactics", exact: true }).click();
  await archivedView(page).click();
  // Abort the real browser's next write transaction, rather than mocking app functions.
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<typeof transaction>) {
      const tx = transaction.apply(this, args);
      if (args[1] === "readwrite") {
        IDBDatabase.prototype.transaction = transaction;
        queueMicrotask(() => tx.abort());
      }
      return tx;
    };
  });
  await page.getByRole("button", { name: "Restore Warm-up tactics", exact: true }).click();
  await expect(page.getByText("The Puzzle Set could not be restored locally. It remains archived. Please try again.")).toBeVisible();
  await expect(page.getByText("Puzzle Set restored to the Library. Its Runs and scores are unchanged.")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Restore Warm-up tactics", exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toHaveCount(0);
  await archivedView(page).click();
  await page.getByRole("button", { name: "Restore Warm-up tactics", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Archived Puzzle Sets" })).toBeVisible();
  await library(page).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
});

test("archive controls work on a phone in both Themes and keep deletion explicitly confirmed", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(trainer);
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();
  await page.getByRole("button", { name: "Archive Warm-up tactics", exact: true }).click();
  await archivedView(page).click();
  const restore = page.getByRole("button", { name: "Restore Warm-up tactics", exact: true });
  await expect(restore).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("archive-phone-dark.png"), fullPage: true });
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.getByRole("button", { name: "Switch to dark mode" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("archive-phone-light.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await restore.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "No Archived Puzzle Sets" })).toBeVisible();
  await library(page).click();
  await page.getByRole("button", { name: "Archive Warm-up tactics", exact: true }).click();
  await archivedView(page).click();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toBe("Delete this Puzzle Set and every Run attached to it? This cannot be undone.");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Delete set and history", exact: true }).click();
  await expect(restore).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete set and history", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No Archived Puzzle Sets" })).toBeVisible();
  await library(page).click();
  await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toHaveCount(0);
});
