import { describe, it, expect } from "vitest";
import { calculateAge } from "../divisionUtils";

describe("divisionUtils", () => {
    describe("calculateAge", () => {
        it("should calculate age correctly from Date object", () => {
            const birthDate = new Date("2000-01-01");
            const age = calculateAge(birthDate);
            const expectedAge = new Date().getFullYear() - 2000;
            expect(age).toBe(expectedAge);
        });

        it("should calculate age correctly from string", () => {
            const birthDate = "2005-06-15";
            const age = calculateAge(birthDate);
            const expectedAge = new Date().getFullYear() - 2005;
            // Age might be -1 if birthday hasn't occurred this year
            expect(age).toBeGreaterThanOrEqual(expectedAge - 1);
            expect(age).toBeLessThanOrEqual(expectedAge);
        });

        it("should handle birthday not yet occurred this year", () => {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 15);
            const birthYear = today.getFullYear() - 25;
            const birthDate = new Date(birthYear, nextMonth.getMonth(), nextMonth.getDate());

            const age = calculateAge(birthDate);
            // If birthday is in the future this year, age should be 24, not 25
            expect(age).toBe(24);
        });

        it("should handle birthday already occurred this year", () => {
            const today = new Date();
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 15);
            const birthYear = today.getFullYear() - 25;
            const birthDate = new Date(birthYear, lastMonth.getMonth(), lastMonth.getDate());

            const age = calculateAge(birthDate);
            expect(age).toBe(25);
        });

        it("should handle same day birthday (birthday is today)", () => {
            const today = new Date();
            const birthYear = today.getFullYear() - 30;
            const birthDate = new Date(birthYear, today.getMonth(), today.getDate());

            const age = calculateAge(birthDate);
            expect(age).toBe(30);
        });

        it("should handle very young ages", () => {
            const lastYear = new Date().getFullYear() - 1;
            const birthDate = new Date(lastYear, 0, 1);
            const age = calculateAge(birthDate);
            expect(age).toBeGreaterThanOrEqual(0);
            expect(age).toBeLessThanOrEqual(2);
        });

        it("should handle very old ages", () => {
            const birthDate = new Date("1950-01-01");
            const age = calculateAge(birthDate);
            expect(age).toBeGreaterThan(70);
        });
    });
});
