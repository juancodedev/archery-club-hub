import { describe, it, expect } from "vitest";
import { cn, formatCurrency, parseChileanCurrency } from "../utils";

describe("utils", () => {
    describe("cn (className merger)", () => {
        it("should merge class names", () => {
            expect(cn("foo", "bar")).toBe("foo bar");
        });

        it("should handle conditional classes", () => {
            const active = true;
            const result = cn("base", active && "active");
            expect(result).toContain("base");
            expect(result).toContain("active");
        });

        it("should deduplicate Tailwind classes", () => {
            // twMerge should resolve conflicting classes
            const result = cn("p-4", "p-8");
            expect(result).toBe("p-8");
        });
    });

    describe("formatCurrency", () => {
        it("should format numbers as Chilean peso currency", () => {
            const result = formatCurrency(1000);
            expect(result).toContain("$");
            expect(result).toContain("1");
        });

        it("should format zero correctly", () => {
            const result = formatCurrency(0);
            expect(result).toContain("$");
        });

        it("should format large numbers", () => {
            const result = formatCurrency(1000000);
            expect(result).toContain("$");
        });
    });

    describe("parseChileanCurrency", () => {
        it("should parse Chilean formatted currency strings", () => {
            // Chilean format uses dots as thousands separator
            expect(parseChileanCurrency("1.000")).toBe(1000);
            expect(parseChileanCurrency("1.000.000")).toBe(1000000);
        });

        it("should handle empty string", () => {
            expect(parseChileanCurrency("")).toBe(0);
        });

        it("should handle plain numbers", () => {
            expect(parseChileanCurrency("500")).toBe(500);
        });
    });
});
