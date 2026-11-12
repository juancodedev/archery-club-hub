import { describe, it, expect } from "vitest";
import {
    arrowValue,
    calculateEndScore,
    calculateTotalScore,
    ifaaArrowsPerEnd,
    ifaaRingKeypad,
    ringFace,
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

        it("keeps 5, 4, 3 and M on the field, hunter and flint keypads", () => {
            for (const round of ["field", "hunter", "flint_indoor"]) {
                expect(ifaaRingKeypad(round)).toEqual(["5", "4", "3", "M"]);
            }
        });
    });

    describe("IFAA field expert round", () => {
        it("scores X as 5 and still counts it for ties", () => {
            const end = ["X", "4", "2", "1"];
            const result = calculateTotalScore([end], false, xValueForRound("field_expert"));
            expect(result.score).toBe(12);
            expect(result.xCount).toBe(1);
        });

        it("offers X and 5 down to 1 on the keypad", () => {
            expect(ifaaRingKeypad("field_expert")).toEqual(["X", "5", "4", "3", "2", "1", "M"]);
        });
    });

    describe("ifaaArrowsPerEnd", () => {
        it("uses five arrows per end in the indoor round", () => {
            expect(ifaaArrowsPerEnd("indoor_standard", 4)).toBe(5);
        });

        it("keeps the arrows per end of the other IFAA rounds", () => {
            expect(ifaaArrowsPerEnd("field", 6)).toBe(4);
            expect(ifaaArrowsPerEnd("hunter", 6)).toBe(4);
            expect(ifaaArrowsPerEnd("field_expert", 6)).toBe(4);
            expect(ifaaArrowsPerEnd("flint_indoor", 6)).toBe(4);
            expect(ifaaArrowsPerEnd("animal_2d", 6)).toBe(3);
            expect(ifaaArrowsPerEnd("animal_3d", 6)).toBe(3);
            expect(ifaaArrowsPerEnd("3d_hunting", 6)).toBe(1);
            expect(ifaaArrowsPerEnd("3d_standard", 6)).toBe(2);
        });

        it("uses the tournament type setting outside IFAA rounds", () => {
            expect(ifaaArrowsPerEnd(null, 6)).toBe(6);
        });
    });

    describe("ringFace", () => {
        it("paints field values like the field face: black spot, white ring, black outer ring", () => {
            expect(["5", "4", "3"].map((v) => ringFace("field", v))).toEqual(["black", "white", "black"]);
        });

        it("paints hunter values like the hunter face: white spot on black", () => {
            expect(["5", "4", "3"].map((v) => ringFace("hunter", v))).toEqual(["white", "black", "black"]);
        });

        it("paints indoor X and 5 white and 4 down to 1 navy", () => {
            expect(["X", "5", "4", "3", "2", "1"].map((v) => ringFace("indoor_standard", v))).toEqual([
                "white", "white", "navy", "navy", "navy", "navy",
            ]);
        });

        it("paints field expert like the field face split in two: white X, black 5, white 4 and 3, black 2 and 1", () => {
            expect(["X", "5", "4", "3", "2", "1"].map((v) => ringFace("field_expert", v))).toEqual([
                "white", "black", "white", "white", "black", "black",
            ]);
        });

        it("paints flint like the field face it is shot on", () => {
            expect(["5", "4", "3"].map((v) => ringFace("flint_indoor", v))).toEqual(["black", "white", "black"]);
        });

        it("keeps animal, 3D and non-IFAA values neutral", () => {
            expect(ringFace("animal_2d", "20")).toBe("neutral");
            expect(ringFace("3d_standard", "10")).toBe("neutral");
            expect(ringFace(null, "9")).toBe("neutral");
        });

        it("marks misses and empty slots in every round", () => {
            for (const round of ["field", "indoor_standard", "animal_2d", null]) {
                expect(ringFace(round, "M")).toBe("miss");
                expect(ringFace(round, "0")).toBe("miss");
                expect(ringFace(round, "")).toBe("empty");
            }
        });

        it("reads lowercase x and padded values", () => {
            expect(ringFace("indoor_standard", " x ")).toBe("white");
            expect(ringFace("field", "m")).toBe("miss");
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
