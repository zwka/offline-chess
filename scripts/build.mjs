import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");
const publicDir = join(rootDir, "public");
const landingDir = join(rootDir, "landing");
const blindChessDir = join(rootDir, "apps", "blind-chess");
const blindChessDistDir = join(blindChessDir, "dist");
const suiteBlindChessDistDir = join(distDir, "blind-chess");
const pgnReaderDir = join(rootDir, "apps", "pgn-reader");
const pgnReaderMobileDir = join(pgnReaderDir, "mobile");
const pgnReaderOutDir = join(distDir, "pgn-reader");
const woodpeckerDir = join(rootDir, "apps", "woodpecker");
const generatorDistDir = join(woodpeckerDir, "apps", "generator", "dist");
const trainerDistDir = join(woodpeckerDir, "apps", "trainer", "dist");
const suiteGeneratorDistDir = join(distDir, "woodpecker-generator");
const suiteTrainerDistDir = join(distDir, "woodpecker-trainer");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await cp(publicDir, distDir, { recursive: true });
await cp(landingDir, distDir, { recursive: true });

if (!existsSync(join(blindChessDir, "node_modules"))) {
  execFileSync("npm", ["--prefix", blindChessDir, "ci", "--prefer-offline"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

execFileSync("npm", ["--prefix", blindChessDir, "run", "build"], {
  cwd: rootDir,
  stdio: "inherit",
});

await mkdir(suiteBlindChessDistDir, { recursive: true });
await cp(blindChessDistDir, suiteBlindChessDistDir, { recursive: true });

if (!existsSync(join(pgnReaderDir, "node_modules"))) {
  execFileSync("npm", ["--prefix", pgnReaderDir, "ci", "--prefer-offline", "--ignore-scripts"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

execFileSync("npm", ["--prefix", pgnReaderDir, "run", "build:mobile"], {
  cwd: rootDir,
  stdio: "inherit",
});

await mkdir(pgnReaderOutDir, { recursive: true });
for (const entry of ["index.html", "mobile.css", "icons", "pieces", "dist"]) {
  await cp(join(pgnReaderMobileDir, entry), join(pgnReaderOutDir, entry), {
    recursive: true,
  });
}

if (!existsSync(join(woodpeckerDir, "node_modules"))) {
  execFileSync("npm", ["--prefix", woodpeckerDir, "ci", "--prefer-offline"], {
    cwd: rootDir,
    stdio: "inherit",
  });
}

execFileSync("npm", ["--prefix", woodpeckerDir, "run", "build"], {
  cwd: rootDir,
  stdio: "inherit",
});

await mkdir(suiteGeneratorDistDir, { recursive: true });
await cp(generatorDistDir, suiteGeneratorDistDir, { recursive: true });
await mkdir(suiteTrainerDistDir, { recursive: true });
await cp(trainerDistDir, suiteTrainerDistDir, { recursive: true });

for (const toolOutDir of [suiteGeneratorDistDir, suiteTrainerDistDir]) {
  await rm(join(toolOutDir, "manifest.webmanifest"), { force: true });
  await rm(join(toolOutDir, "sw.js"), { force: true });
}

const EXCLUDED_PRECACHE_PATHS = new Set([
  "/sw.js",
  "/woodpecker-generator/puzzle-index.generated.jsonl.gz",
  "/woodpecker-generator/puzzle-index.generated-manifest.json",
]);

async function collectDistFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectDistFiles(fullPath)));
    } else if (entry.isFile()) {
      const urlPath = "/" + relative(distDir, fullPath).replace(/\\/g, "/");
      if (!EXCLUDED_PRECACHE_PATHS.has(urlPath)) {
        files.push(urlPath);
      }
    }
  }
  return files.sort();
}

const distFiles = await collectDistFiles(distDir);
const hash = createHash("sha256");
for (const urlPath of distFiles) {
  hash.update(urlPath);
  hash.update(await readFile(join(distDir, urlPath.slice(1))));
}
const buildHash = hash.digest("hex").slice(0, 12);

const directoryRoutes = [
  "/",
  "/blind-chess/",
  "/pgn-reader/",
  "/woodpecker-generator/",
  "/woodpecker-trainer/",
];
const precacheUrls = [...new Set([...directoryRoutes, ...distFiles])];

const swSource = `const CACHE_PREFIX = "offline-chess-suite-";
const CACHE = "offline-chess-suite-v1-${buildHash}";
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};
const TOOL_SHELLS = [
  "/blind-chess/",
  "/pgn-reader/",
  "/woodpecker-generator/",
  "/woodpecker-trainer/",
];

function resolveNavigationShell(pathname) {
  for (const prefix of TOOL_SHELLS) {
    const bare = prefix.slice(0, -1);
    if (pathname === bare || pathname.startsWith(prefix)) {
      return \`\${prefix}index.html\`;
    }
  }
  return "/index.html";
}

function createHeadResponse(response) {
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function fromCache(request) {
  const matchCachedUrl = async (urlOrPath) => {
    const resolved = new URL(urlOrPath, self.location.origin);
    return (
      (await caches.match(new Request(resolved.href, { method: "GET" }), { ignoreVary: true })) ??
      (await caches.match(resolved.pathname, { ignoreVary: true }))
    );
  };

  const url = new URL(request.url);
  let cached = await matchCachedUrl(url.pathname);

  if (!cached && url.pathname.endsWith("/")) {
    cached = await matchCachedUrl(\`\${url.pathname}index.html\`);
  }

  if (!cached && (request.mode === "navigate" || request.destination === "document")) {
    const shellPath = resolveNavigationShell(url.pathname);
    cached = (await matchCachedUrl(shellPath)) ?? (await matchCachedUrl("/"));
  }

  if (!cached) return undefined;
  return request.method === "HEAD" ? createHeadResponse(cached) : cached;
}

async function generatedIndexHeadResponse(url) {
  const request = new Request(url, { method: "GET" });
  try {
    const cached =
      (await caches.match(request, { ignoreVary: true })) ??
      (await caches.match(new URL(url).pathname, { ignoreVary: true }));
    if (cached) return createHeadResponse(cached);

    if (self.navigator && self.navigator.onLine === false) {
      return new Response("Offline", { status: 503 });
    }

    const response = await fetch(request);
    const headResponse = createHeadResponse(response);
    if (!response.ok) return headResponse;
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
    return headResponse;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE_URLS.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response);
        }
      } catch {
        // Ignore transient install fetch failure in isolated test environments.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" && event.request.method !== "HEAD") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  const isGeneratedIndexHead =
    event.request.method === "HEAD" &&
    requestUrl.pathname === "/woodpecker-generator/puzzle-index.generated.jsonl.gz";

  event.respondWith((async () => {
    if (isGeneratedIndexHead) {
      return generatedIndexHeadResponse(event.request.url);
    }

    if (self.navigator && self.navigator.onLine === false) {
      const cached = await fromCache(event.request);
      if (cached) return cached;
      return new Response("Offline", { status: 503 });
    }

    try {
      const response = await fetch(event.request);
      if (response.ok && event.request.method === "GET") {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
      }
      if (!response.ok) {
        return (await fromCache(event.request)) ?? response;
      }
      return response;
    } catch {
      const cached = await fromCache(event.request);
      if (cached) return cached;
      return new Response("Offline", { status: 503 });
    }
  })());
});
`;

await writeFile(join(distDir, "sw.js"), swSource, "utf8");

