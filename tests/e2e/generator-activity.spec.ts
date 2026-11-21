import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

test.use({ serviceWorkers: "block" });
const activityKey = "offline-chess.generator.activity.v1";

test.beforeEach(async ({ context }) => {
  await context.route("**/puzzle-index.generated*", route => route.fulfill({ status: 404, body: "Not found" }));
});

async function exportSet(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  return JSON.parse(await readFile((await (await download).path())!, "utf8"));
}

test("Resume restores filters, advanced settings and completed output after leaving and reload without scanning", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await expect(page.getByText("12 local records")).toBeVisible();
  await page.getByLabel("Set name").fill("Durable tactics");
  await page.getByLabel("Minimum").fill("1000");
  await page.getByLabel("Maximum").fill("1700");
  await page.getByLabel("Puzzles", { exact: true }).fill("2");
  await page.getByText("Mate", { exact: true }).click();
  await page.getByText("Advanced options", { exact: true }).click();
  await page.getByLabel("Random seed").fill("durable-10");
  await page.getByRole("button", { name: "Any selected" }).click();
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("2 puzzles selected");
  const original = await exportSet(page);
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await page.goto("/woodpecker-generator/");
  await expect(page.getByRole("heading", { name: "Resume Generator activity?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Do Puzzles" })).toHaveCount(0);
  await page.reload();
  await page.route("**/puzzle-index.jsonl", route => route.abort());
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByLabel("Set name")).toHaveValue("Durable tactics");
  await expect(page.getByLabel("Minimum")).toHaveValue("1000");
  await expect(page.getByLabel("Maximum")).toHaveValue("1700");
  await expect(page.getByLabel("Puzzles", { exact: true })).toHaveValue("2");
  await expect(page.getByRole("checkbox", { name: "Mate", exact: true })).toBeChecked();
  await page.getByText("Advanced options", { exact: true }).click();
  await expect(page.getByLabel("Random seed")).toHaveValue("durable-10");
  await expect(page.getByRole("button", { name: "Any selected" })).toHaveAttribute("aria-pressed", "true");
  expect(await exportSet(page)).toEqual(original);
});

test("Start fresh cancellation retains output and confirmed replacement leaves Trainer content and history untouched", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await expect(page.getByText("12 local records")).toBeVisible();
  await page.getByLabel("Set name").fill("Keep Trainer content");
  await page.getByLabel("Puzzles", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("button", { name: "Do Puzzles" })).toBeVisible();
  const original = await exportSet(page);
  await page.getByRole("button", { name: "Do Puzzles" }).click();
  await page.getByRole("button", { name: "Show solution", exact: true }).click();
  await page.getByRole("button", { name: "Next puzzle", exact: true }).click();
  await page.getByRole("button", { name: "Show solution", exact: true }).click();
  await page.getByRole("button", { name: "Next puzzle", exact: true }).click();
  await page.getByRole("link", { name: "Generator →" }).click();
  page.once("dialog", async dialog => {
    expect(dialog.message()).toContain("filters and generated output");
    expect(dialog.message()).toContain("history will not be deleted");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  expect(await exportSet(page)).toEqual(original);
  await page.reload();
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByLabel("Set name")).toHaveValue("Focused tactics");
  await expect(page.getByRole("button", { name: "Export JSON" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Set name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Trainer →" }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "Library", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Keep Trainer content", exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByRole("button").filter({ hasText: /Keep Trainer content.*completed/ })).toHaveCount(1);
});

test("a failed navigation-time save never claims success and retains the previous atomic snapshot", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await page.getByLabel("Set name").fill("Previous complete save");
  await page.getByLabel("Puzzles", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  const original = await exportSet(page);
  await expect(page.getByText("Generator filters and completed output saved on this device.", { exact: true })).toBeVisible();
  // Storage is a browser boundary; fail it after a successful save.
  await page.evaluate(key => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Full", "QuotaExceededError");
      return setItem.call(this, name, value);
    };
  }, activityKey);
  const allowed = await page.evaluate(() => window.dispatchEvent(new Event("offline-chess:before-navigate", { cancelable: true })));
  expect(allowed).toBe(false);
  await expect(page.getByText(/Generator activity could not be saved on this device/)).toBeVisible();
  await expect(page.getByText("Generator filters and completed output saved on this device.", { exact: true })).toHaveCount(0);
  await page.getByLabel("Set name").fill("Unsaved latest edit");
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await expect(page).toHaveURL(/woodpecker-generator/);
  await expect(page.getByLabel("Set name")).toHaveValue("Unsaved latest edit");
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByLabel("Set name")).toHaveValue("Previous complete save");
  expect(await exportSet(page)).toEqual(original);
});

test("invalid fractional input does not create an output that cannot be resumed", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await expect(page.getByText("12 local records")).toBeVisible();
  await page.getByLabel("Puzzles", { exact: true }).fill("1.5");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("status")).toContainText("whole number");
  await expect(page.getByRole("button", { name: "Export JSON" })).toHaveCount(0);
});

test("visiting an untouched Generator is not unfinished work", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await expect(page.getByLabel("Set name")).toBeVisible();
  await page.getByRole("link", { name: "Offline Chess", exact: true }).click();
  await page.goto("/woodpecker-generator/");
  await expect(page.getByLabel("Set name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
});

test("filters and completed output survive closing and reopening a persisted browser profile", async ({ playwright, baseURL }, testInfo) => {
  const profile = testInfo.outputPath("browser-profile");
  await mkdir(profile, { recursive: true });
  const options = { baseURL, serviceWorkers: "block" as const };
  let context = await playwright.chromium.launchPersistentContext(profile, options);
  try {
    let page = await context.newPage();
    await page.goto("/woodpecker-generator/");
    await page.getByLabel("Set name").fill("Reopened browser");
    await page.getByText("Advanced options", { exact: true }).click();
    await page.getByLabel("Random seed").fill("reopen-seed");
    await page.getByLabel("Puzzles", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Generate puzzle set" }).click();
    await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
    const original = await exportSet(page);
    await expect(page.getByText("Generator filters and completed output saved on this device.", { exact: true })).toBeVisible();
    await context.close();
    context = await playwright.chromium.launchPersistentContext(profile, options);
    page = await context.newPage();
    await page.goto("/woodpecker-generator/");
    await page.route("**/puzzle-index.jsonl", route => route.abort());
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByLabel("Set name")).toHaveValue("Reopened browser");
    await page.getByText("Advanced options", { exact: true }).click();
    await expect(page.getByLabel("Random seed")).toHaveValue("reopen-seed");
    expect(await exportSet(page)).toEqual(original);
  } finally {
    await context.close();
  }
});

test("failed Start fresh retains the saved activity and lets the player Resume", async ({ page }) => {
  await page.goto("/woodpecker-generator/");
  await page.getByLabel("Set name").fill("Retained after failed replacement");
  await page.reload();
  await page.evaluate(key => {
    const removeItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (name) {
      if (name === key) throw new DOMException("Denied", "SecurityError");
      return removeItem.call(this, name);
    };
  }, activityKey);
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Start fresh", exact: true }).click();
  await expect(page.getByText(/Saved Generator activity could not be replaced/)).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByLabel("Set name")).toHaveValue("Retained after failed replacement");
  await page.reload();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByLabel("Set name")).toHaveValue("Retained after failed replacement");
});

for (const state of ["truncated", "older", "invalid-output", "wrong-hash"]) {
  test(`safe recovery from ${state} activity does not claim it was saved or hand off invalid output`, async ({ page }) => {
    await page.goto("/woodpecker-generator/");
    const set = JSON.parse(await readFile("apps/woodpecker/apps/trainer/public/demo-set.json", "utf8"));
    await page.evaluate(({ key, set, state }) => {
      const record = {
        kind: "generator-activity", schemaVersion: state === "older" ? 0 : 1,
        activity: { setName: "Invalid activity", ratingMin: 1100, ratingMax: 1600, count: 2,
          themeMatch: "all", selectedThemes: ["short"], seed: "seed", matches: 100,
          generatedSet: state === "invalid-output" ? { ...set, puzzles: [] } : { ...set, contentHash: "0".repeat(64) } },
      };
      localStorage.setItem(key, state === "truncated" ? '{"kind":' : JSON.stringify(record));
    }, { key: activityKey, set, state });
    await page.reload();
    await expect(page.getByText(/Saved Generator activity is invalid or from an unsupported version/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Do Puzzles" })).toHaveCount(0);
    await expect(page.getByText("Generator filters and completed output saved on this device.", { exact: true })).toHaveCount(0);
    await page.getByLabel("Set name").fill("Recovered activity");
    await page.reload();
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await expect(page.getByLabel("Set name")).toHaveValue("Recovered activity");
  });
}

test("unavailable storage leaves generation and export usable without a saved-state assurance", async ({ page }) => {
  await page.addInitScript(key => {
    const getItem = Storage.prototype.getItem;
    const setItem = Storage.prototype.setItem;
    Storage.prototype.getItem = function (name) {
      if (name === key) throw new DOMException("Denied", "SecurityError");
      return getItem.call(this, name);
    };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Denied", "SecurityError");
      return setItem.call(this, name, value);
    };
  }, activityKey);
  await page.goto("/woodpecker-generator/");
  await expect(page.getByText(/Generator activity could not be saved on this device/)).toBeVisible();
  await page.getByLabel("Puzzles", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  expect((await exportSet(page)).puzzles).toHaveLength(2);
  await expect(page.getByText("Generator filters and completed output saved on this device.", { exact: true })).toHaveCount(0);
});

for (const theme of ["dark", "light"]) {
  test(`Resume is keyboard-reachable and restores reachable phone output in ${theme} Theme`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(theme => localStorage.setItem("offline-chess.theme.v1", theme), theme);
    await page.goto("/woodpecker-generator/");
    await page.getByLabel("Puzzles", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Generate puzzle set" }).click();
    await expect(page.getByRole("button", { name: "Do Puzzles" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Resume Generator activity?" })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`resume-phone-${theme}.png`), fullPage: true });
    const resume = page.getByRole("button", { name: "Resume", exact: true });
    await resume.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Generated output" }).getByRole("heading", { level: 2 })).toBeFocused();
    await expect(page.getByRole("button", { name: "Do Puzzles" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Export JSON" })).toBeInViewport();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}
