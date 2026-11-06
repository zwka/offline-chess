import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = fileURLToPath(new URL("../icon_knight.jpeg", import.meta.url));
const publicDirectory = new URL("../public/", import.meta.url);

await mkdir(publicDirectory, { recursive: true });

// Extract the centered squircle area so standard icons fill the frame cleanly,
// matching Woodpecker's icon-512.png / apple-touch-icon.png / favicon-32.png.
const cropRegion = { left: 148, top: 148, width: 728, height: 728 };

const standardIcons = [
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

for (const [name, size] of standardIcons) {
  const output = fileURLToPath(new URL(name, publicDirectory));
  await sharp(source)
    .extract(cropRegion)
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(output);
}

// Maskable icon retains the full 1024x1024 frame with safe-zone margin around the squircle.
const maskableOutput = fileURLToPath(new URL("icon-maskable-512.png", publicDirectory));
await sharp(source)
  .resize(512, 512)
  .png({ compressionLevel: 9 })
  .toFile(maskableOutput);

// Also copy Tool artwork icons into public/icons/ for the Landing Page cards.
const iconsDirectory = new URL("../public/icons/", import.meta.url);
await mkdir(iconsDirectory, { recursive: true });

const toolIcons = [
  ["blind-chess.jpeg", "../apps/blind-chess/icon_blind.jpeg"],
  ["pgn-reader.jpeg", "../apps/pgn-reader/icon_book.jpeg"],
  ["woodpecker.jpeg", "../apps/woodpecker/icon_woodpecker.jpeg"],
];

for (const [targetName, relativeSource] of toolIcons) {
  const toolSource = fileURLToPath(new URL(relativeSource, import.meta.url));
  const toolOutput = fileURLToPath(new URL(targetName, iconsDirectory));
  await sharp(toolSource)
    .resize(256, 256)
    .jpeg({ quality: 90 })
    .toFile(toolOutput);
}
