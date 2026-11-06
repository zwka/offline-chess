import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadPuzzleIndex } from "./load-puzzle-index.ts";

const sampleManifest = readFileSync(new URL("../public/puzzle-index-manifest.json", import.meta.url), "utf8");
const origin = "https://suite.example";

function createOfflineIndexLoop({ includeGeneratedManifest = true } = {}) {
  const cacheEntries = new Map();
  const assets = new Map([
    ["/woodpecker-generator/puzzle-index-manifest.json", sampleManifest],
    ["/woodpecker-generator/puzzle-index.jsonl", "sample puzzle"],
    ["/woodpecker-generator/puzzle-index.generated.jsonl.gz", "full puzzle index"],
  ]);
  if (includeGeneratedManifest) {
    assets.set("/woodpecker-generator/puzzle-index.generated-manifest.json", sampleManifest);
  }

  let online = true;
  let generatedIndexFailures = 0;
  const absoluteUrl = (request) => new URL(typeof request === "string" ? request : request.url, origin).href;

  const networkFetch = async (request, init = {}) => {
    if (!online) throw new TypeError("Failed to fetch");
    const url = new URL(typeof request === "string" ? request : request.url, origin);
    if (url.pathname === "/woodpecker-generator/puzzle-index.generated.jsonl.gz" && generatedIndexFailures > 0) {
      generatedIndexFailures -= 1;
      throw new TypeError("Failed to fetch");
    }
    const body = assets.get(url.pathname);
    if (body === undefined) return new Response("Not found", { status: 404 });
    const method = typeof request === "string" ? (init.method ?? "GET") : request.method;
    return new Response(method === "HEAD" ? null : body, { status: 200 });
  };

  function createHeadResponse(response) {
    return new Response(null, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  async function install() {
    const precachePaths = [
      "/woodpecker-generator/puzzle-index-manifest.json",
      "/woodpecker-generator/puzzle-index.jsonl",
      "/woodpecker-generator/puzzle-index.generated-manifest.json",
      "/woodpecker-generator/puzzle-index.generated.jsonl.gz",
    ];
    await Promise.all(precachePaths.map(async (path) => {
      try {
        const response = await networkFetch(path);
        if (response.ok) cacheEntries.set(absoluteUrl(path), response.clone());
      } catch {
        // Optional generated index may fail during install.
      }
    }));
  }

  async function controlledFetch(input, init = {}) {
    const request = new Request(new URL(input, origin), init);
    const url = new URL(request.url);
    const key = absoluteUrl(url.pathname);

    if (request.method === "HEAD" && url.pathname === "/woodpecker-generator/puzzle-index.generated.jsonl.gz") {
      const cached = cacheEntries.get(key);
      if (cached) return createHeadResponse(cached.clone());
      try {
        const response = await networkFetch(new Request(url.href, { method: "GET" }));
        if (response.ok) cacheEntries.set(key, response.clone());
        return createHeadResponse(response);
      } catch {
        return new Response("Offline", { status: 503 });
      }
    }

    try {
      const response = await networkFetch(request);
      if (response.ok && request.method === "GET") {
        cacheEntries.set(key, response.clone());
      }
      if (!response.ok) {
        const cached = cacheEntries.get(key)?.clone();
        if (cached) return request.method === "HEAD" ? createHeadResponse(cached) : cached;
      }
      return response;
    } catch {
      const cached = cacheEntries.get(key)?.clone();
      if (cached) return request.method === "HEAD" ? createHeadResponse(cached) : cached;
      return new Response("Offline", { status: 503 });
    }
  }

  return {
    install,
    loadPuzzleIndex: () => loadPuzzleIndex(controlledFetch),
    failNextGeneratedIndexFetch: () => { generatedIndexFailures = 1; },
    goOffline: () => { online = false; },
  };
}

describe("Generator offline index loading", () => {
  it("loads the generated index from /woodpecker-generator/ offline after repeated online opens", async () => {
    const loop = createOfflineIndexLoop();
    await loop.install();
    await loop.loadPuzzleIndex();
    await loop.loadPuzzleIndex();
    await loop.loadPuzzleIndex();
    loop.goOffline();

    await expect(loop.loadPuzzleIndex()).resolves.toMatchObject({
      index: "/woodpecker-generator/puzzle-index.generated.jsonl.gz",
    });
  });

  it("retries caching on an online open when install-time caching failed", async () => {
    const loop = createOfflineIndexLoop();
    loop.failNextGeneratedIndexFetch();
    await loop.install();
    await loop.loadPuzzleIndex();
    loop.goOffline();

    await expect(loop.loadPuzzleIndex()).resolves.toMatchObject({
      index: "/woodpecker-generator/puzzle-index.generated.jsonl.gz",
    });
  });

  it("falls back to the sample index under /woodpecker-generator/ when no generated manifest is present", async () => {
    const loop = createOfflineIndexLoop({ includeGeneratedManifest: false });
    await loop.install();
    loop.goOffline();

    await expect(loop.loadPuzzleIndex()).resolves.toMatchObject({
      index: "/woodpecker-generator/puzzle-index.jsonl",
    });
  });
});
