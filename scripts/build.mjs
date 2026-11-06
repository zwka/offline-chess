import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = join(rootDir, "dist");
const publicDir = join(rootDir, "public");
const landingDir = join(rootDir, "landing");
const pgnReaderDir = join(rootDir, "apps", "pgn-reader");
const pgnReaderMobileDir = join(pgnReaderDir, "mobile");
const pgnReaderOutDir = join(distDir, "pgn-reader");

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await cp(publicDir, distDir, { recursive: true });
await cp(landingDir, distDir, { recursive: true });

execFileSync("npm", ["run", "build:mobile"], {
  cwd: pgnReaderDir,
  stdio: "inherit",
});

await mkdir(pgnReaderOutDir, { recursive: true });
for (const entry of ["index.html", "mobile.css", "icons", "pieces", "dist"]) {
  await cp(join(pgnReaderMobileDir, entry), join(pgnReaderOutDir, entry), {
    recursive: true,
  });
}
