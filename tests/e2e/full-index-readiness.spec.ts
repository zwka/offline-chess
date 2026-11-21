import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const manifest = JSON.parse(readFileSync(new URL("../../apps/woodpecker/apps/generator/public/puzzle-index-manifest.json", import.meta.url), "utf8"));
const index = gzipSync(readFileSync(new URL("../../apps/woodpecker/apps/generator/public/puzzle-index.jsonl", import.meta.url)));
const indexPath = "/woodpecker-generator/puzzle-index.generated.jsonl.gz";
const manifestPath = "/woodpecker-generator/puzzle-index.generated-manifest.json";
const descriptor = { manifest, bytes: index.length };

test("Generator entry, Saved Activity choice and switcher never warm the full index; Generate does", async ({ page, context }) => {
  const fixture = `
    const networkFetch = self.fetch.bind(self);
    let fullGets = 0;
    self.fetch = async (input, options) => {
      const request = new Request(new URL(typeof input === 'string' ? input : input.url, self.location.origin), options ?? (typeof input === 'string' ? undefined : input));
      if (new URL(request.url).pathname === ${JSON.stringify(manifestPath)}) return new Response(${JSON.stringify(JSON.stringify(manifest))});
      if (new URL(request.url).pathname === ${JSON.stringify(indexPath)}) {
        if (request.method === 'GET') fullGets++;
        return new Response(request.method === 'HEAD' ? null : new Uint8Array(${JSON.stringify([...index])}), { headers: { 'Content-Length': '${index.length}' } });
      }
      return networkFetch(input, options);
    };
    self.addEventListener('message', event => { if (event.data === 'fixture:full-gets') event.ports[0].postMessage(fullGets); });
  `;
  await context.route("**/sw.js", route => route.fulfill({ contentType: "application/javascript", body: fixture + readFileSync(new URL("../../dist/sw.js", import.meta.url), "utf8")
    .replace(/const FULL_INDEX = .*;/, `const FULL_INDEX = ${JSON.stringify(descriptor)};`) }));
  const fullGets = () => page.evaluate(() => new Promise<number>(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = event => resolve(event.data);
    navigator.serviceWorker.controller!.postMessage('fixture:full-gets', [channel.port2]);
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Offline status: Tools ready" }).click();
  await page.goto("/woodpecker-generator/");
  await expect(page.getByRole("button", { name: "Generate puzzle set" })).toBeEnabled();
  expect(await fullGets()).toBe(0);
  await page.getByLabel("Puzzles", { exact: true }).fill("1");
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect(page.getByText(`${manifest.recordCount} local records`, { exact: true })).toBeVisible();
  expect(await fullGets()).toBe(0);
  await page.getByRole("button", { name: "Switch Tool" }).click();
  expect(await fullGets()).toBe(0);
  await page.getByRole("button", { name: "Switch Tool" }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  expect(await fullGets()).toBe(0);
  await page.getByRole("button", { name: "Generate puzzle set" }).click();
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeVisible();
  expect(await fullGets()).toBeGreaterThan(0);
  const warmedGets = await fullGets();
  expect(await page.evaluate(async path => {
    const response = await fetch(path, { method: "HEAD" });
    return { length: response.headers.get("Content-Length"), body: await response.text() };
  }, indexPath)).toEqual({ length: String(index.length), body: "" });
  expect(await fullGets()).toBe(warmedGets);
});

test("optional full database is verified offline independently without index requests", async ({ page, context }) => {
  const requests: string[] = [];
  context.on("request", request => { if (request.url().includes("puzzle-index.generated")) requests.push(request.url()); });
  await context.route("**/sw.js", route => route.fulfill({
    contentType: "application/javascript",
    body: readFileSync(new URL("../../dist/sw.js", import.meta.url), "utf8")
      .replace(/const FULL_INDEX = .*;/, `const FULL_INDEX = ${JSON.stringify(descriptor)};`),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Offline status: Tools ready" }).click();
  const database = page.locator("[data-offline-database]");
  await expect(database).toContainText("Full puzzle database: unavailable");
  await page.evaluate(async ({ manifestPath, indexPath, manifest, bytes }) => {
    const cache = await caches.open((await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!);
    await cache.put(manifestPath, new Response(JSON.stringify(manifest)));
    await cache.put(indexPath, new Response(new Uint8Array(bytes), { headers: { "Content-Length": String(bytes.length) } }));
  }, { manifestPath, indexPath, manifest, bytes: [...index] });
  await context.setOffline(true);
  await page.getByRole("button", { name: "Recheck resources" }).click();
  await expect(database).toContainText("Full puzzle database: available offline");
  await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible();
  await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!);
    await cache.delete("/woodpecker-generator/puzzle-index.jsonl");
  });
  await page.getByRole("button", { name: "Recheck resources" }).click();
  await expect(page.getByRole("button", { name: "Offline status: Tools incomplete" })).toBeVisible();
  await expect(database).toContainText("Full puzzle database: available offline");
  await page.evaluate(async path => {
    const cache = await caches.open((await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!);
    await cache.delete(path);
  }, indexPath);
  await page.getByRole("button", { name: "Recheck resources" }).click();
  await expect(database).toContainText("Full puzzle database: incomplete");
  await expect(database).toContainText("Previously available offline data is no longer verified");
  expect(requests).toEqual([]);
});

test("stale, failed, malformed and removed full resources never imply availability", async ({ page, context }) => {
  await context.route("**/sw.js", route => route.fulfill({
    contentType: "application/javascript",
    body: readFileSync(new URL("../../dist/sw.js", import.meta.url), "utf8")
      .replace(/const FULL_INDEX = .*;/, `const FULL_INDEX = ${JSON.stringify(descriptor)};`),
  }));
  await page.goto("/");
  await page.getByRole("button", { name: "Offline status: Tools ready" }).click();
  const database = page.locator("[data-offline-database]");
  for (const scenario of ["stale", "failed", "short", "malformed", "old-cache", "missing-manifest", "complete", "removed"]) {
    await page.evaluate(async ({ scenario, manifest, manifestPath, indexPath, bytes }) => {
      const name = (await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!;
      const cache = await caches.open(name);
      await cache.delete(manifestPath);
      await cache.delete(indexPath);
      if (scenario === "removed") return;
      const target = scenario === "old-cache" ? await caches.open("offline-chess-suite-v1-stale") : cache;
      if (scenario !== "missing-manifest") await target.put(manifestPath, new Response(scenario === "malformed" ? "{" : JSON.stringify(scenario === "stale" ? { ...manifest, source: { ...manifest.source, snapshot: "2000-01-01" } } : manifest)));
      await target.put(indexPath, new Response(new Uint8Array(scenario === "short" ? bytes.slice(0, 3) : bytes), { status: scenario === "failed" ? 503 : 200 }));
    }, { scenario, manifest, manifestPath, indexPath, bytes: [...index] });
    await page.getByRole("button", { name: "Recheck resources" }).click();
    const expected = scenario === "complete" ? "available offline" : ["removed", "old-cache"].includes(scenario) ? "unavailable" : scenario === "malformed" ? "check failed" : "incomplete";
    await expect(database).toContainText(`Full puzzle database: ${expected}`);
    await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible();
  }
  await expect(database).toContainText("Previously available offline data is no longer verified");
});

test("explicit index warming rechecks details and an update invalidates old database success", async ({ page, context }) => {
  let source = readFileSync(new URL("../../dist/sw.js", import.meta.url), "utf8")
    .replace(/const FULL_INDEX = .*;/, `const FULL_INDEX = ${JSON.stringify(descriptor)};`)
    .replace("let installFailures = 0;", "let installFailures = 0; let fullWrites = 0;")
    .replace("await cache.put(request, response);", 'if (++fullWrites > 1) throw new Error("Quota exceeded"); await cache.put(request, response);')
    .replaceAll("await fetch(request);", `new Response(new Uint8Array(${JSON.stringify([...index])}), { headers: { "Content-Length": "${index.length}" } });`);
  await context.route("**/sw.js*", route => route.fulfill({ contentType: "application/javascript", body: source }));
  await page.goto("/");
  await page.getByRole("button", { name: "Offline status: Tools ready" }).click();
  const database = page.locator("[data-offline-database]");
  await expect(database).toContainText("Full puzzle database: unavailable");
  await page.evaluate(async ({ manifestPath, manifest }) => {
    const cache = await caches.open((await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!);
    await cache.put(manifestPath, new Response(JSON.stringify(manifest)));
  }, { manifestPath, manifest });
  // Preserve the existing explicit HEAD -> warming GET path, but checks never
  // invoke it themselves. The completed cache write must invalidate details.
  expect(await page.evaluate(async path => (await fetch(path, { method: "HEAD" })).status, indexPath)).toBe(200);
  await expect(database).toContainText("Full puzzle database: available offline", { timeout: 5000 });
  await page.evaluate(async path => {
    const cache = await caches.open((await caches.keys()).find(name => name.startsWith("offline-chess-suite-v1-"))!);
    await cache.delete(path);
  }, indexPath);
  expect(await page.evaluate(async path => (await fetch(path, { method: "HEAD" })).status, indexPath)).toBe(503);
  await expect(database).toContainText("Full puzzle database: incomplete", { timeout: 5000 });
  await expect(database).toContainText("Previously available offline data is no longer verified");
  source = source.replace(/const CACHE = "[^"]+";/, 'const CACHE = "offline-chess-suite-v1-full-update-fixture";');
  await page.evaluate(async () => { await navigator.serviceWorker.register("/sw.js?full-update", { scope: "/" }); });
  await expect(database).toContainText("Full puzzle database: unavailable");
  await expect(database).toContainText("Previously available offline data is no longer verified");
  await expect(page.getByRole("button", { name: "Offline status: Tools ready" })).toBeVisible();
});
