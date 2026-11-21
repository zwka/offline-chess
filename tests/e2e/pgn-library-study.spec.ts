import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const pgn = `[Event "Library study"]
[Site "Local"]
[White "Ada"]
[Black "Boris"]
[Result "*"]

1. e4! {Center control} e5 (1... c5 2. Nf3) 2. Nf3 Nc6 *

[Event "Second game"]
[White "Clara"]
[Black "David"]
[Result "*"]

1. d4 d5 *
`;

for (const width of [390, 1440]) {
  for (const theme of ["light", "dark"]) {
    test(`Library and focused Study retain a variation at ${width}px in ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 960 });
      await page.addInitScript((value) => localStorage.setItem("offline-chess.theme.v1", value), theme);
      await page.goto("/pgn-reader/");
      await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
      await page.getByLabel("Choose PGN source").setInputFiles({ name: "study.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
      await expect(page.getByRole("button", { name: "Game 2, Clara versus David" })).toBeVisible();
      await page.getByLabel("Search metadata").fill("Ada");
      await expect(page.getByRole("button", { name: "Game 2, Clara versus David" })).toBeHidden();
      await page.screenshot({ path: `test-results/reader-library-${width}-${theme}.png`, fullPage: true });
      const game = page.getByRole("button", { name: "Game 1, Ada versus Boris" });
      await game.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Search metadata")).toBeHidden();
      await expect(page.getByLabel("Choose PGN source")).toBeHidden();
      if (width === 1440) {
        await page.getByRole("button", { name: "Forward", exact: true }).focus();
        await page.keyboard.press("Enter");
      } else {
        await page.getByRole("button", { name: "Forward", exact: true }).click();
      }
      await expect(page.getByText("Center control", { exact: true })).toBeVisible();
      await page.locator('.variation .mv').filter({ hasText: "c5" }).click();
      await expect(page.locator('[aria-current="step"]')).toContainText("c5");
      await page.getByRole("button", { name: "Back to Library", exact: true }).click();
      await expect(page.getByLabel("Search metadata")).toHaveValue("Ada");
      // Reader shortcuts must not change the hidden study while browsing.
      await page.getByRole("heading", { name: "Library", exact: true }).click();
      await page.keyboard.press("Home");
      await page.getByRole("button", { name: "Return to Study", exact: true }).click();
      await expect(page.locator('[aria-current="step"]')).toContainText("c5");
      await expect(page.locator('.sq[data-square="c5"] .piece')).toHaveAttribute("alt", "p");
      await page.getByText("Game tags", { exact: true }).click();
      await expect(page.getByRole("cell", { name: "Library study", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Raw PGN source", exact: true }).click();
      await expect(page.locator(".raw-source")).toContainText("e4! {Center control}");
      await page.screenshot({ path: `test-results/reader-study-${width}-${theme}.png`, fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const board = await page.getByRole("region", { name: "Chess board" }).boundingBox();
      expect(board!.width).toBeGreaterThan(width === 390 ? 280 : 430);
      if (width === 390) {
        const notation = await page.getByRole("region", { name: "Game notation" }).boundingBox();
        const tags = await page.getByText("Game tags", { exact: true }).boundingBox();
        expect(notation!.y).toBeLessThan(tags!.y);
      }
      await page.getByRole("region", { name: "Chess board" }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator('[aria-current="step"]')).toContainText("Nf3");
    });
  }
}

test("touch Library browsing preserves a study across sources and imports; warnings and original PGN remain readable", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 900 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "original.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from(pgn) });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).tap();
  await page.getByRole("button", { name: "Forward", exact: true }).tap();
  await page.getByRole("button", { name: "Forward", exact: true }).tap();
  await page.getByRole("button", { name: "Next variation", exact: true }).tap();
  await expect(page.locator('[aria-current="step"]')).toContainText("c5");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const name of ["Forward", "Back to Library", "Next variation"]) {
    const target = await page.getByRole("button", { name, exact: true }).boundingBox();
    expect(target!.width).toBeGreaterThanOrEqual(44);
    expect(target!.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole("button", { name: "Back to Library", exact: true }).tap();
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "warnings.pgn", mimeType: "application/x-chess-pgn", buffer: readFileSync("apps/pgn-reader/tests/fixtures/malformed_middle.pgn") });
  await expect(page.getByRole("button", { name: "Select warnings.pgn" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Select original.pgn" })).toBeVisible();
  await page.getByRole("button", { name: "Return to Study", exact: true }).tap();
  await expect(page.locator('[aria-current="step"]')).toContainText("c5");
  // Game navigation must follow the study's source, not the browsed source.
  await page.getByRole("button", { name: "Next game", exact: true }).tap();
  await expect(page.getByRole("heading", { name: "Clara - David" })).toBeVisible();
  await page.getByRole("button", { name: "Back to Library", exact: true }).tap();
  await page.getByRole("button", { name: "Select warnings.pgn" }).tap();
  await page.getByRole("button", { name: "Game 2, Second versus Bad" }).tap();
  await expect(page.getByRole("region", { name: "Parser warnings" })).toBeVisible();
  await page.getByRole("button", { name: "Raw PGN source", exact: true }).tap();
  await expect(page.locator(".raw-source")).toContainText("Zz9 xx7");
  await page.getByRole("button", { name: "Back to Library", exact: true }).tap();
  await page.reload();
  await expect(page.getByRole("button", { name: "Select original.pgn" })).toBeVisible();
  await page.getByRole("button", { name: "Select original.pgn" }).tap();
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).tap();
  await expect(page.getByRole("heading", { name: "Ada - Boris" })).toBeVisible();
  await expect(page.locator('.sq[data-square="e2"] .piece')).toHaveAttribute("src", /pieces\/wP.svg$/);
  await page.getByRole("link", { name: "Offline Chess", exact: true }).tap();
  await expect(page).toHaveURL(new URL("/", page.url()).href);
  await context.close();
});
