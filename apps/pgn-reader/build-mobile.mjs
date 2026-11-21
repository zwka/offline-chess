import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const mobileDirectory = join(root, "mobile");
const vendorDirectory = join(root, "mobile", "dist", "vendor");

// One framework-free connection module, also bundled directly by Trainer's Vite.
const sharedDirectory = join(mobileDirectory, "dist", "shared");
await mkdir(sharedDirectory, { recursive: true });
await cp(join(root, "../../shared/solution-study.js"), join(sharedDirectory, "solution-study.js"));
const solutionAdapter = join(mobileDirectory, "dist", "mobile", "solution-study.js");
await writeFile(solutionAdapter, (await readFile(solutionAdapter, "utf8")).replaceAll("../../../../shared/solution-study.js", "../shared/solution-study.js"));

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
