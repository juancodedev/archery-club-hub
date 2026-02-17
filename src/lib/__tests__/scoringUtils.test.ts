import { describe, it, expect } from "vitest";
import {
    arrowValue,
    calculateEndScore,
    calculateTotalScore,
    validateArrowValue,
    formatArrowValue,
    getArrowColor,
} from "../scoringUtils";

describe("scoringUtils", () => {
    describe("arrowValue", () => {
        it("should return 10 for X in indoor", () => {
            expect(arrowValue("X", true)).toBe(10);
        });

        it("should return 10 for X in outdoor", () => {
            expect(arrowValue("X", false)).toBe(10);
        });

        it("should return 0 for M", () => {
            expect(arrowValue("M", false)).toBe(0);
        });

        it("should return 0 for empty string", () => {
            expect(arrowValue("", false)).toBe(0);
        });

        it("should return 0 for dash", () => {
            expect(arrowValue("-", false)).toBe(0);
        });

        it("should return correct value for numeric strings", () => {
            expect(arrowValue("10", false)).toBe(10);
            expect(arrowValue("9", false)).toBe(9);
            expect(arrowValue("5", false)).toBe(5);
            expect(arrowValue("0", false)).toBe(0);
        });

        it("should return 0 for invalid values", () => {
            expect(arrowValue("11", false)).toBe(0);
            expect(arrowValue("-1", false)).toBe(0);
            expect(arrowValue("abc", false)).toBe(0);
        });

        it("should be case insensitive", () => {
            expect(arrowValue("x", false)).toBe(10);
            expect(arrowValue("m", false)).toBe(0);
        });
    });

    describe("calculateEndScore", () => {
        it("should correctly calculate score with X in indoor", () => {
            const result = calculateEndScore(["X", "X", "10", "9", "8"], true);
            expect(result.score).toBe(47); // 10+10+10+9+8
            expect(result.xCount).toBe(2);
            expect(result.tensCount).toBe(3); // 2 X's + 1 ten
        });

        it("should correctly calculate score with X in outdoor", () => {
            const result = calculateEndScore(["X", "X", "10", "9", "8"], false);
            expect(result.score).toBe(47); // Same as indoor
            expect(result.xCount).toBe(2);
            expect(result.tensCount).toBe(3);
        });

        it("should handle mixed values correctly", () => {
            const result = calculateEndScore(["X", "10", "9", "M", "7"], false);
            expect(result.score).toBe(36); // 10+10+9+0+7
            expect(result.xCount).toBe(1);
            expect(result.tensCount).toBe(2);
        });

        it("should handle all misses", () => {
            const result = calculateEndScore(["M", "M", "M"], false);
            expect(result.score).toBe(0);
            expect(result.xCount).toBe(0);
            expect(result.tensCount).toBe(0);
        });

        it("should handle perfect score", () => {
            const result = calculateEndScore(["X", "X", "X", "X", "X"], false);
            expect(result.score).toBe(50);
            expect(result.xCount).toBe(5);
            expect(result.tensCount).toBe(5);
        });

        it("should handle empty arrows", () => {
            const result = calculateEndScore(["", "", ""], false);
            expect(result.score).toBe(0);
            expect(result.xCount).toBe(0);
        });
    });

    describe("calculateTotalScore", () => {
        it("should calculate total for multiple ends", () => {
            const ends = [
                ["X", "10", "9", "8", "7"], // 44
                ["10", "9", "9", "8", "7"],  // 43
                ["X", "X", "10", "10", "9"], // 49
            ];
            const result = calculateTotalScore(ends, false);
            expect(result.score).toBe(136);
            expect(result.xCount).toBe(3);
            expect(result.tensCount).toBe(7); // 3 X's + 4 tens
        });

        it("should handle empty ends array", () => {
            const result = calculateTotalScore([], false);
            expect(result.score).toBe(0);
            expect(result.xCount).toBe(0);
        });

        it("should calculate indoor total correctly", () => {
            const ends = [
                ["X", "X", "10"], // 30, 2X
                ["X", "10", "9"], // 29, 1X
            ];
            const result = calculateTotalScore(ends, true);
            expect(result.score).toBe(59);
            expect(result.xCount).toBe(3);
        });
    });

    describe("validateArrowValue", () => {
        it("should accept valid values", () => {
            expect(validateArrowValue("X")).toBe(true);
            expect(validateArrowValue("x")).toBe(true);
            expect(validateArrowValue("M")).toBe(true);
            expect(validateArrowValue("m")).toBe(true);
            expect(validateArrowValue("")).toBe(true);
            expect(validateArrowValue("-")).toBe(true);
            expect(validateArrowValue("10")).toBe(true);
            expect(validateArrowValue("0")).toBe(true);
            expect(validateArrowValue("5")).toBe(true);
        });

        it("should reject invalid values", () => {
            expect(validateArrowValue("11")).toBe(false);
            expect(validateArrowValue("-1")).toBe(false);
            expect(validateArrowValue("abc")).toBe(false);
            expect(validateArrowValue("XX")).toBe(false);
            expect(validateArrowValue("1.5")).toBe(false);
        });
    });

    describe("formatArrowValue", () => {
        it("should format empty values as dash", () => {
            expect(formatArrowValue("")).toBe("—");
            expect(formatArrowValue("-")).toBe("—");
        });

        it("should preserve X and M", () => {
            expect(formatArrowValue("X")).toBe("X");
            expect(formatArrowValue("x")).toBe("X");
            expect(formatArrowValue("M")).toBe("M");
            expect(formatArrowValue("m")).toBe("M");
        });

        it("should preserve numeric values", () => {
            expect(formatArrowValue("10")).toBe("10");
            expect(formatArrowValue("5")).toBe("5");
        });
    });

    describe("getArrowColor", () => {
        it("should return yellow for X", () => {
            const color = getArrowColor("X");
            expect(color).toContain("yellow");
            expect(color).toContain("bold");
        });

        it("should return yellow for 10", () => {
            const color = getArrowColor("10");
            expect(color).toContain("yellow");
        });

        it("should return green for 9", () => {
            const color = getArrowColor("9");
            expect(color).toContain("green");
        });

        it("should return blue for 7-8", () => {
            expect(getArrowColor("8")).toContain("blue");
            expect(getArrowColor("7")).toContain("blue");
        });

        it("should return gray for 5-6", () => {
            expect(getArrowColor("6")).toContain("gray");
            expect(getArrowColor("5")).toContain("gray");
        });

        it("should return red for miss", () => {
            expect(getArrowColor("0")).toContain("red");
            expect(getArrowColor("M")).toContain("red");
        });
    });
});
