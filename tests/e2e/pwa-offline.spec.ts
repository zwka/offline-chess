import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { expect, test } from "@playwright/test";

const distRoot = fileURLToPath(new URL("../../dist", import.meta.url));

function listFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath));
    } else if (entry.isFile()) {
      results.push("/" + relative(distRoot, fullPath).replace(/\\/g, "/"));
    }
  }
  return results.sort();
}

test.describe("Suite PWA Manifest & Offline Service Worker", () => {
  test("exposes a single Suite web manifest at /manifest.webmanifest with standalone install metadata and icons", async ({
    page,
  }) => {
    const builtFiles = listFilesRecursive(distRoot);
    const manifests = builtFiles.filter((file) => file.endsWith(".webmanifest"));
    expect(manifests).toEqual(["/manifest.webmanifest"]);

    await page.goto("/");
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveCount(1);
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");

    const response = await page.request.get("/manifest.webmanifest");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = await response.json();
    expect(manifest).toMatchObject({
      name: "Offline Chess",
      short_name: "Offline Chess",
      display: "standalone",
      start_url: "/",
      scope: "/",
      background_color: "#172321",
      theme_color: "#172321",
    });

    expect(manifest.icons).toEqual([
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ]);

    for (const icon of manifest.icons) {
      const iconRes = await page.request.get(icon.src);
      expect(iconRes.status()).toBe(200);
      expect(iconRes.headers()["content-type"]).toContain("image/png");
    }

    for (const toolPath of [
      "/blind-chess/",
      "/pgn-reader/",
      "/woodpecker-generator/",
      "/woodpecker-trainer/",
    ]) {
      await page.goto(toolPath);
      await expect(page.locator('link[rel="manifest"]')).toHaveCount(0);
    }
  });

  test("builds a single root /sw.js that precaches all five surfaces, excludes the optional 437 MB generated index, prunes only outdated Suite caches, and handles HEAD/530 fallback", async () => {
    const builtFiles = listFilesRecursive(distRoot);
    const serviceWorkers = builtFiles.filter(
      (file) => file.endsWith("/sw.js") || file.endsWith("/service-worker.js"),
    );
    expect(serviceWorkers).toEqual(["/sw.js"]);

    const swPath = join(distRoot, "sw.js");
    expect(existsSync(swPath)).toBe(true);
    const swSource = readFileSync(swPath, "utf8");

    // Verify precache list covers all built files (except /sw.js and optional generated index) plus directory routes
    const expectedFiles = builtFiles.filter(
      (file) =>
        file !== "/sw.js" &&
        file !== "/woodpecker-generator/puzzle-index.generated.jsonl.gz" &&
        file !== "/woodpecker-generator/puzzle-index.generated-manifest.json",
    );
    for (const file of expectedFiles) {
      expect(swSource).toContain(JSON.stringify(file));
    }
    for (const dirRoute of [
      "/",
      "/blind-chess/",
      "/pgn-reader/",
      "/woodpecker-generator/",
      "/woodpecker-trainer/",
    ]) {
      expect(swSource).toContain(JSON.stringify(dirRoute));
    }
    expect(swSource).not.toContain(
      '"/woodpecker-generator/puzzle-index.generated.jsonl.gz",',
    );
    expect(swSource).not.toContain(
      '"/woodpecker-generator/puzzle-index.generated-manifest.json",',
    );

    // Execute sw.js in a VM context to verify activate cache pruning and fetch/HEAD semantics
    const origin = "https://suite.example";
    const listeners = new Map<string, (event: any) => void>();
    const cacheStore = new Map<string, Map<string, Response>>();
    cacheStore.set("offline-chess-suite-v0-old", new Map());
    cacheStore.set("unrelated-cache-v1", new Map());

    let networkHandler: (req: Request | string) => Promise<Response> = async () =>
      new Response("OK", { status: 200 });

    const toUrl = (input: Request | string) =>
      new URL(typeof input === "string" ? input : input.url, origin).href;

    runInNewContext(swSource, {
      Headers,
      Request,
      Response,
      URL,
      self: {
        registration: { scope: `${origin}/` },
        location: { origin },
        navigator: { onLine: true },
        clients: { claim: async () => {} },
        skipWaiting: async () => {},
        addEventListener: (type: string, listener: (event: any) => void) => {
          listeners.set(type, listener);
        },
      },
      caches: {
        open: async (name: string) => {
          let map = cacheStore.get(name);
          if (!map) {
            map = new Map();
            cacheStore.set(name, map);
          }
          return {
            put: async (req: Request | string, res: Response) => {
              map!.set(toUrl(req), res);
            },
          };
        },
        keys: async () => [...cacheStore.keys()],
        delete: async (name: string) => cacheStore.delete(name),
        match: async (req: Request | string) => {
          const url = toUrl(req);
          for (const [cacheName, entries] of cacheStore.entries()) {
            if (cacheName.startsWith("offline-chess-suite-")) {
              const hit = entries.get(url);
              if (hit) return hit.clone();
            }
          }
          return undefined;
        },
      },
      fetch: (req: Request | string) => networkHandler(req),
    });

    // Run install
    let installPromise: Promise<unknown> | undefined;
    listeners.get("install")!({
      waitUntil: (p: Promise<unknown>) => {
        installPromise = p;
      },
    });
    await installPromise;

    // Run activate and verify only outdated offline-chess-suite-* cache was deleted
    let activatePromise: Promise<unknown> | undefined;
    listeners.get("activate")!({
      waitUntil: (p: Promise<unknown>) => {
        activatePromise = p;
      },
    });
    await activatePromise;

    const remainingCaches = [...cacheStore.keys()];
    expect(remainingCaches).not.toContain("offline-chess-suite-v0-old");
    expect(remainingCaches).toContain("unrelated-cache-v1");
    const activeSuiteCaches = remainingCaches.filter((k) =>
      k.startsWith("offline-chess-suite-v1-"),
    );
    expect(activeSuiteCaches).toHaveLength(1);

    const dispatchFetch = async (request: Request) => {
      let responsePromise: Promise<Response> | undefined;
      const bg: Promise<unknown>[] = [];
      listeners.get("fetch")!({
        request,
        waitUntil: (p: Promise<unknown>) => bg.push(p),
        respondWith: (p: Promise<Response>) => {
          responsePromise = p;
        },
      });
      const res = await responsePromise!;
      await Promise.all(bg);
      return res;
    };

    // 1. Serves cached response when tunnel returns HTTP 530
    networkHandler = async () => new Response("Tunnel stopped", { status: 530 });
    const tunnelFallbackRes = await dispatchFetch(
      new Request(`${origin}/woodpecker-generator/`, { method: "GET" }),
    );
    expect(tunnelFallbackRes.status).toBe(200);

    // 2. Answers offline HEAD check for precached sample index from cached GET response
    networkHandler = async () => {
      throw new TypeError("Failed to fetch");
    };
    const sampleHeadRes = await dispatchFetch(
      new Request(`${origin}/woodpecker-generator/puzzle-index.jsonl`, {
        method: "HEAD",
      }),
    );
    expect(sampleHeadRes.status).toBe(200);
    await expect(sampleHeadRes.text()).resolves.toBe("");

    // 3. Warms cache on online HEAD request to optional generated puzzle index and serves it offline
    let generatedGetCalls = 0;
    networkHandler = async (req) => {
      const r = typeof req === "string" ? new Request(req) : req;
      if (
        r.method === "GET" &&
        new URL(r.url).pathname ===
          "/woodpecker-generator/puzzle-index.generated.jsonl.gz"
      ) {
        generatedGetCalls += 1;
        return new Response("compressed-index-bytes", {
          status: 200,
          headers: { "Content-Type": "application/gzip", "Content-Length": "22" },
        });
      }
      return new Response("Not found", { status: 404 });
    };

    const headWarmRes = await dispatchFetch(
      new Request(
        `${origin}/woodpecker-generator/puzzle-index.generated.jsonl.gz`,
        { method: "HEAD" },
      ),
    );
    expect(headWarmRes.status).toBe(200);
    expect(headWarmRes.headers.get("content-type")).toBe("application/gzip");
    expect(headWarmRes.headers.get("content-length")).toBe("22");
    await expect(headWarmRes.text()).resolves.toBe("");
    expect(generatedGetCalls).toBe(1);

    // Now go offline and verify both HEAD and GET for generated index hit the warmed cache
    networkHandler = async () => {
      throw new TypeError("Failed to fetch");
    };
    const headOfflineRes = await dispatchFetch(
      new Request(
        `${origin}/woodpecker-generator/puzzle-index.generated.jsonl.gz`,
        { method: "HEAD" },
      ),
    );
    expect(headOfflineRes.status).toBe(200);
    await expect(headOfflineRes.text()).resolves.toBe("");

    const getOfflineRes = await dispatchFetch(
      new Request(
        `${origin}/woodpecker-generator/puzzle-index.generated.jsonl.gz`,
        { method: "GET" },
      ),
    );
    expect(getOfflineRes.status).toBe(200);
    await expect(getOfflineRes.text()).resolves.toBe("compressed-index-bytes");
  });

  test("precaches the entire Suite on a single visit to / and supports offline navigation, hard reloads, and operation across all five surfaces", async ({
    page,
    context,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Offline Chess", level: 1 }),
    ).toBeVisible();

    const swState = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) {
        return { supported: false, scopes: [], controlled: false, cacheNames: [], cachedPaths: [] };
      }
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 10_000)),
      ]);
      if (!reg) {
        return { supported: true, scopes: [], controlled: false, cacheNames: [], cachedPaths: [] };
      }
      const deadline = Date.now() + 10_000;
      while (!navigator.serviceWorker.controller && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 50));
      }
      const regs = await navigator.serviceWorker.getRegistrations();
      const cacheNames = await caches.keys();
      const suiteCacheName = cacheNames.find((n) =>
        n.startsWith("offline-chess-suite-v1-"),
      );
      const cachedPaths: string[] = [];
      if (suiteCacheName) {
        const cache = await caches.open(suiteCacheName);
        const keys = await cache.keys();
        for (const req of keys) {
          cachedPaths.push(new URL(req.url).pathname);
        }
      }
      return {
        supported: true,
        activeScope: reg.scope,
        scopes: regs.map((r) => r.scope),
        controlled: Boolean(navigator.serviceWorker.controller),
        cacheNames,
        cachedPaths: cachedPaths.sort(),
      };
    });

    expect(swState.supported).toBe(true);
    expect(swState.controlled).toBe(true);
    expect(swState.scopes).toEqual([new URL("/", page.url()).href]);
    expect(
      swState.cacheNames.filter((n) => n.startsWith("offline-chess-suite-v1-")),
    ).toHaveLength(1);

    for (const requiredCachedPath of [
      "/",
      "/index.html",
      "/app.js",
      "/styles.css",
      "/manifest.webmanifest",
      "/favicon-32.png",
      "/apple-touch-icon.png",
      "/icon-192.png",
      "/icon-512.png",
      "/icon-maskable-512.png",
      "/icons/blind-chess.jpeg",
      "/icons/pgn-reader.jpeg",
      "/icons/woodpecker.jpeg",
      "/blind-chess/",
      "/blind-chess/index.html",
      "/pgn-reader/",
      "/pgn-reader/index.html",
      "/pgn-reader/mobile.css",
      "/pgn-reader/dist/mobile/app.js",
      "/pgn-reader/dist/mobile/scan-worker.js",
      "/pgn-reader/pieces/wK.svg",
      "/pgn-reader/pieces/bK.svg",
      "/woodpecker-generator/",
      "/woodpecker-generator/index.html",
      "/woodpecker-generator/puzzle-index-manifest.json",
      "/woodpecker-generator/puzzle-index.jsonl",
      "/woodpecker-trainer/",
      "/woodpecker-trainer/index.html",
      "/woodpecker-trainer/demo-set.json",
    ]) {
      expect(swState.cachedPaths).toContain(requiredCachedPath);
    }

    expect(swState.cachedPaths).not.toContain(
      "/woodpecker-generator/puzzle-index.generated.jsonl.gz",
    );

    // Go offline after only visiting /
    await context.setOffline(true);

    const failedRequests: string[] = [];
    page.on("requestfailed", async (req) => {
      const res = await req.response().catch(() => null);
      if (
        req.method() === "HEAD" &&
        req.failure()?.errorText === "net::ERR_ABORTED" &&
        res?.status() === 200 &&
        res?.fromServiceWorker()
      ) {
        return;
      }
      failedRequests.push(
        `${req.method()} ${req.url()} (${req.failure()?.errorText ?? "failed"})`,
      );
    });

    // 1. Landing Page (/) offline reload
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Offline Chess", level: 1 }),
    ).toBeVisible();
    await expect(page.locator(".tool-card")).toHaveCount(4);

    // 2. Blind Chess (/blind-chess/) offline navigation + hard reload + drill start
    await page.goto("/blind-chess/");
    await expect(
      page.getByRole("heading", { name: "Choose a drill", level: 1 }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Choose a drill", level: 1 }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Square Colors/i }).click();
    await expect(page.getByText("WHAT COLOR IS THIS SQUARE?")).toBeVisible();

    // 3. PGN Reader (/pgn-reader/) offline navigation + hard reload + PGN import & piece rendering
    await page.goto("/pgn-reader/");
    await expect(page.locator("#source-status")).toHaveText("idle");
    await page.reload();
    await expect(page.locator("#source-status")).toHaveText("idle");
    await page.locator("#source-input").setInputFiles({
      name: "offline.pgn",
      mimeType: "application/x-chess-pgn",
      buffer: Buffer.from('[Event "Offline Study"]\n[White "Player"]\n\n1. e4 e5 1-0\n'),
    });
    await expect(page.locator("#source-status")).toHaveText("ready", {
      timeout: 10_000,
    });
    await page.locator("#record-list .game-record").first().click();
    await expect(page.locator("#reader-panel")).toBeVisible();
    const pieceWidth = await page
      .locator('.board .sq[data-square="e2"] .piece')
      .evaluate((el: HTMLImageElement) => el.naturalWidth);
    expect(pieceWidth).toBeGreaterThan(0);

    // 4. Woodpecker Generator (/woodpecker-generator/) offline navigation + hard reload + sample index generation
    await page.goto("/woodpecker-generator/");
    await expect(page.getByText("12 local records")).toBeVisible();
    await page.reload();
    await expect(page.getByText("12 local records")).toBeVisible();
    await page.getByLabel("Puzzles").fill("4");
    await page.getByRole("button", { name: /Generate puzzle set/i }).click();
    await expect(page.getByRole("status")).toContainText(
      "4 puzzles selected from 6 matches.",
    );

    // 5. Woodpecker Trainer (/woodpecker-trainer/) offline navigation + hard reload + demo set loaded
    await page.goto("/woodpecker-trainer/");
    await expect(
      page.getByRole("heading", { name: "Warm-up tactics" }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Warm-up tactics" }),
    ).toBeVisible();

    expect(failedRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
