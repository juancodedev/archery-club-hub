import { describe, it, expect } from "vitest";
import { isAdmin, isPresidente, isTournamentManager } from "../permissions";

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

    describe("isTournamentManager", () => {
        it("matches the roles the tournaments RLS lets manage tournaments", () => {
            for (const role of ["gestor_torneos", "administrador", "presidente"]) {
                expect(isTournamentManager([role])).toBe(true);
            }
            expect(isTournamentManager([], true)).toBe(true);
        });

        it("leaves out other club roles", () => {
            for (const role of ["entrenador", "secretaria", "tesorero", "socio", "arquero"]) {
                expect(isTournamentManager([role])).toBe(false);
            }
        });
    });
});
