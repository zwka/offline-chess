import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const mainSource = readFileSync(new URL("./main.tsx", import.meta.url), "utf8");
const suitePublicDir = new URL("../../../../../public/", import.meta.url);

describe("Generator Suite integration metadata", () => {
  it("declares Suite browser and Apple touch icons matching the root Suite icon assets", () => {
    expect(html).toContain('rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"');
    expect(html).toContain('rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"');

    for (const [name, dimension] of [["favicon-32.png", 32], ["apple-touch-icon.png", 180]]) {
      const icon = readFileSync(new URL(`../public/${name}`, import.meta.url));
      const suiteIcon = readFileSync(new URL(name, suitePublicDir));
      expect(icon.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(icon.readUInt32BE(16)).toBe(dimension);
      expect(icon.readUInt32BE(20)).toBe(dimension);
      expect(icon.equals(suiteIcon)).toBe(true);
    }
  });

  it("defaults HTML shell metadata to the Suite dark Theme", () => {
    expect(html).toContain('<html lang="en" data-theme="dark">');
    expect(html).toContain('<meta name="theme-color" content="#172321" />');
  });

  it("removes standalone web manifest and per-Tool service worker registration", () => {
    expect(html).not.toContain('rel="manifest"');
    expect(existsSync(new URL("../public/manifest.webmanifest", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../public/sw.js", import.meta.url))).toBe(false);
    expect(mainSource).not.toContain("serviceWorker.register");
  });
});
