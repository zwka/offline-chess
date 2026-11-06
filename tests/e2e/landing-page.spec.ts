import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders header title, Suite favicon and Apple touch icon, and defaults to dark Theme on a fresh profile", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Offline Chess");
    await expect(page.getByRole("heading", { name: "Offline Chess", level: 1 })).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");

    const faviconHref = await page.locator('link[rel="icon"]').getAttribute("href");
    expect(faviconHref).toBe("/favicon-32.png");

    const expectedSuiteIcons = [
      "/favicon-32.png",
      "/apple-touch-icon.png",
      "/icon-192.png",
      "/icon-512.png",
      "/icon-maskable-512.png",
    ];
    for (const iconPath of expectedSuiteIcons) {
      const res = await page.request.get(iconPath);
      expect(res.status()).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }

    const appleTouchHref = await page.locator('link[rel="apple-touch-icon"]').getAttribute("href");
    expect(appleTouchHref).toBe("/apple-touch-icon.png");
  });

  test("toggles Theme between dark and light via header Sun/Moon button and persists under offline-chess.theme.v1 across reloads", async ({ page }) => {
    await page.goto("/");

    const toggleToLight = page.getByRole("button", { name: "Switch to light mode" });
    await expect(toggleToLight).toBeVisible();
    await expect(toggleToLight).toHaveAttribute("aria-pressed", "true");

    await toggleToLight.click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("light");

    const toggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(toggleToDark).toBeVisible();
    await expect(toggleToDark).toHaveAttribute("aria-pressed", "false");

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f4f0e7");
    await expect(page.getByRole("button", { name: "Switch to dark mode" })).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Switch to dark mode" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#172321");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("dark");

    // Verify invalid stored values fall back to dark
    await page.evaluate(() => window.localStorage.setItem("offline-chess.theme.v1", "system"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("renders four Tool cards in exact order with neon icons, titles, descriptions, and same-window subpath links", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator(".tool-card");
    await expect(cards).toHaveCount(4);

    const expectedTools = [
      {
        title: "Blind Chess",
        href: "/blind-chess/",
        iconSrc: "/icons/blind-chess.jpeg",
      },
      {
        title: "PGN Reader",
        href: "/pgn-reader/",
        iconSrc: "/icons/pgn-reader.jpeg",
      },
      {
        title: "Woodpecker Generator",
        href: "/woodpecker-generator/",
        iconSrc: "/icons/woodpecker.jpeg",
      },
      {
        title: "Woodpecker Trainer",
        href: "/woodpecker-trainer/",
        iconSrc: "/icons/woodpecker.jpeg",
      },
    ];

    for (let i = 0; i < expectedTools.length; i++) {
      const card = cards.nth(i);
      const expected = expectedTools[i];

      await expect(card.getByRole("heading", { name: expected.title, level: 2 })).toBeVisible();
      await expect(card).toHaveAttribute("href", expected.href);

      const target = await card.getAttribute("target");
      expect(target === null || target === "_self").toBe(true);

      const description = card.locator(".tool-description");
      await expect(description).toBeVisible();
      const descText = (await description.textContent())?.trim() ?? "";
      expect(descText.length).toBeGreaterThan(10);

      const img = card.locator("img.tool-icon");
      await expect(img).toBeVisible();
      await expect(img).toHaveAttribute("src", expected.iconSrc);

      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      expect(naturalWidth).toBeGreaterThan(0);
    }
  });
});
