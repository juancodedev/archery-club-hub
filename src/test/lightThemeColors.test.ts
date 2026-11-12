import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from the project root.
const DIRS = ["src/pages", "src/components"].map((dir) => join(process.cwd(), dir));
// Translucent white surfaces and light -400 text only show on a dark page; on the
// light theme they vanish or fail contrast. Use theme tokens (border-border, bg-muted,
// text-primary) instead. Dark-by-design areas (super admin) and UI primitives are excluded.
const DARK_ONLY = /\b(?:hover:)?(?:bg|border)-white\/(?:5|10)\b|\btext-(?:blue|amber|emerald|yellow|green|red)-400\b/g;
const EXCLUDED = /\/(?:__tests__|ui|super-admin)\/|SuperAdminPage\.tsx$/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("light theme colors", () => {
  it("uses no dark-only translucent white or light -400 text on app screens", () => {
    const offenders = DIRS.flatMap(sourceFiles)
      .filter((path) => !EXCLUDED.test(path))
      .flatMap((path) =>
        (readFileSync(path, "utf8").match(DARK_ONLY) ?? []).map((cls) => `${relative(process.cwd(), path)}: ${cls}`),
      );
    expect(offenders).toEqual([]);
  });
});
