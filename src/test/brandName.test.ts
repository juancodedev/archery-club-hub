import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from the project root.
const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const indexHtml = read("index.html");
const viteConfig = read("vite.config.ts");

describe("product name", () => {
  it("titles the page QuiverApp", () => {
    expect(indexHtml).toContain("<title>QuiverApp</title>");
    expect(indexHtml).toContain('<meta property="og:title" content="QuiverApp" />');
  });

  it("installs the PWA as QuiverApp", () => {
    expect(viteConfig).toContain('name: "QuiverApp"');
    expect(viteConfig).toContain('short_name: "QuiverApp"');
  });

  it("no longer uses the old product names", () => {
    for (const file of [indexHtml, viteConfig]) {
      expect(file).not.toContain("Club de Tiro con Arco");
      expect(file).not.toContain("ClubTiro");
    }
  });

  it("paints the installed app with the IFAA navy", () => {
    expect(viteConfig).toContain('theme_color: "#041E42"');
    expect(indexHtml).toContain('<meta name="theme-color" content="#041E42" />');
  });
});
