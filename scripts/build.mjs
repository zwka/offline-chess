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
