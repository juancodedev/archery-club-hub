import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Vitest runs from the project root.
const app = readFileSync(resolve(process.cwd(), "src/App.tsx"), "utf8");

function guardFor(path: string): string | null {
  const route = app.match(new RegExp(`path="${path}"\\s*element=\\{<ProtectedRoute([^>]*)>`));
  if (!route) throw new Error(`route ${path} not found in App.tsx`);
  return route[1].match(/allow=\{(\w+)\}/)?.[1] ?? null;
}

// Each admin page is guarded by the same permission that shows it in the AppLayout menu.
const EXPECTED: Record<string, string> = {
  "/admin": "isSecretaria",
  "/admin/memberships": "isTesorero",
  "/admin/finances": "isTesorero",
  "/billing": "isTesorero",
  "/settings": "isPresidente",
  "/reports": "isPresidente",
  "/admin/divisions": "isAdmin",
  "/admin/tournament-types": "isAdmin",
  "/admin/tournaments": "isAdmin",
};

describe("admin route guards", () => {
  for (const [path, guard] of Object.entries(EXPECTED)) {
    it(`guards ${path} with ${guard}`, () => {
      expect(guardFor(path)).toBe(guard);
    });
  }

  it("leaves member pages open to every club member", () => {
    for (const path of ["/dashboard", "/profile", "/birthdays"]) {
      expect(guardFor(path)).toBeNull();
    }
  });
});
