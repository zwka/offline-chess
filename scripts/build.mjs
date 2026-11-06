import { execFileSync } from "node:child_process";
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);
const publicDir = new URL("../public/", import.meta.url);
const landingDir = new URL("../landing/", import.meta.url);
const woodpeckerDir = new URL("../apps/woodpecker/", import.meta.url);
const generatorDistDir = new URL("../apps/woodpecker/apps/generator/dist/", import.meta.url);
const trainerDistDir = new URL("../apps/woodpecker/apps/trainer/dist/", import.meta.url);

await rm(fileURLToPath(distDir), { recursive: true, force: true });
await mkdir(fileURLToPath(distDir), { recursive: true });

await cp(fileURLToPath(publicDir), fileURLToPath(distDir), { recursive: true });
await cp(fileURLToPath(landingDir), fileURLToPath(distDir), { recursive: true });

execFileSync("npm", ["--prefix", fileURLToPath(woodpeckerDir), "run", "build"], {
  cwd: fileURLToPath(rootDir),
  stdio: "inherit",
});

const outGeneratorDir = new URL("./woodpecker-generator/", distDir);
const outTrainerDir = new URL("./woodpecker-trainer/", distDir);

await cp(fileURLToPath(generatorDistDir), fileURLToPath(outGeneratorDir), { recursive: true });
await cp(fileURLToPath(trainerDistDir), fileURLToPath(outTrainerDir), { recursive: true });

for (const toolOutDir of [outGeneratorDir, outTrainerDir]) {
  await rm(fileURLToPath(new URL("./manifest.webmanifest", toolOutDir)), { force: true });
  await rm(fileURLToPath(new URL("./sw.js", toolOutDir)), { force: true });
}
