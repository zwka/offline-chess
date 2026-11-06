import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("../", import.meta.url));
const distDir = fileURLToPath(new URL("../dist/", import.meta.url));
const publicDir = fileURLToPath(new URL("../public/", import.meta.url));
const landingDir = fileURLToPath(new URL("../landing/", import.meta.url));
const blindChessDir = fileURLToPath(new URL("../apps/blind-chess/", import.meta.url));
const blindChessDistDir = fileURLToPath(new URL("../apps/blind-chess/dist/", import.meta.url));
const suiteBlindChessDistDir = fileURLToPath(new URL("../dist/blind-chess/", import.meta.url));

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

await cp(publicDir, distDir, { recursive: true });
await cp(landingDir, distDir, { recursive: true });

if (!existsSync(fileURLToPath(new URL("../apps/blind-chess/node_modules", import.meta.url)))) {
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
