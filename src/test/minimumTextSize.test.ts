import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from the project root.
const SRC = join(process.cwd(), "src");
const TOO_SMALL = /text-\[(?:[0-9]|1[01])(?:\.\d+)?px\]/g;
// The printable IFAA card is a paper form; its tiny labels follow the printed layout.
const PRINT_CARD_FILE = "src/pages/ScoresPage.tsx";
const PRINT_CARD_START = 'className="print-scorecard';

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function screenSource(path: string): string {
  const source = readFileSync(path, "utf8");
  const file = relative(process.cwd(), path);
  if (file !== PRINT_CARD_FILE) return source;
  const start = source.indexOf(PRINT_CARD_START);
  return start === -1 ? source : source.slice(0, start);
}

describe("minimum text size", () => {
  it("uses no text below 12px on screen", () => {
    const offenders = sourceFiles(SRC).flatMap((path) =>
      (screenSource(path).match(TOO_SMALL) ?? []).map((size) => `${relative(process.cwd(), path)}: ${size}`),
    );
    expect(offenders).toEqual([]);
  });
});
