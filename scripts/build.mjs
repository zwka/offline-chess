import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
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
