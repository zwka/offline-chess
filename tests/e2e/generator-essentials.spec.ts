import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

// Exercise real streaming selection against the small, checked-in index even if
// a developer has built the optional production index locally.
test.beforeEach(async ({ page }) => {
  await page.route("**/puzzle-index.generated*", (route) => route.fulfill({ status: 404, body: "Not found" }));
  for (const name of ["puzzle-index-manifest.json", "puzzle-index.jsonl"]) {
    const body = await readFile(new URL(`../../apps/woodpecker/apps/generator/public/${name}`, import.meta.url), "utf8");
    await page.route(`**/${name}`, (route) => route.fulfill({ body, contentType: name.endsWith(".jsonl") ? "application/x-ndjson" : "application/json" }));
  }
});

async function exportSet(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  const file = await download;
  return JSON.parse(await readFile((await file.path())!, "utf8"));
}

test("generation and output actions explain invalid input without losing the generated Puzzle Set", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await expect(page.getByText("12 local records")).toBeVisible();
  await page.getByLabel("Puzzles", { exact: true }).fill("2");
  await page.getByLabel("Set name").fill(" ");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("Give the Puzzle Set a name");
  await expect(page.getByRole("status")).toBeFocused();
  await page.getByLabel("Set name").fill("Recovered set");
  await page.getByLabel("Minimum").fill("1700");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("minimum rating");
  await page.getByLabel("Minimum").fill("1100");
  await page.getByLabel("Puzzles", { exact: true }).fill("100");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("Only 6 puzzles match");
  await page.getByLabel("Puzzles", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("2 puzzles selected");
  await page.getByLabel("Set name").fill(" ");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await expect(page.getByRole("status")).toContainText("Give the Puzzle Set a name");
  await expect(page.getByRole("status")).toBeInViewport();
  await page.getByRole("button", { name: "Do Puzzles" }).click();
  await expect(page).toHaveURL(/\/woodpecker-generator\/$/);
  await page.getByLabel("Set name").fill("Renamed export");
  expect((await exportSet(page)).name).toBe("Renamed export");
});

test("Advanced options retain seed and matching semantics through disclosure and reproducible JSON export", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await expect(page.getByText("12 local records")).toBeVisible();
  await expect(page.getByLabel("Random seed")).not.toBeVisible();
  await expect(page.getByRole("group", { name: "Theme matching" })).not.toBeVisible();
  await page.getByLabel("Set name").fill("Essentials fixture");
  await page.getByLabel("Puzzles", { exact: true }).fill("1");
  await page.getByText("Mate", { exact: true }).click();
  const advanced = page.getByText("Advanced options", { exact: true });
  await advanced.click();
  await page.getByLabel("Random seed").fill("ticket-09");
  await expect(page.getByRole("button", { name: "All selected" })).toHaveAttribute("aria-pressed", "true");
  await advanced.click();
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("1 puzzles selected from 1 matches.");
  const all = await exportSet(page);
  expect(all.puzzles.map((p: { id: string }) => p.id)).toEqual(["000Zo"]);
  expect(all.selection).toMatchObject({ seed: "ticket-09", themeMatch: "all", themes: ["short", "mate"] });
  await advanced.click();
  await expect(page.getByLabel("Random seed")).toHaveValue("ticket-09");
  await page.getByRole("button", { name: "Any selected" }).click();
  await advanced.click();
  await advanced.click();
  await expect(page.getByRole("button", { name: "Any selected" })).toHaveAttribute("aria-pressed", "true");
  await advanced.click();
  await page.getByLabel("Puzzles", { exact: true }).fill("7");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("7 puzzles selected from 7 matches.");
  const any = await exportSet(page);
  expect(any.selection.themeMatch).toBe("any");
  expect(any.puzzles.map((p: { id: string }) => p.id).sort()).toEqual(["0000D", "0000H", "0008Q", "000Pw", "000Sa", "000Zo", "000aY"]);
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("7 puzzles selected");
  const repeated = await exportSet(page);
  expect(repeated.puzzles).toEqual(any.puzzles);
  expect(repeated.contentHash).toBe(any.contentHash);
});

for (const theme of ["dark", "light"]) {
  for (const width of [320, 390, 1440]) {
    test(`output is reachable after long filters at ${width}px in ${theme} Theme`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript((theme) => localStorage.setItem("offline-chess.theme.v1", theme), theme);
      await page.goto("/woodpecker-generator/");
      await expect(page.getByText("12 local records")).toBeVisible();
      await expect(page.getByRole("link", { name: "Offline Chess", exact: true })).toHaveAttribute("href", "/");
      await page.getByLabel("Puzzles", { exact: true }).fill("2");
      await page.getByRole("button", { name: "Generate puzzle set" }).click();
      const output = page.getByRole("region", { name: "Generated output" });
      await expect(output.getByRole("heading", { level: 2 })).toBeFocused();
      await expect(output.getByText("Puzzle Set ready", { exact: true })).toBeInViewport();
      await expect(output.getByRole("button", { name: "Do Puzzles" })).toBeInViewport();
      await expect(output.getByRole("button", { name: "Export JSON" })).toBeInViewport();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const set = await exportSet(page);
      expect(set.puzzles).toHaveLength(2);
      await page.screenshot({ path: testInfo.outputPath(`output-${theme}-${width}.png`) });
      await page.getByRole("link", { name: "Back to filters" }).click();
      await expect(page.getByLabel("Set name")).toBeInViewport();
      const short = page.getByRole("checkbox", { name: "Short", exact: true });
      await short.focus();
      await page.keyboard.press("Space");
      await expect(short).not.toBeChecked();
      await page.keyboard.press("Space");
      await expect(short).toBeChecked();
      const advanced = page.getByText("Advanced options", { exact: true });
      await advanced.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Random seed")).toBeVisible();
      for (const control of [page.getByLabel("Set name"), page.getByLabel("Puzzles", { exact: true }), page.getByRole("button", { name: "Any selected" }), page.getByRole("button", { name: "Create a new seed" })]) {
        const box = await control.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.width).toBeGreaterThanOrEqual(44);
      }
    });
  }
}
