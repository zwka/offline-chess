import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const mobileDirectory = join(root, "mobile");
const vendorDirectory = join(root, "mobile", "dist", "vendor");

await mkdir(vendorDirectory, { recursive: true });
await cp(
  join(root, "node_modules", "chess.js", "dist", "esm", "chess.js"),
  join(vendorDirectory, "chess.js"),
  { force: true },
);
await cp(
  join(root, "node_modules", "chess.js", "src", "pgn.js"),
  join(vendorDirectory, "pgn.js"),
  { force: true },
);

await rm(join(mobileDirectory, "service-worker.js"), { force: true });
await rm(join(mobileDirectory, "manifest.webmanifest"), { force: true });
