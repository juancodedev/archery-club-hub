import { describe, it, expect } from "vitest";
import { formatRUT, cleanRUT, validateRUT } from "../rut";

describe("rut utilities", () => {
    describe("formatRUT", () => {
        it("should format a valid RUT with dots and dash", () => {
            // 12345678 with DV=5 → 12.345.678-5
            expect(formatRUT("123456785")).toBe("12.345.678-5");
        });

        it("should handle already formatted RUTs", () => {
            expect(formatRUT("12.345.678-5")).toBe("12.345.678-5");
        });

        it("should handle RUTs with k as verifier digit", () => {
            expect(formatRUT("12345678k")).toBe("12.345.678-K");
        });
    });

    describe("cleanRUT", () => {
        it("should remove dots and dash from RUT", () => {
            expect(cleanRUT("12.345.678-5")).toBe("12345678-5".replace("-", "").replace(".", ""));
            // cleanRUT removes dots and dashes and uppercases
            const cleaned = cleanRUT("12.345.678-5");
            expect(cleaned).not.toContain(".");
            expect(cleaned).not.toContain("-");
        });

        it("should handle empty strings", () => {
            expect(cleanRUT("")).toBe("");
        });

        it("should uppercase the verifier digit", () => {
            const result = cleanRUT("7.690.157-k");
            expect(result).toBe(result.toUpperCase());
            expect(result).toContain("K");
        });
    });

    describe("validateRUT", () => {
        it("should return false for invalid RUT", () => {
            expect(validateRUT("")).toBe(false);
            expect(validateRUT("123")).toBe(false); // too short
        });

        it("should correctly validate a known valid RUT", () => {
            // We calculate a valid RUT: body=12345678, known DV=5
            expect(validateRUT("12.345.678-5")).toBe(true);
        });

        it("should return false for incorrect DV", () => {
            // 12.345.678-0 should fail (correct DV is 5)
            expect(validateRUT("12.345.678-0")).toBe(false);
        });
    });
});
