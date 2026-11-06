import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const distRoot = resolve(fileURLToPath(new URL("../dist", import.meta.url)));

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".gz": "application/gzip",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

const rawPort = process.env.OFFLINE_CHESS_PORT ?? process.env.PORT ?? "4170";
const port = Number.parseInt(rawPort, 10) || 4170;
const host = process.env.OFFLINE_CHESS_HOST ?? "127.0.0.1";

const server = createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);
    const pathname = decodeURIComponent(requestUrl.pathname);

    let filePath = resolve(join(distRoot, pathname.replace(/^\/+/, "")));
    if (!filePath.startsWith(distRoot)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    let fileStats = await stat(filePath).catch(() => null);
    if (fileStats && fileStats.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileStats = await stat(filePath).catch(() => null);
    }

    if (!fileStats || !fileStats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": String(fileStats.size),
      "Cache-Control": "no-cache",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const content = await readFile(filePath);
    res.end(content);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(error instanceof Error ? error.message : "Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`Offline Chess preview server listening at http://${host}:${port}`);
});
