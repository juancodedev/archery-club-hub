import { describe, it, expect } from "vitest";
import {
    metersToYards,
    metersToFeet,
    yardsToMeters,
    formatYards,
    formatYardsWithMeters,
    DISCIPLINES,
    BOW_TYPES,
    STANDARD_DISTANCES,
    TOURNAMENT_FORMATS,
} from "../archeryConstants";

describe("archeryConstants", () => {
    describe("metersToYards", () => {
        it("should convert 70 meters to approximately 76 yards", () => {
            const result = metersToYards(70);
            expect(result).toBeCloseTo(76.6, 0);
        });

        it("should convert 18 meters to approximately 19.7 yards", () => {
            const result = metersToYards(18);
            expect(result).toBeCloseTo(19.7, 0);
        });
    });

    describe("metersToFeet", () => {
        it("should convert 1 meter to approximately 3.3 feet", () => {
            expect(metersToFeet(1)).toBeCloseTo(3.3, 0);
        });
    });

    describe("yardsToMeters", () => {
        it("should convert yards back to meters", () => {
            const yards = metersToYards(70);
            const meters = yardsToMeters(yards);
            expect(meters).toBeCloseTo(70, 1);
        });
    });

    describe("formatYards", () => {
        it("should format yards with 'yd' suffix", () => {
            expect(formatYards(76)).toBe("76 yd");
            expect(formatYards(20)).toBe("20 yd");
        });

        it("should return '—' for null or undefined", () => {
            expect(formatYards(null)).toBe("—");
            expect(formatYards(undefined)).toBe("—");
        });
    });

    describe("formatYardsWithMeters", () => {
        it("should include both yards and meters", () => {
            const result = formatYardsWithMeters(76);
            expect(result).toContain("76 yd");
            expect(result).toContain("m");
        });

        it("should return '—' for null", () => {
            expect(formatYardsWithMeters(null)).toBe("—");
        });
    });

    describe("DISCIPLINES", () => {
        it("should contain the 4 standard archery disciplines", () => {
            const values = DISCIPLINES.map((d) => d.value);
            expect(values).toContain("outdoor");
            expect(values).toContain("indoor");
            expect(values).toContain("campo");
            expect(values).toContain("3d");
        });
    });

    describe("BOW_TYPES", () => {
        it("should include recurvo and compuesto", () => {
            const values = BOW_TYPES.map((b) => b.value);
            expect(values).toContain("recurvo");
            expect(values).toContain("compuesto");
        });
    });

    describe("STANDARD_DISTANCES", () => {
        it("should include Olympic distance (70m / 76yd)", () => {
            const olympic = STANDARD_DISTANCES.find((d) => d.yards === 76);
            expect(olympic).toBeDefined();
            expect(olympic?.discipline).toBe("outdoor");
        });

        it("should include standard indoor distance (18m / 20yd)", () => {
            const indoor = STANDARD_DISTANCES.find((d) => d.yards === 20);
            expect(indoor).toBeDefined();
            expect(indoor?.discipline).toBe("indoor");
        });
    });

    describe("TOURNAMENT_FORMATS", () => {
        it("should have at least 4 formats", () => {
            expect(TOURNAMENT_FORMATS.length).toBeGreaterThanOrEqual(4);
        });

        it("should include ranking_round format", () => {
            const ranking = TOURNAMENT_FORMATS.find((f) => f.value === "ranking_round");
            expect(ranking).toBeDefined();
        });
    });
});
