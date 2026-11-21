import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const tools = [
  ["Blind Chess", "/blind-chess/"],
  ["PGN Reader", "/pgn-reader/"],
  ["Woodpecker Generator", "/woodpecker-generator/"],
  ["Woodpecker Trainer", "/woodpecker-trainer/"],
] as const;

async function switchTool(page: Page, name: string) {
  await page.getByRole("button", { name: "Switch Tool", exact: true }).click();
  await page.getByRole("navigation", { name: "Switch Tool" }).getByRole("link", { name, exact: true }).click();
}

async function downloadJson(page: Page, name: string) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  return JSON.parse(await readFile((await (await pending).path())!, "utf8"));
}

test("every Tool offers the same four destinations, active indication and keyboard dismissal; Landing Page has no switcher", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Switch Tool", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: /Blind Chess/ }).click();
  for (const [name, path] of tools) {
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    const toggle = page.getByRole("button", { name: "Switch Tool", exact: true });
    await toggle.focus();
    await page.keyboard.press("Enter");
    const navigation = page.getByRole("navigation", { name: "Switch Tool" });
    await expect(navigation.getByRole("link")).toHaveCount(4);
    await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
    await page.keyboard.press("Tab");
    await expect(navigation.getByRole("link").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(navigation).toBeHidden();
    await expect(toggle).toBeFocused();
    const next = tools[(tools.findIndex(tool => tool[0] === name) + 1) % tools.length];
    await switchTool(page, next[0]);
  }
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Switch Tool", exact: true })).toHaveCount(0);
});

test("Reader refuses switcher and brand navigation when the latest study cannot be saved, then retries safely", async ({ page }) => {
  await page.goto("/pgn-reader/");
  await page.getByLabel("Choose PGN source").setInputFiles({ name: "safe.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from('[White "Ada"]\n[Black "Boris"]\n\n1. e4 e5 *') });
  await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "offline-chess.reader.normal-study.v1") throw new DOMException("Full", "QuotaExceededError");
      write.call(this, key, value);
    };
    document.addEventListener("restore-storage", () => { Storage.prototype.setItem = write; });
  });
  await page.getByRole("button", { name: "Forward", exact: true }).click();
  await switchTool(page, "Woodpecker Trainer");
  await expect(page).toHaveURL(/\/pgn-reader\/$/);
  await expect(page.getByRole("region", { name: "Saved study" })).toContainText("Could not save");
  await expect(page.locator('[aria-current="step"]')).toContainText("e5");
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page).toHaveURL(/\/pgn-reader\/$/);
  await page.evaluate(() => document.dispatchEvent(new Event("restore-storage")));
  await switchTool(page, "Woodpecker Trainer");
  await expect(page).toHaveURL(/\/woodpecker-trainer\/$/);
  await switchTool(page, "PGN Reader");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.locator('[aria-current="step"]')).toContainText("e5");
});

test("choosing the current Tool dismisses without reloading or interrupting a running Blind Chess round", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01") });
  await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
  await page.goto("/blind-chess/");
  await page.getByRole("button", { name: /Square Colors/ }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.clock.runFor(12_345);
  const prompt = await page.getByRole("region", { name: "Square color question" }).textContent();
  await switchTool(page, "Blind Chess");
  await expect(page.getByRole("navigation", { name: "Switch Tool" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Switch Tool", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Square color question" })).toHaveText(prompt!);
  await page.clock.runFor(1_000);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "47");
});

test("offline four-Tool round trips and browser reopening retain exact studies, output, Run and paused round", async ({ playwright, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const profile = testInfo.outputPath("four-tool-profile");
  let context = await playwright.chromium.launchPersistentContext(profile, { baseURL });
  try {
    let page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Offline status: Tools ready", exact: true })).toBeVisible();
    await context.setOffline(true);
    await page.clock.install({ time: new Date("2026-01-01") });
    await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
    await page.getByRole("link", { name: /PGN Reader/ }).click();
    await page.getByLabel("Choose PGN source").setInputFiles({ name: "nested.pgn", mimeType: "application/x-chess-pgn", buffer: Buffer.from('[White "Ada"]\n[Black "Boris"]\n\n1. e4 e5 (1... c5 2. Nf3 (2. Nc3 Nc6 (2... d6 {Nested destination}))) 2. Nf3 *') });
    await page.getByRole("button", { name: "Game 1, Ada versus Boris" }).click();
    await expect(page.locator(".notation-body")).toBeVisible();
    for (const toggle of await page.locator(".collapsed > .var-toggle").all()) await toggle.click();
    await page.locator(".mv").filter({ hasText: "d6" }).click();
    await page.getByRole("button", { name: "Flip", exact: true }).click();
    await switchTool(page, "Woodpecker Generator");
    await page.getByLabel("Set name").fill("Four Tool tactics");
    await page.getByLabel("Minimum").fill("1000");
    await page.getByLabel("Maximum").fill("1700");
    await page.getByLabel("Puzzles", { exact: true }).fill("2");
    await page.getByText("Mate", { exact: true }).click();
    await page.getByText("Advanced options", { exact: true }).click();
    await page.getByLabel("Random seed").fill("roundtrip-13");
    await page.getByRole("button", { name: "Any selected" }).click();
    await page.getByRole("button", { name: "Generate puzzle set" }).click();
    await expect(page.getByRole("status")).toContainText("2 puzzles selected");
    const generated = await downloadJson(page, "Export JSON");
    // Ordinary switching is not the explicit Generator Handoff.
    await switchTool(page, "Woodpecker Trainer");
    await expect(page.getByRole("button", { name: "Show solution" })).toHaveCount(0);
    await page.getByRole("button", { name: "Start new Run" }).click();
    await page.getByRole("button", { name: "Show solution", exact: true }).click();
    await page.getByRole("button", { name: "Next puzzle", exact: true }).click();
    await page.locator('[data-square="f5"]').click();
    await page.locator('[data-square="e5"]').click();
    await page.clock.runFor(5_500);
    await expect(page.locator('[data-square="f1"] [data-piece="wK"]')).toBeVisible();
    await switchTool(page, "Blind Chess");
    await page.getByRole("button", { name: /Square Colors/ }).click();
    await page.getByRole("button", { name: "Start", exact: true }).click();
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await page.clock.runFor(12_345);
    const prompt = await page.getByRole("region", { name: "Square color question" }).textContent();
    await switchTool(page, "PGN Reader");
    await page.clock.runFor(120_000);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText("d6");
    await expect(page.getByText("Nested destination", { exact: true })).toBeVisible();
    await expect(page.locator(".board .sq").first()).toHaveAttribute("data-square", "h1");
    await switchTool(page, "Woodpecker Generator");
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByLabel("Set name")).toHaveValue("Four Tool tactics");
    await expect(page.getByLabel("Minimum")).toHaveValue("1000");
    await expect(page.getByLabel("Maximum")).toHaveValue("1700");
    await expect(page.getByRole("checkbox", { name: "Mate", exact: true })).toBeChecked();
    await page.getByText("Advanced options", { exact: true }).click();
    await expect(page.getByLabel("Random seed")).toHaveValue("roundtrip-13");
    await expect(page.getByRole("button", { name: "Any selected" })).toHaveAttribute("aria-pressed", "true");
    expect(await downloadJson(page, "Export JSON")).toEqual(generated);
    await switchTool(page, "Woodpecker Trainer");
    await expect(page.getByText(/Timing stays paused/)).toBeVisible();
    const before = await downloadJson(page, "Export backup");
    expect(before.runs).toHaveLength(1);
    expect(before.runs[0].activeTimeMs).toBe(5_500);
    await page.clock.fastForward(86_400_000);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByText("Puzzle 02")).toBeVisible();
    await expect(page.locator('[data-square="e5"] [data-piece="bR"]')).toBeVisible();
    await expect(page.locator('[data-square="f1"] [data-piece="wK"]')).toBeVisible();
    await switchTool(page, "Blind Chess");
    await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("47.7 seconds");
    await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("1 answered");
    await page.clock.fastForward(86_400_000);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByRole("region", { name: "Square color question" })).toHaveText(prompt!);
    await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Offline Chess", exact: true })).toBeVisible();
    await context.close();
    context = await playwright.chromium.launchPersistentContext(profile, { baseURL });
    page = await context.newPage();
    await page.clock.install({ time: new Date("2026-02-01") });
    await page.clock.pauseAt(new Date("2026-02-01T00:00:01Z"));
    await page.goto("/blind-chess/");
    await page.clock.fastForward(86_400_000);
    await expect(page.getByRole("region", { name: "Saved activity" })).toContainText("47.7 seconds");
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByRole("region", { name: "Square color question" })).toHaveText(prompt!);
    await switchTool(page, "PGN Reader");
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.locator('[aria-current="step"]')).toContainText("d6");
    await expect(page.locator(".board .sq").first()).toHaveAttribute("data-square", "h1");
    await switchTool(page, "Woodpecker Generator");
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    expect(await downloadJson(page, "Export JSON")).toEqual(generated);
    await switchTool(page, "Woodpecker Trainer");
    await page.clock.fastForward(86_400_000);
    expect((await downloadJson(page, "Export backup")).runs).toEqual(before.runs);
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByText("Puzzle 02")).toBeVisible();
    await expect(page.locator('[data-square="e5"] [data-piece="bR"]')).toBeVisible();
  } finally { await context.close(); }
});

for (const tool of ["Blind Chess", "Woodpecker Generator", "Woodpecker Trainer"]) {
  for (const departure of ["switcher", "brand"]) {
  test(`${tool} failed checkpoint keeps ${departure} departure on the page`, async ({ page }) => {
    const path = tools.find(([name]) => name === tool)![1];
    await page.goto(path);
    if (tool === "Blind Chess") {
      await page.getByRole("button", { name: /Square Colors/ }).click();
      await page.getByRole("button", { name: "Start", exact: true }).click();
    } else if (tool === "Woodpecker Generator") {
      await page.getByLabel("Set name").fill("Keep latest filters");
    } else {
      await page.getByRole("button", { name: "Start new Run" }).click();
      await expect(page.getByText("Puzzle 01")).toBeVisible();
    }
    await page.evaluate(tool => {
      const write = Storage.prototype.setItem;
      const put = IDBObjectStore.prototype.put;
      const key = tool === "Blind Chess" ? "offline-blind-chess.activity.v1" : "offline-chess.generator.activity.v1";
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException("Full", "QuotaExceededError");
        write.call(this, name, value);
      };
      if (tool === "Woodpecker Trainer") IDBObjectStore.prototype.put = function () { throw new DOMException("Full", "QuotaExceededError"); };
      document.addEventListener("restore-storage", () => { Storage.prototype.setItem = write; IDBObjectStore.prototype.put = put; });
    }, tool);
    if (tool === "Woodpecker Generator") await page.getByLabel("Set name").fill("Unsaved latest filters");
    if (departure === "switcher") await switchTool(page, "PGN Reader");
    else await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByText(/could not be saved/i).first()).toBeVisible();
    await page.evaluate(() => document.dispatchEvent(new Event("restore-storage")));
    await switchTool(page, "PGN Reader");
    await expect(page).toHaveURL(/\/pgn-reader\/$/);
    await switchTool(page, tool);
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    if (tool === "Woodpecker Generator") await expect(page.getByLabel("Set name")).toHaveValue("Unsaved latest filters");
    if (tool === "Woodpecker Trainer") await expect(page.getByText("Puzzle 01")).toBeVisible();
    if (tool === "Blind Chess") await expect(page.getByRole("region", { name: "Square color question" })).toBeVisible();
  });
  }
}

test.describe("compact keyboard and touch navigation", () => {
  test.use({ hasTouch: true });
  for (const width of [320, 1440]) {
    for (const theme of ["light", "dark"]) {
      test(`all four headers in ${theme} at ${width}px`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(theme => localStorage.setItem("offline-chess.theme.v1", theme), theme);
        await page.goto("/blind-chess/");
        for (const [index, [name]] of tools.entries()) {
          const toggle = page.getByRole("button", { name: "Switch Tool", exact: true });
          await toggle.tap();
          const navigation = page.getByRole("navigation", { name: "Switch Tool" });
          await expect(navigation.getByRole("link", { name, exact: true })).toHaveAttribute("aria-current", "page");
          for (const target of [toggle, ...await navigation.getByRole("link").all()]) {
            const box = (await target.boundingBox())!;
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
            expect(box.x).toBeGreaterThanOrEqual(0);
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            await expect(target).toBeInViewport();
          }
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          await page.screenshot({ path: testInfo.outputPath(`${index}-${theme}-${width}.png`), fullPage: true });
          await page.locator("main").tap({ position: { x: 5, y: 5 } });
          await expect(navigation).toBeHidden();
          await toggle.focus();
          await page.keyboard.press("Enter");
          for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
          await expect(navigation).toBeHidden();
          await toggle.tap();
          await navigation.getByRole("link", { name: tools[(index + 1) % 4][0], exact: true }).tap();
        }
      });
    }
  }
});
