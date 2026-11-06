import { expect, test } from "@playwright/test";

function expectedSquareColorButtonName(coord: string): "Light" | "Dark" {
  const fileCode = coord.trim().charCodeAt(0) - "a".charCodeAt(0) + 1;
  const rank = Number.parseInt(coord.trim()[1] ?? "1", 10);
  return (fileCode + rank) % 2 === 0 ? "Dark" : "Light";
}

test.describe("Blind Chess Tool (/blind-chess/)", () => {
  test("launches from the Landing Page, uses Suite icons, and has no standalone manifest or service worker", async ({ page }) => {
    await page.goto("/");

    const blindChessCard = page.locator(".tool-card", { hasText: "Blind Chess" });
    await expect(blindChessCard).toHaveAttribute("href", "/blind-chess/");
    await blindChessCard.click();

    await expect(page).toHaveURL(/\/blind-chess\/$/);
    await expect(page.getByRole("heading", { name: "Choose a drill", level: 1 })).toBeVisible();

    const expectedDrills = [
      "Square Colors",
      "Same Color",
      "Coordinates",
      "Diagonals",
      "Quadrant",
      "Knight",
    ];
    for (const drill of expectedDrills) {
      await expect(page.getByRole("button", { name: new RegExp(drill, "i") })).toBeVisible();
    }

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon-32.png");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Install/i })).toHaveCount(0);

    const registrations = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return [];
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map((r) => r.scope);
    });
    expect(registrations.filter((scope) => scope.includes("/blind-chess"))).toEqual([]);
  });

  test("defaults to dark Theme and syncs Theme changes in both directions with the Landing Page", async ({ page }) => {
    await page.goto("/blind-chess/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");

    // Ensure legacy 3-option radio fieldset is gone and Sun/Moon toggle button is present
    await expect(page.locator('fieldset.theme-control')).toHaveCount(0);
    const blindToggleToLight = page.getByRole("button", { name: "Switch to light mode" });
    await expect(blindToggleToLight).toBeVisible();
    await expect(blindToggleToLight).toHaveAttribute("aria-pressed", "true");

    // Navigate from Landing Page -> toggle to light -> launch Blind Chess
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("light");

    await page.locator(".tool-card", { hasText: "Blind Chess" }).click();
    await expect(page).toHaveURL(/\/blind-chess\/$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");

    const blindToggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(blindToggleToDark).toBeVisible();
    await expect(blindToggleToDark).toHaveAttribute("aria-pressed", "false");

    // Toggle back to dark inside Blind Chess and return via browser back navigation
    await blindToggleToDark.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("dark");

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toHaveAttribute("aria-pressed", "true");
  });

  test("completes a drill interaction and records score and personal best", async ({ page }) => {
    await page.clock.install();
    await page.goto("/blind-chess/");

    await page.getByRole("button", { name: /Square Colors/i }).click();
    await expect(page.getByText("WHAT COLOR IS THIS SQUARE?")).toBeVisible();
    await expect(page.locator(".score-metric strong")).toHaveText("0");

    const firstCoord = (await page.locator(".coordinate").textContent()) ?? "a1";
    const firstAnswer = expectedSquareColorButtonName(firstCoord);
    await page.getByRole("button", { name: firstAnswer, exact: true }).click();

    await expect(page.locator(".answer-feedback")).toContainText("Correct");
    await expect(page.locator(".score-metric strong")).toHaveText("1");

    // Advance past the 430ms feedback delay so the next square prompt appears
    await page.clock.runFor(500);

    const secondCoord = (await page.locator(".coordinate").textContent()) ?? "a1";
    const secondAnswer = expectedSquareColorButtonName(secondCoord);
    await page.getByRole("button", { name: secondAnswer, exact: true }).click();
    await expect(page.locator(".score-metric strong")).toHaveText("2");

    // Advance clock to finish the 60-second drill round
    await page.clock.runFor(60_000);

    await expect(page.getByRole("heading", { name: "Good work.", level: 1 })).toBeVisible();
    await expect(page.locator(".results-score strong")).toHaveText("2");

    // Return to Blind Chess hub and verify personal best and attempt count persisted
    await page.getByRole("main").getByRole("button", { name: "Home" }).click();
    const squareColorsOption = page.getByRole("button", { name: /Square Colors/i });
    await expect(squareColorsOption).toContainText("2");
    await expect(squareColorsOption).toContainText("1");
  });
});
