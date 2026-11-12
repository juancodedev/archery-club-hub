import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "../safeRedirect";

describe("safeRedirectPath", () => {
  it("keeps an in-app path with its query string", () => {
    expect(safeRedirectPath("/attendance/checkin?club_id=abc")).toBe("/attendance/checkin?club_id=abc");
  });

  it.each([
    ["an absolute URL", "https://evil.example"],
    ["a protocol-relative URL", "//evil.example"],
    ["a backslash after the slash", "/\\evil.example"],
    ["a backslash anywhere", "/ok\\..\\evil"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a relative path", "dashboard"],
    ["a control character", "/\t/evil.example"],
  ])("rejects %s", (_name, value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });

  it("rejects a missing value", () => {
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath("")).toBeNull();
  });
});
