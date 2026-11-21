import { expect, test } from "@playwright/test";

test.describe("Woodpecker Generator to Trainer Puzzle Set Handoff ('Do Puzzles')", () => {
  test("displays primary 'Do Puzzles' next to secondary 'Export JSON' and requires a non-empty Puzzle Set name", async ({ page }) => {
    await page.goto("/woodpecker-generator/");
    await expect(page.getByText("12 local records")).toBeVisible();

    await page.getByLabel("Set name").fill("Tactical Handoff");
    await page.getByLabel("Puzzles").fill("2");
    await page.getByRole("button", { name: /Generate puzzle set/i }).click();
    await expect(page.getByRole("status")).toContainText("2 puzzles selected from 6 matches.");

    const doPuzzlesButton = page.getByRole("button", { name: /Do Puzzles/i });
    const exportJsonButton = page.getByRole("button", { name: /Export JSON/i });

    await expect(doPuzzlesButton).toBeVisible();
    await expect(exportJsonButton).toBeVisible();
    await expect(doPuzzlesButton).toHaveClass(/primary-button/);
    await expect(exportJsonButton).toHaveClass(/secondary-button/);

    // Clearing the set name requires a non-empty name before proceeding with Do Puzzles or Export JSON
    await page.getByLabel("Set name").fill("   ");
    await doPuzzlesButton.click();
    await expect(page).toHaveURL(/\/woodpecker-generator\/$/);
    await expect(page.getByRole("status")).toContainText("Give the Puzzle Set a name");

    // Restoring a non-empty name updates the Puzzle Set name for handoff
    await page.getByLabel("Set name").fill("Renamed Handoff Set");
    await doPuzzlesButton.click();

    await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
    await expect(page.getByText("Renamed Handoff Set")).toBeVisible();
    await expect(page.getByText("Puzzle 01")).toBeVisible();
  });

  test("hands off a new Puzzle Set to Trainer on Puzzle 1 and resumes the active Run without duplication or abandonment when handed off again", async ({ page }) => {
    await page.goto("/woodpecker-generator/");
    await expect(page.getByText("12 local records")).toBeVisible();

    await page.getByLabel("Set name").fill("Woodpecker Cycle 1");
    await page.getByLabel("Puzzles").fill("2");
    await page.getByText("Advanced options", { exact: true }).click();
    await page.getByLabel("Random seed").fill("woodpecker-2026");
    await page.getByRole("button", { name: /Generate puzzle set/i }).click();
    await expect(page.getByRole("status")).toContainText("2 puzzles selected from 6 matches.");

    // Click "Do Puzzles" -> same-window navigation to /woodpecker-trainer/, active Run on Puzzle 1
    await page.getByRole("button", { name: /Do Puzzles/i }).click();
    await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
    await expect(page.getByText("Woodpecker Cycle 1")).toBeVisible();
    await expect(page.getByText("Puzzle 01")).toBeVisible();
    await expect(page.getByText("1 / 2")).toBeVisible();

    // Advance in the active Run (reveal solution -> Next puzzle -> now on Puzzle 02)
    await page.getByRole("button", { name: /Show solution/i }).click();
    await page.getByRole("button", { name: /Next puzzle/i }).click();
    await expect(page.getByText("Puzzle 02")).toBeVisible();
    await expect(page.getByText("2 / 2")).toBeVisible();

    // Navigate back to Woodpecker Generator in the same window
    await page.getByRole("link", { name: "Generator →" }).click();
    await expect(page).toHaveURL(/\/woodpecker-generator\/$/);

    // Resume the persisted output; opening Generator does not perform Handoff.
    await expect(page.getByRole("heading", { name: "Resume Generator activity?" })).toBeVisible();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByRole("region", { name: "Generated output" }).getByRole("heading", { name: "Woodpecker Cycle 1" })).toBeVisible();

    // Click "Do Puzzles" again -> resumes existing active Run on Puzzle 02
    await page.getByRole("button", { name: /Do Puzzles/i }).click();
    await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
    await expect(page.getByText("Puzzle 02")).toBeVisible();
    await expect(page.getByText("2 / 2")).toBeVisible();

    // Verify in Library that the Puzzle Set was not duplicated
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library" }).click();
    await expect(page.getByRole("heading", { name: "Woodpecker Cycle 1" })).toHaveCount(1);
    await expect(page.getByText(/Active \/ 2 of 2/i)).toBeVisible();

    // Verify in History that there is only 1 active Run and 0 abandoned Runs
    await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History" }).click();
    await expect(page.locator(".history-row")).toHaveCount(1);
    await expect(page.locator(".history-row")).toContainText("active");
    await expect(page.locator(".history-row")).not.toContainText("abandoned");
  });

  test("Handoff of restored output unarchives the original Puzzle Set and preserves its completed Run", async ({ page }) => {
    await page.goto("/woodpecker-generator/");
    await expect(page.getByText("12 local records")).toBeVisible();
    await page.getByLabel("Set name").fill("Archive Handoff");
    await page.getByLabel("Puzzles", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Generate puzzle set" }).click();
    await page.getByRole("button", { name: "Do Puzzles", exact: true }).click();
    await page.getByRole("button", { name: "Show solution", exact: true }).click();
    await page.getByRole("button", { name: "Next puzzle", exact: true }).click();
    const navigation = page.getByRole("navigation", { name: "Primary navigation" });
    await navigation.getByRole("button", { name: "Library", exact: true }).click();
    await page.getByRole("button", { name: "Archive Archive Handoff", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Archive Handoff", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Generator →" }).click();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.getByRole("button", { name: "Do Puzzles", exact: true }).click();
    await expect(page.getByText("Puzzle 01", { exact: true })).toBeVisible();
    await navigation.getByRole("button", { name: "Library", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Archive Handoff", exact: true })).toHaveCount(1);
    await navigation.getByRole("button", { name: "History", exact: true }).click();
    const history = page.getByRole("button").filter({ hasText: /Archive Handoff.*(?:active|completed)/ });
    await expect(history).toHaveCount(2);
    await expect(history.filter({ hasText: "completed" })).toHaveCount(1);
    await expect(history.filter({ hasText: "active" })).toHaveCount(1);
    await expect(history.filter({ hasText: "abandoned" })).toHaveCount(0);
  });
});
