import { describe, it, expect } from "vitest";
import {
    arrowValue,
    calculateEndScore,
    calculateTotalScore,
    ifaaRingKeypad,
    validateArrowValue,
    xValueForRound,
} from "../scoringUtils";

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

    describe("IFAA indoor round", () => {
        it("scores X as 5 and still counts it for ties", () => {
            const end = ["X", "5", "4", "2", "1"];
            const result = calculateTotalScore([end], false, xValueForRound("indoor_standard"));
            expect(result.score).toBe(17);
            expect(result.xCount).toBe(1);
        });

        it("keeps X worth 10 outside the indoor round", () => {
            for (const round of [null, undefined, "field", "hunter"]) {
                expect(calculateTotalScore([["X", "9"]], false, xValueForRound(round)).score).toBe(19);
            }
        });

        it("offers X and 5 down to 1 on the indoor keypad", () => {
            expect(ifaaRingKeypad("indoor_standard")).toEqual(["X", "5", "4", "3", "2", "1", "M"]);
        });

        it("keeps 5, 4, 3 and M on the field and hunter keypads", () => {
            for (const round of ["field", "hunter", "field_expert", "flint_indoor"]) {
                expect(ifaaRingKeypad(round)).toEqual(["5", "4", "3", "M"]);
            }
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
