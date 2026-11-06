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
const woodpeckerDir = fileURLToPath(new URL("../apps/woodpecker/", import.meta.url));
const generatorDistDir = fileURLToPath(new URL("../apps/woodpecker/apps/generator/dist/", import.meta.url));
const trainerDistDir = fileURLToPath(new URL("../apps/woodpecker/apps/trainer/dist/", import.meta.url));
const suiteGeneratorDistDir = fileURLToPath(new URL("../dist/woodpecker-generator/", import.meta.url));
const suiteTrainerDistDir = fileURLToPath(new URL("../dist/woodpecker-trainer/", import.meta.url));

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

if (!existsSync(fileURLToPath(new URL("../apps/woodpecker/node_modules", import.meta.url)))) {
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
  await rm(fileURLToPath(new URL("../dist/" + (toolOutDir === suiteGeneratorDistDir ? "woodpecker-generator" : "woodpecker-trainer") + "/manifest.webmanifest", import.meta.url)), { force: true });
  await rm(fileURLToPath(new URL("../dist/" + (toolOutDir === suiteGeneratorDistDir ? "woodpecker-generator" : "woodpecker-trainer") + "/sw.js", import.meta.url)), { force: true });
}
