import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const workerSource = () => readFileSync(new URL("../../dist/sw.js", import.meta.url), "utf8");

test("installation remains checking until resources can be verified", async ({ page, context }) => {
  await context.route("**/sw.js", route => route.fulfill({
    contentType: "application/javascript",
    body: workerSource().replace("const cache = await caches.open(CACHE);\n    await Promise.all", "await new Promise(resolve => setTimeout(resolve, 2500));\n    const cache = await caches.open(CACHE);\n    await Promise.all"),
  }));
  await page.goto("/");
  await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.installing));
  await expect(page.getByRole("button", { name: "Offline status: Checking" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible({ timeout: 20000 });
});

test("verified Tool readiness has accessible local-only details on every surface", async ({ page, context }) => {
  const fullIndexRequests: string[] = [];
  page.on("request", request => {
    if (request.url().includes("puzzle-index.generated.jsonl.gz")) fullIndexRequests.push(request.url());
  });
  await page.goto("/");
  const control = page.getByRole("button", { name: "Offline status: Tools ready" });
  await expect(control).toBeVisible({ timeout: 20000 });
  await control.click();
  const details = page.getByRole("dialog", { name: "Offline readiness" });
  await expect(details).toBeVisible();
  await expect(details).toContainText("Online — connectivity is not offline readiness");
  await expect(details).toContainText("Full puzzle database: unavailable");
  await expect(details).toContainText("browser can remove stored resources");
  await page.keyboard.press("Escape");
  await expect(control).toBeFocused();
  await context.setOffline(true);
  for (const path of ["/", "/blind-chess/", "/pgn-reader/", "/woodpecker-generator/", "/woodpecker-trainer/"]) {
    await page.goto(path);
    await page.reload();
    await page.getByRole("button", { name: "Offline status: Tools ready" }).click();
    await expect(details).toContainText("Offline — connectivity is not offline readiness");
    await page.keyboard.press("Escape");
  }
  expect(fullIndexRequests).toEqual([]);
});

test("cache removal invalidates past success and registration alone cannot imply readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible({ timeout: 20000 });
  await page.evaluate(async () => {
    for (const name of await caches.keys()) await caches.delete(name);
  });
  await page.getByRole("button", { name: /Offline status/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Required Tool resources are missing");
  await expect(page.getByRole("button", { name: "Offline status: Tools incomplete" })).toBeVisible();
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  // Rechecking must not recreate an empty cache or perform a network repair.
  await page.getByRole("button", { name: "Recheck resources" }).click();
  await expect(page.getByRole("dialog")).toContainText("0 of");
  expect(await page.evaluate(() => caches.keys())).toEqual([]);
});

test("partial local resources identify the missing sample index", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible({ timeout: 20000 });
  await page.evaluate(async () => {
    const name = (await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!;
    await (await caches.open(name)).delete("/woodpecker-generator/puzzle-index.jsonl");
  });
  await page.getByRole("button", { name: /Offline status/ }).click();
  await expect(page.getByRole("button", { name: "Offline status: Tools incomplete" })).toBeVisible();
  await page.getByText("Required resource details", { exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveText("/woodpecker-generator/puzzle-index.jsonl");
});

test("unsupported browser reports unavailable without reassurance", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "serviceWorker", { value: undefined });
  });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Unavailable" })).toBeVisible();
});

test("failed install resources remain visibly incomplete", async ({ page, context }) => {
  await context.route("**/sw.js", route => route.fulfill({
    contentType: "application/javascript",
    body: workerSource().replace("await fetch(url);", 'await (url === "/woodpecker-generator/puzzle-index.jsonl" ? Promise.reject(new Error("Network failure")) : fetch(url));'),
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Tools incomplete" })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Offline status/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Some resources failed to cache during installation");
});

test("failed worker installation reports failure rather than registration success", async ({ page, context }) => {
  await context.route("**/sw.js", route => route.fulfill({
    contentType: "application/javascript",
    body: workerSource().replace("const cache = await caches.open(CACHE);\n    await Promise.all", 'throw new Error("Quota exceeded");\n    const cache = await caches.open(CACHE);\n    await Promise.all'),
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Check failed" })).toBeVisible({ timeout: 20000 });
});

test("storage verification failure is not ready", async ({ page, context }) => {
  await context.route("**/sw.js", route => route.fulfill({
    contentType: "application/javascript",
    body: workerSource().replace("const exists =", 'throw new Error("Storage access denied"); const exists ='),
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Check failed" })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Offline status/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Browser storage could not be read");
});

test("a worker update rechecks the new build rather than retaining old success", async ({ page, context }) => {
  let source = workerSource();
  await context.route("**/sw.js*", route => route.fulfill({ contentType: "application/javascript", body: source }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible({ timeout: 20000 });
  source = source.replace(/const CACHE = "[^"]+";/, 'const CACHE = "offline-chess-suite-v1-update-fixture";')
    .replace("await fetch(url);", 'await (url === "/woodpecker-generator/puzzle-index.jsonl" ? Promise.reject(new Error("Update failure")) : fetch(url));');
  await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js?update-fixture", { scope: "/" }); });
  await expect(page.getByRole("button", { name: "Offline status: Tools incomplete" })).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Offline status/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Some resources failed to cache during installation");
});

for (const theme of ["light", "dark"]) {
  test(`phone details are keyboard accessible in ${theme} Theme without index requests`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.addInitScript(value => { document.addEventListener("DOMContentLoaded", () => document.documentElement.dataset.theme = value); }, theme);
    const requests: string[] = [];
    page.on("request", request => { if (request.url().includes("puzzle-index.generated")) requests.push(request.url()); });
    await page.goto("/");
    const control = page.getByRole("button", { name: "Offline status: Tools ready" });
    await expect(control).toBeVisible({ timeout: 20000 });
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Offline readiness" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Offline readiness" })).toBeInViewport();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(control).toBeFocused();
    expect(requests).toEqual([]);
  });
}
