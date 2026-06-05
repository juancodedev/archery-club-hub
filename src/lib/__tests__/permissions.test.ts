import { describe, it, expect } from "vitest";
import { isAdmin, isPresidente } from "../permissions";

describe("permissions", () => {
    const adminRoles = ["administrador"];
    const memberRoles = ["socio"];
    const presidentRoles = ["presidente"];

    describe("isAdmin", () => {
        it("should return true for super admin", () => {
            expect(isAdmin([], true)).toBe(true);
        });

        it("should return true for administrator role", () => {
            expect(isAdmin(adminRoles)).toBe(true);
        });

        it("should return false for regular member", () => {
            expect(isAdmin(memberRoles)).toBe(false);
        });
    });

    describe("isPresidente", () => {
        it("should return true for presidente or administrador", () => {
            expect(isPresidente(presidentRoles)).toBe(true);
            expect(isPresidente(adminRoles)).toBe(true);
        });

        it("should return false for others", () => {
            expect(isPresidente(memberRoles)).toBe(false);
        });
    });
});
