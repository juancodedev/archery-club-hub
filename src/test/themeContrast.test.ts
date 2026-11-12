import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest handles .css imports as styles, so ?raw returns nothing; read the file instead.
// Vitest runs from the project root.
const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

// WCAG 2.1 AA for normal text.
const AA = 4.5;

// Text token on its background token, as the shadcn components pair them.
const PAIRS: [text: string, background: string][] = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "background"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "card"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["sidebar-foreground", "sidebar-background"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
];

function readTheme(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`Theme block ${selector} not found in index.css`);
  const block = css.slice(start, css.indexOf("}", start));
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[name] = value.trim();
  return tokens;
}

function luminance(hsl: string): number {
  const match = hsl.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!match) throw new Error(`Not an HSL triplet: ${hsl}`);
  const [h, s, l] = [Number(match[1]), Number(match[2]) / 100, Number(match[3]) / 100];
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const linear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(channel(0)) + 0.7152 * linear(channel(8)) + 0.0722 * linear(channel(4));
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([":root", ".dark"])("theme tokens in %s", (selector) => {
  const theme = readTheme(selector);

  it.each(PAIRS)("%s on %s meets WCAG AA", (text, background) => {
    expect(contrast(theme[text], theme[background])).toBeGreaterThanOrEqual(AA);
  });
});

describe("brand tokens", () => {
  it("uses IFAA navy (Pantone 282C, #041E42) as the light primary", () => {
    expect(readTheme(":root").primary).toBe("215 89% 14%");
  });
});
