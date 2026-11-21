import { expect, test } from "@playwright/test";

test.describe("Landing Page", () => {
  test("gallery descriptions retain readable contrast including brass hover surfaces", async ({ page }) => {
    await page.goto("/");
    for (const theme of ["dark", "light"]) {
      if (theme === "light") await page.getByRole("button", { name: "Switch to light mode" }).click();
      const card = page.getByRole("link", { name: /Blind Chess/ });
      for (const hover of [false, true]) {
        if (hover) await card.hover();
        else await page.mouse.move(0, 0);
        const contrast = await card.locator("p").evaluate((description) => {
          const luminance = (rgb: string) => {
            const channels = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(x => x / 255)
              .map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
            return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
          };
          const ink = luminance(getComputedStyle(description).color);
          const surface = luminance(getComputedStyle(description.closest("a")!).backgroundColor);
          return (Math.max(ink, surface) + .05) / (Math.min(ink, surface) + .05);
        });
        expect(contrast, `${theme}, hover=${hover}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
  test("brand is a keyboard-accessible link back to the Landing Page", async ({ page }) => {
    await page.goto("/");
    const brand = page.getByRole("link", { name: "Offline Chess", exact: true });
    await expect(brand).toHaveAttribute("href", "/");
    await page.keyboard.press("Tab");
    await expect(brand).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/$/);
  });
  test("renders header title, Suite favicon and Apple touch icon, and defaults to dark Theme on a fresh profile", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Offline Chess");
    await expect(page.getByRole("heading", { name: "Offline Chess", level: 1 })).toBeVisible();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#191c1c");

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
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f0e6");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("light");

    const toggleToDark = page.getByRole("button", { name: "Switch to dark mode" });
    await expect(toggleToDark).toBeVisible();
    await expect(toggleToDark).toHaveAttribute("aria-pressed", "false");

    await page.reload();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#f5f0e6");
    await expect(page.getByRole("button", { name: "Switch to dark mode" })).toHaveAttribute("aria-pressed", "false");

    await page.getByRole("button", { name: "Switch to dark mode" }).click();

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#191c1c");
    expect(await page.evaluate(() => window.localStorage.getItem("offline-chess.theme.v1"))).toBe("dark");

    // Verify invalid stored values fall back to dark
    await page.evaluate(() => window.localStorage.setItem("offline-chess.theme.v1", "system"));
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("offers four independent Tools with task-specific identity assets and same-window links", async ({ page }) => {
    await page.goto("/");

    const cards = page.locator(".tool-card");
    await expect(cards).toHaveCount(4);

    const expectedTools = [
      {
        title: "Blind Chess",
        href: "/blind-chess/",
        iconSrc: "/identity/symbols.svg#blind-chess",
      },
      {
        title: "PGN Reader",
        href: "/pgn-reader/",
        iconSrc: "/identity/symbols.svg#pgn-reader",
      },
      {
        title: "Woodpecker Generator",
        href: "/woodpecker-generator/",
        iconSrc: "/identity/symbols.svg#woodpecker-generator",
      },
      {
        title: "Woodpecker Trainer",
        href: "/woodpecker-trainer/",
        iconSrc: "/identity/symbols.svg#woodpecker-trainer",
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

      await expect(card.locator("svg")).toBeVisible();
      await expect(card.locator("use")).toHaveAttribute("href", expected.iconSrc);
    }
    await expect(page.getByRole("button", { name: /Switch Tool/i })).toHaveCount(0);
    expect((await page.request.get("/identity/symbols.svg")).status()).toBe(200);
  });
});

for (const viewport of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 1440, height: 1000 }]) {
  for (const theme of ["dark", "light"]) {
    test(`gallery is usable at ${viewport.width}px in ${theme} Theme`, async ({ browser }, testInfo) => {
      const context = await browser.newContext({ viewport, hasTouch: viewport.width < 720 });
      const page = await context.newPage();
      await page.goto("/");
      if (theme === "light") await page.getByRole("button", { name: "Switch to light mode" }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach(`gallery-${viewport.width}-${theme}`, { body: await page.screenshot({ path: testInfo.outputPath(`gallery-${viewport.width}-${theme}.png`), fullPage: true }), contentType: "image/png" });

      // Brand, Theme, then every Tool: no hidden or redundant navigation stops.
      await page.getByRole("link", { name: "Offline Chess", exact: true }).focus();
      await page.keyboard.press("Tab");
      const toggle = page.getByRole("button", { name: /Switch to .* mode/ });
      await expect(toggle).toBeFocused();
      const toggleBox = await toggle.boundingBox();
      expect(toggleBox!.width).toBeGreaterThanOrEqual(44);
      expect(toggleBox!.height).toBeGreaterThanOrEqual(44);
      const names = ["Blind Chess", "PGN Reader", "Woodpecker Generator", "Woodpecker Trainer"];
      for (const name of names) {
        await page.keyboard.press("Tab");
        await expect(page.getByRole("link", { name: new RegExp(name) })).toBeFocused();
      }
      await testInfo.attach(`focus-${viewport.width}-${theme}`, { body: await page.screenshot({ path: testInfo.outputPath(`focus-${viewport.width}-${theme}.png`), fullPage: true }), contentType: "image/png" });
      for (const [name, path] of names.map((name, i) => [name, ["blind-chess", "pgn-reader", "woodpecker-generator", "woodpecker-trainer"][i]])) {
        const link = page.getByRole("link", { name: new RegExp(name) });
        if (viewport.width < 720) await link.tap();
        else { await link.focus(); await page.keyboard.press("Enter"); }
        await expect(page).toHaveURL(new RegExp(`/${path}/$`));
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await page.goto("/");
      }
      await context.close();
    });
  }
}
