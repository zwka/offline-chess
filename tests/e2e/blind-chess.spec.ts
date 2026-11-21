import { expect, test, type Locator, type Page } from "@playwright/test";

async function tabToMainControl(page: Page) {
  await page.keyboard.press("Tab");
  // Existing Suite status can attach to the header or fall back to the footer,
  // depending on whether React has mounted when the shared script loads.
  const status = page.getByRole("button", { name: /Offline status:/ });
  if (await status.evaluate(element => element === document.activeElement)) {
    await page.keyboard.press("Tab");
  }
}

async function expectReadableFeedback(feedback: Locator) {
  const contrast = await feedback.evaluate((element) => {
    const luminance = (rgb: string) => {
      const channels = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(x => x / 255)
        .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
      return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    };
    const style = getComputedStyle(element);
    const ink = luminance(style.color);
    const surface = luminance(style.backgroundColor);
    return (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
}

function expectedSquareColorButtonName(coord: string): "Light" | "Dark" {
  const fileCode = coord.trim().charCodeAt(0) - "a".charCodeAt(0) + 1;
  const rank = Number.parseInt(coord.trim()[1] ?? "1", 10);
  return (fileCode + rank) % 2 === 0 ? "Dark" : "Light";
}

test.describe("Blind Chess Tool (/blind-chess/)", () => {
  for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
    for (const theme of ["light", "dark"] as const) {
      test(`all six drills prepare and start in ${theme} at ${viewport.width}px`, async ({ page }, testInfo) => {
        test.slow(); // Six complete drill journeys and their responsive screenshots.
        await page.setViewportSize(viewport);
        await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
        await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
        await page.addInitScript((value) => localStorage.setItem("offline-chess.theme.v1", value), theme);
        await page.goto("/blind-chess/");
        const brand = page.getByRole("link", { name: "Offline Chess", exact: true });
        await expect(brand).toHaveAttribute("href", "/");
        await expect(brand).toContainText("Offline Chess");
        for (const drill of ["Square Colors", "Same Color", "Coordinates", "Diagonals", "Quadrant", "Knight"]) {
          await page.getByRole("button", { name: new RegExp(drill) }).click();
          await expect(page.getByRole("heading", { name: drill, exact: true })).toBeVisible();
          await expect(page.getByRole("region", { name: "Drill instructions" })).toContainText("How to play");
          await page.clock.runFor(65_000);
          const start = page.getByRole("button", { name: "Start", exact: true });
          await expect(start).toBeVisible();
          await brand.focus();
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: "Exit", exact: true })).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(page.getByRole("button", { name: /Switch to .* mode/ })).toBeFocused();
          await tabToMainControl(page);
          await expect(start).toBeFocused();
          const target = await start.boundingBox();
          expect(target!.height).toBeGreaterThanOrEqual(44);
          if (drill === "Coordinates") await page.screenshot({ path: testInfo.outputPath("preparation.png"), fullPage: true });
          await start.click();
          await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
          await page.clock.runFor(65_000);
          await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
          if (drill === "Coordinates") {
            const square = page.getByRole("button", { name: "Select square a8", exact: true });
            await page.getByRole("button", { name: /Switch to .* mode/ }).focus();
            await tabToMainControl(page);
            await expect(square).toBeFocused();
            await page.keyboard.press("Enter");
          } else if (drill === "Square Colors") {
            const coord = (await page.locator(".coordinate").textContent())!;
            await page.getByRole("button", { name: expectedSquareColorButtonName(coord), exact: true }).click();
            const correct = page.getByRole("status").filter({ hasText: "Correct" });
            await expect(correct).toBeVisible();
            await expectReadableFeedback(correct);
            await page.clock.runFor(430);
            const next = (await page.locator(".coordinate").textContent())!;
            const incorrect = expectedSquareColorButtonName(next) === "Light" ? "Dark" : "Light";
            await page.getByRole("button", { name: incorrect, exact: true }).click();
            await expect(page.getByRole("status").filter({ hasText: "It is" })).toBeVisible();
          } else if (drill === "Quadrant") {
            await page.getByRole("button", { name: "Quadrant 1", exact: true }).click();
          } else {
            await page.keyboard.press("ArrowLeft");
          }
          const feedback = page.getByRole("status").filter({ hasText: /Correct|It is|They are|That square|They share|They do not|A knight/ });
          await expect(feedback).toBeVisible();
          await expectReadableFeedback(feedback);
          await page.screenshot({ path: testInfo.outputPath(`${drill.replaceAll(" ", "-")}-feedback.png`), fullPage: true });
          await page.clock.runFor(1_000);
          await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "59");
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          if (drill === "Square Colors") {
            await page.clock.runFor(59_000);
            await expect(page.getByRole("heading", { name: "Good work." })).toBeVisible();
            await expect(page.locator(".results-score strong")).toHaveText("1");
            await page.screenshot({ path: testInfo.outputPath("results.png"), fullPage: true });
            await page.getByRole("main").getByRole("button", { name: "History", exact: true }).click();
            await expect(page.getByRole("table", { name: "Completed Square Colors attempts" })).toBeVisible();
            await expect(page.getByRole("cell", { name: "2", exact: true })).toBeVisible();
            await page.screenshot({ path: testInfo.outputPath("history.png"), fullPage: true });
            await page.getByRole("button", { name: "Home", exact: true }).click();
          } else {
            await page.getByRole("button", { name: "Exit", exact: true }).click();
          }
        }
        await page.getByRole("button", { name: "History", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Attempt history" })).toBeVisible();
        await brand.focus();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole("heading", { name: "Offline Chess", exact: true })).toBeVisible();
      });
    }
  }
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
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#191c1c");

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
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f0e6");

    const blindToggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(blindToggleToDark).toBeVisible();
    await expect(blindToggleToDark).toHaveAttribute("aria-pressed", "false");

    // Toggle back to dark inside Blind Chess and return via browser back navigation
    await blindToggleToDark.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#191c1c");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("dark");

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#191c1c");
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toHaveAttribute("aria-pressed", "true");
  });

  test("completes a drill interaction and records score and personal best", async ({ page }) => {
    await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    await page.goto("/blind-chess/");

    await page.getByRole("button", { name: /Square Colors/i }).click();
    await expect(page.getByRole("heading", { name: "Square Colors", exact: true })).toBeVisible();
    await expect(page.getByText("The 60-second clock begins with your first answer, not Start.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Light", exact: true })).toHaveCount(0);
    await page.keyboard.press("ArrowRight");
    await page.clock.runFor(120_000);
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await expect(page.getByText("WHAT COLOR IS THIS SQUARE?")).toBeVisible();
    await expect(page.locator(".score-metric strong")).toHaveText("0");
    await page.clock.runFor(120_000);
    await expect(page.getByRole("progressbar", { name: "Time remaining" })).toHaveAttribute("aria-valuenow", "60");

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

    await page.clock.runFor(58_500);
    await expect(page.getByRole("progressbar", { name: "Time remaining" })).toHaveAttribute("aria-valuenow", "1");
    await page.clock.runFor(1_000);

    await expect(page.getByRole("heading", { name: "Good work.", level: 1 })).toBeVisible();
    await expect(page.locator(".results-score strong")).toHaveText("2");
    await page.getByRole("main").getByRole("button", { name: "History", exact: true }).click();
    await expect(page.getByRole("table", { name: "Completed Square Colors attempts" })).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(2);
    await page.reload();
    await page.getByRole("button", { name: "History", exact: true }).click();
    await expect(page.getByRole("row")).toHaveCount(2);

    // Return to Blind Chess hub and verify personal best and attempt count persisted
    await page.getByRole("button", { name: "Home", exact: true }).click();
    const squareColorsOption = page.getByRole("button", { name: /Square Colors/i });
    await expect(squareColorsOption).toContainText("2");
    await expect(squareColorsOption).toContainText("1");
  });
});
