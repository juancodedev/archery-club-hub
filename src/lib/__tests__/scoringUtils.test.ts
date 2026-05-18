import { describe, it, expect } from "vitest";
import { arrowValue, calculateEndScore, calculateTotalScore, validateArrowValue } from "../scoringUtils";

describe("scoringUtils", () => {
    describe("arrowValue", () => {
        it("should return 10 for X", () => {
            expect(arrowValue("X")).toBe(10);
            expect(arrowValue("x")).toBe(10);
        });

        it("should return 0 for M or -", () => {
            expect(arrowValue("M")).toBe(0);
            expect(arrowValue("-")).toBe(0);
            expect(arrowValue("")).toBe(0);
        });

        it("should return numeric value for digits", () => {
            expect(arrowValue("9")).toBe(9);
            expect(arrowValue("10")).toBe(10);
            expect(arrowValue("0")).toBe(0);
        });

        it("should return 0 for invalid values", () => {
            expect(arrowValue("invalid")).toBe(0);
            expect(arrowValue("21")).toBe(0);
        });

        it("should support IFAA values up to 20", () => {
            expect(arrowValue("20")).toBe(20);
            expect(arrowValue("18")).toBe(18);
            expect(arrowValue("12")).toBe(12);
        });
    });

    describe("calculateEndScore", () => {
        it("should calculate total score and X count correctly", () => {
            const arrows = ["X", "10", "9", "8", "7", "M"];
            const result = calculateEndScore(arrows);
            expect(result.score).toBe(44);
            expect(result.xCount).toBe(1);
            expect(result.tensCount).toBe(2);
        });

        it("should calculate IFAA round ends correctly", () => {
            const animalEnd = ["20", "M", "M"];
            const result = calculateEndScore(animalEnd);
            expect(result.score).toBe(20);
        });
    });

    describe("validateArrowValue", () => {
        it("should validate allowed characters", () => {
            expect(validateArrowValue("X")).toBe(true);
            expect(validateArrowValue("M")).toBe(true);
            expect(validateArrowValue("10")).toBe(true);
            expect(validateArrowValue("5")).toBe(true);
            expect(validateArrowValue("20")).toBe(true);
            expect(validateArrowValue("21")).toBe(false);
            expect(validateArrowValue("A")).toBe(false);
        });
    });
});
