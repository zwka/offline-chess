import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rootDir = new URL("../", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);
const publicDir = new URL("../public/", import.meta.url);
const landingDir = new URL("../landing/", import.meta.url);

await rm(fileURLToPath(distDir), { recursive: true, force: true });
await mkdir(fileURLToPath(distDir), { recursive: true });

await cp(fileURLToPath(publicDir), fileURLToPath(distDir), { recursive: true });
await cp(fileURLToPath(landingDir), fileURLToPath(distDir), { recursive: true });
