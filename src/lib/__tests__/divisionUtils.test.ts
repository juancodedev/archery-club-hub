import { describe, it, expect } from "vitest";
import { calculateAge, getDivisionSuggestions } from "../divisionUtils";

describe("divisionUtils", () => {
    describe("calculateAge", () => {
        it("should return correct age for a past date", () => {
            const birthDate = new Date();
            birthDate.setFullYear(birthDate.getFullYear() - 25);
            const age = calculateAge(birthDate.toISOString());
            expect(age).toBe(25);
        });

        it("should return 0 for today's birth date", () => {
            const today = new Date().toISOString();
            const age = calculateAge(today);
            expect(age).toBe(0);
        });

        it("should handle birthday earlier this year", () => {
            const date = new Date();
            date.setFullYear(date.getFullYear() - 10);
            date.setMonth(0); // January
            date.setDate(1); // January 1st
            const age = calculateAge(date.toISOString());
            expect(age).toBeGreaterThanOrEqual(9);
        });
    });

    describe("getDivisionSuggestions", () => {
        it("should suggest Cadete for age < 15 and recurvo", () => {
            const suggestions = getDivisionSuggestions(14, "recurvo");
            expect(suggestions).toContain("RCC");
            expect(suggestions).toContain("RC");
        });

        it("should suggest Junior for age < 18 and recurvo", () => {
            const suggestions = getDivisionSuggestions(16, "recurvo");
            expect(suggestions).toContain("RCJ");
            expect(suggestions).toContain("RC");
        });

        it("should suggest only base for adult recurvo", () => {
            const suggestions = getDivisionSuggestions(25, "recurvo");
            expect(suggestions).toEqual(["RC"]);
        });

        it("should suggest base prefixes for compuesto", () => {
            const suggestions = getDivisionSuggestions(25, "compuesto");
            expect(suggestions).toEqual(["CO"]);
        });

        it("should suggest multiple bases if no bow type provided", () => {
            const suggestions = getDivisionSuggestions(25);
            expect(suggestions).toEqual(["RC", "CO", "BB", "LB"]);
        });
    });
});
