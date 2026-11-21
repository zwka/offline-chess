import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDirectory = new URL("../public/", import.meta.url);
await mkdir(publicDirectory, { recursive: true });
const symbols = await readFile(new URL("identity/symbols.svg", publicDirectory), "utf8");
const board = symbols.match(/<symbol id="open-board"[^>]*>([\s\S]*?)<\/symbol>/)[1];

// The maskable mark lies entirely inside the central 80%-diameter safe circle.
function artwork(maskable = false, monochrome = false) {
  const size = maskable ? 320 : 448;
  const offset = (512 - size) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    ${monochrome ? "" : '<rect width="512" height="512" rx="0" fill="#191c1c"/>'}
    <svg x="${offset}" y="${offset}" width="${size}" height="${size}" viewBox="0 0 64 64" color="${monochrome ? "#000" : "#e1bc78"}">${board}</svg>
  </svg>`;
}
for (const [name, size, maskable] of [
  ["favicon-32.png", 32, false],
  ["apple-touch-icon.png", 180, false],
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
]) {
  await sharp(Buffer.from(artwork(maskable))).resize(size, size).png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(name, publicDirectory)));
}
await writeFile(new URL("identity/open-board.svg", publicDirectory), artwork());
await writeFile(new URL("identity/open-board-mono.svg", publicDirectory), artwork(false, true));
