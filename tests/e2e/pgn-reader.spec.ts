import { expect, test } from "@playwright/test";

test.describe("PGN Reader Tool (/pgn-reader/)", () => {
  test("navigates from the Landing Page to /pgn-reader/ with Suite icons and no standalone manifest or per-Tool service worker", async ({ page }) => {
    await page.goto("/");

    const pgnReaderCard = page.locator("a.tool-card", { hasText: "PGN Reader" });
    await expect(pgnReaderCard).toHaveAttribute("href", "/pgn-reader/");
    await pgnReaderCard.click();

    await expect(page).toHaveURL(/\/pgn-reader\/$/);
    await expect(page).toHaveTitle("PGN Reader Mobile");
    await expect(page.locator("#source-input")).toBeVisible();
    await expect(page.locator("#source-status")).toHaveText("idle");

    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", "/favicon-32.png");
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);

    const manifestRes = await page.request.get("/pgn-reader/manifest.webmanifest");
    expect(manifestRes.status()).toBe(404);

    const swRes = await page.request.get("/pgn-reader/service-worker.js");
    expect(swRes.status()).toBe(404);

    const registrations = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return [];
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.map((r) => r.scope);
    });
    expect(registrations).toEqual([]);
  });

  test("defaults to dark Theme, renders consistent Sun/Moon SVG button, and syncs Theme with Landing Page via offline-chess.theme.v1", async ({ page }) => {
    await page.goto("/pgn-reader/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");

    const toggleToLight = page.getByRole("button", { name: "Switch to light mode" });
    await expect(toggleToLight).toBeVisible();
    await expect(toggleToLight).toHaveAttribute("aria-pressed", "true");
    await expect(toggleToLight.locator("svg.theme-icon-sun")).toBeVisible();
    await expect(toggleToLight.locator("svg.theme-icon-moon")).toBeHidden();

    await toggleToLight.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("light");

    const toggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(toggleToDark).toBeVisible();
    await expect(toggleToDark).toHaveAttribute("aria-pressed", "false");
    await expect(toggleToDark.locator("svg.theme-icon-moon")).toBeVisible();
    await expect(toggleToDark.locator("svg.theme-icon-sun")).toBeHidden();

    // Navigate to Landing Page and verify light Theme is synced
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");

    // Toggle back to dark on Landing Page and navigate into PGN Reader
    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    await page.locator("a.tool-card", { hasText: "PGN Reader" }).click();
    await expect(page).toHaveURL(/\/pgn-reader\/$/);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
    await expect(page.getByRole("button", { name: "Switch to light mode" })).toHaveAttribute("aria-pressed", "true");
  });

  test("applies Suite palette tokens, Inter typography, Woodpecker chessboard square colors, and imports and steps through a PGN game", async ({ page }) => {
    await page.goto("/pgn-reader/");

    const darkStyles = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      const panel = document.getElementById("import-panel");
      const panelStyle = panel ? getComputedStyle(panel) : null;
      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        fontFamily: bodyStyle.fontFamily,
        panelBg: panelStyle?.backgroundColor ?? "",
        accent: rootStyle.getPropertyValue("--accent").trim(),
        sqLight: rootStyle.getPropertyValue("--sq-light").trim(),
        sqDark: rootStyle.getPropertyValue("--sq-dark").trim(),
      };
    });

    expect(darkStyles.bodyBg).toBe("rgb(23, 35, 33)");
    expect(darkStyles.bodyColor).toBe("rgb(237, 243, 237)");
    expect(darkStyles.panelBg).toBe("rgb(32, 47, 44)");
    expect(darkStyles.fontFamily).toMatch(/^Inter\b/i);
    expect(darkStyles.accent).toBe("#80c5b7");
    expect(darkStyles.sqLight).toBe("#e8d6bd");
    expect(darkStyles.sqDark).toBe("#9a6b4d");

    await page.getByRole("button", { name: "Switch to light mode" }).click();

    const lightStyles = await page.evaluate(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const bodyStyle = getComputedStyle(document.body);
      const panel = document.getElementById("import-panel");
      const panelStyle = panel ? getComputedStyle(panel) : null;
      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        panelBg: panelStyle?.backgroundColor ?? "",
        accent: rootStyle.getPropertyValue("--accent").trim(),
      };
    });

    expect(lightStyles.bodyBg).toBe("rgb(244, 240, 231)");
    expect(lightStyles.bodyColor).toBe("rgb(23, 35, 33)");
    expect(lightStyles.panelBg).toBe("rgb(251, 250, 247)");
    expect(lightStyles.accent).toBe("#2e625d");

    const samplePgn = [
      '[Event "Suite Study"]',
      '[Site "Offline Chess"]',
      '[Date "2026.05.01"]',
      '[Round "1"]',
      '[White "Kasparov"]',
      '[Black "Karpov"]',
      '[Result "1-0"]',
      "",
      "1. e4! { [%csl Ge4][%cal Ge2e4,Gf1c4] Center control } e5 (1... c5 2. Nf3) 2. Nf3 Nc6 1-0",
      "",
    ].join("\n");

    await page.locator("#source-input").setInputFiles({
      name: "suite-study.pgn",
      mimeType: "application/x-chess-pgn",
      buffer: Buffer.from(samplePgn),
    });

    await expect(page.locator("#source-status")).toHaveText("ready", { timeout: 10_000 });
    await expect(page.locator("#source-name")).toHaveText("suite-study.pgn");
    await expect(page.locator("#record-list .game-record")).toHaveCount(1);

    await page.locator("#record-list .game-record").first().click();
    await expect(page.locator("#reader-panel")).toBeVisible();
    await expect(page.locator(".reader-title")).toContainText("Kasparov - Karpov");

    // Verify chessboard square colors match Woodpecker Trainer (#e8d6bd and #9a6b4d)
    const squareColors = await page.evaluate(() => {
      const lightSq = document.querySelector(".board .sq.light");
      const darkSq = document.querySelector(".board .sq.dark");
      return {
        light: lightSq ? getComputedStyle(lightSq).backgroundColor : "",
        dark: darkSq ? getComputedStyle(darkSq).backgroundColor : "",
      };
    });
    expect(squareColors.light).toBe("rgb(232, 214, 189)");
    expect(squareColors.dark).toBe("rgb(154, 107, 77)");

    // Verify piece SVG loaded cleanly from /pgn-reader/pieces/
    const pieceImg = page.locator('.board .sq[data-square="e2"] .piece');
    await expect(pieceImg).toHaveAttribute("alt", "P");
    const pieceNaturalWidth = await pieceImg.evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(pieceNaturalWidth).toBeGreaterThan(0);

    // Step forward to 1. e4! and verify board annotations and piece movement
    await page.locator('[data-action="forward"]').click();
    await expect(page.locator(".notation-body .mv.current")).toContainText("e4");
    await expect(page.locator('.board .sq[data-square="e4"] .piece')).toHaveAttribute("alt", "P");
    await expect(page.locator('.board .sq[data-square="e4"] .csl')).toHaveCount(1);
    await expect(page.locator(".board-arrows line")).toHaveCount(2);

    // Select variation move 1... c5
    await page.locator(".variation .mv").filter({ hasText: "c5" }).first().click();
    await expect(page.locator(".notation-body .mv.current")).toContainText("c5");
    await expect(page.locator('.board .sq[data-square="c5"] .piece')).toHaveAttribute("alt", "p");
  });
});
