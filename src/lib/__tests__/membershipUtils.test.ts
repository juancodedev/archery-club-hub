import { describe, it, expect } from "vitest";
import {
    isMembershipCategory,
    isInscriptionCategory,
    calculateFinancialStatus,
} from "../membershipUtils";

describe("membershipUtils", () => {
    describe("isMembershipCategory", () => {
        it("should return true for membership related categories", () => {
            expect(isMembershipCategory("membresía")).toBe(true);
            expect(isMembershipCategory("Membresía")).toBe(true);
            expect(isMembershipCategory("membresia")).toBe(true);
            expect(isMembershipCategory("cuota mensual")).toBe(true);
            expect(isMembershipCategory("Cuota Mensual")).toBe(true);
        });

        it("should return false for non-membership categories", () => {
            expect(isMembershipCategory("inscripción")).toBe(false);
            expect(isMembershipCategory("otro")).toBe(false);
            expect(isMembershipCategory("")).toBe(false);
        });
    });

    describe("isInscriptionCategory", () => {
        it("should return true for inscription categories", () => {
            expect(isInscriptionCategory("inscripción")).toBe(true);
            expect(isInscriptionCategory("Inscripción")).toBe(true);
            expect(isInscriptionCategory("inscripcion")).toBe(true);
            expect(isInscriptionCategory("membresía inicial")).toBe(true);
        });

        it("should return false for non-inscription categories", () => {
            expect(isInscriptionCategory("membresía")).toBe(false);
            expect(isInscriptionCategory("")).toBe(false);
        });
    });

    describe("calculateFinancialStatus", () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        it("should return 'cargando' for null member", () => {
            expect(calculateFinancialStatus(null, [])).toBe("cargando");
        });

        it("should return 'vigente' for inactive member", () => {
            const member = {
                status: "inactivo",
                enrollment_date: "2024-01-01",
            };
            expect(calculateFinancialStatus(member, [])).toBe("vigente");
        });

        it("should return 'vigente' when member has paid current month", () => {
            const enrollmentDate = new Date(today);
            enrollmentDate.setFullYear(today.getFullYear() - 1);
            const member = {
                status: "activo",
                enrollment_date: enrollmentDate.toISOString(),
                billing_day: 5,
                grace_days: 7,
            };
            const payments = [
                { category: "membresía", payment_month: currentMonth, payment_year: currentYear },
            ];
            expect(calculateFinancialStatus(member, payments)).toBe("vigente");
        });

        it("should return 'atrasado' when cuota is missing past grace days", () => {
            const enrollmentDate = new Date(today);
            enrollmentDate.setFullYear(today.getFullYear() - 1);
            const member = {
                status: "activo",
                enrollment_date: enrollmentDate.toISOString(),
                billing_day: 1,   // billing on day 1
                grace_days: 0,    // no grace
            };
            // today.getDate() > (1 + 0) = 1, so if today is after day 1, should be atrasado
            // This will pass if today is after the 1st of the month
            const payments: { category: string; payment_month: number; payment_year: number }[] = [];
            const result = calculateFinancialStatus(member, payments);
            // If today >= day 2, should be atrasado
            if (today.getDate() > 1) {
                expect(result).toBe("atrasado");
            } else {
                expect(result).toBe("vigente");
            }
        });
    });
});
