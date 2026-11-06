import { expect, test } from "@playwright/test";

test.describe("Woodpecker Generator and Trainer in Suite", () => {
  test("launches Generator and Trainer from the Landing Page, resolves subpath assets, uses Suite icons, and exposes no standalone manifest or service worker", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /Woodpecker Generator/i }).click();
    await expect(page).toHaveURL(/\/woodpecker-generator\/$/);
    await expect(page).toHaveTitle("Woodpecker Generator");
    await expect(page.getByText("12 local records")).toBeVisible();

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon-32.png");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);

    const generatorManifestRes = await page.request.get("/woodpecker-generator/manifest.webmanifest");
    expect(generatorManifestRes.status()).toBe(404);
    const generatorSwRes = await page.request.get("/woodpecker-generator/sw.js");
    expect(generatorSwRes.status()).toBe(404);

    // Verify Generator can read the sample puzzle index from /woodpecker-generator/puzzle-index.jsonl
    await page.getByLabel("Puzzles").fill("4");
    await page.getByRole("button", { name: /Generate puzzle set/i }).click();
    await expect(page.getByRole("status")).toContainText("4 puzzles selected from 6 matches.");

    // Return to Landing Page and launch Woodpecker Trainer
    await page.goto("/");
    await page.getByRole("link", { name: /Woodpecker Trainer/i }).click();
    await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
    await expect(page).toHaveTitle("Woodpecker Trainer");
    await expect(page.getByRole("heading", { name: "Warm-up tactics" })).toBeVisible();

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon-32.png");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);

    const trainerManifestRes = await page.request.get("/woodpecker-trainer/manifest.webmanifest");
    expect(trainerManifestRes.status()).toBe(404);
    const trainerSwRes = await page.request.get("/woodpecker-trainer/sw.js");
    expect(trainerSwRes.status()).toBe(404);
  });

  test("renders always-visible Trainer → and Generator → header cross-links on desktop and mobile that navigate in the same window", async ({ page }) => {
    await page.goto("/woodpecker-generator/");

    const trainerLink = page.getByRole("link", { name: "Trainer →" });
    await expect(trainerLink).toBeVisible();
    await expect(trainerLink).toHaveAttribute("href", "/woodpecker-trainer/");
    const trainerTarget = await trainerLink.getAttribute("target");
    expect(trainerTarget === null || trainerTarget === "_self").toBe(true);

    // Verify link stays visible on mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(trainerLink).toBeVisible();

    await trainerLink.click();
    await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
    await expect(page).toHaveTitle("Woodpecker Trainer");

    const generatorLink = page.getByRole("link", { name: "Generator →" });
    await expect(generatorLink).toBeVisible();
    await expect(generatorLink).toHaveAttribute("href", "/woodpecker-generator/");
    const generatorTarget = await generatorLink.getAttribute("target");
    expect(generatorTarget === null || generatorTarget === "_self").toBe(true);

    await generatorLink.click();
    await expect(page).toHaveURL(/\/woodpecker-generator\/$/);
    await expect(page).toHaveTitle("Woodpecker Generator");
  });

  test("shares two-state dark-default Suite Theme (offline-chess.theme.v1) with Sun/Moon toggle across Landing Page, Generator, and Trainer", async ({ page }) => {
    await page.goto("/woodpecker-generator/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
    await expect(page.locator('select[aria-label="Color theme"]')).toHaveCount(0);

    const generatorToggleToLight = page.getByRole("button", { name: "Switch to light mode" });
    await expect(generatorToggleToLight).toBeVisible();
    await expect(generatorToggleToLight).toHaveAttribute("aria-pressed", "true");

    await generatorToggleToLight.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("light");

    const generatorToggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(generatorToggleToDark).toBeVisible();
    await expect(generatorToggleToDark).toHaveAttribute("aria-pressed", "false");

    // Navigate to Trainer via cross-link and verify light Theme is preserved
    await page.getByRole("link", { name: "Trainer →" }).click();
    await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");
    await expect(page.locator('select[aria-label="Color theme"]')).toHaveCount(0);

    const trainerToggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(trainerToggleToDark).toBeVisible();
    await expect(trainerToggleToDark).toHaveAttribute("aria-pressed", "false");

    // Toggle back to dark in Trainer
    await trainerToggleToDark.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("dark");
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toHaveAttribute("aria-pressed", "true");

    // Verify Landing Page also reflects dark Theme, then toggle to light on Landing Page and check Trainer
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    await page.getByRole("link", { name: /Woodpecker Trainer/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");

    // Invalid stored value ("system") falls back to dark in both Trainer and Generator
    await page.evaluate(() => window.localStorage.setItem("offline-chess.theme.v1", "system"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");

    await page.getByRole("link", { name: "Generator →" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
  });
});
