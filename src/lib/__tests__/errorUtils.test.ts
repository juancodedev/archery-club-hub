import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSafeErrorMessage } from "../errorUtils";

describe("errorUtils", () => {
    describe("getSafeErrorMessage", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should return fallback for null/undefined error", () => {
            expect(getSafeErrorMessage(null)).toBe("Ha ocurrido un error. Por favor, intenta nuevamente.");
            expect(getSafeErrorMessage(undefined)).toBe("Ha ocurrido un error. Por favor, intenta nuevamente.");
        });

        it("should return custom fallback if provided", () => {
            expect(getSafeErrorMessage(null, "Mi fallback")).toBe("Mi fallback");
        });

        it("should map known Supabase auth errors to Spanish messages", () => {
            expect(getSafeErrorMessage(new Error("Invalid login credentials")))
                .toBe("Correo o contraseña incorrectos.");

            expect(getSafeErrorMessage(new Error("Email not confirmed")))
                .toBe("Debes confirmar tu correo electrónico antes de iniciar sesión.");

            expect(getSafeErrorMessage(new Error("User already registered")))
                .toBe("Ya existe una cuenta con este correo electrónico.");
        });

        it("should handle string errors", () => {
            expect(getSafeErrorMessage("Password should be at least 6 characters"))
                .toBe("La contraseña debe tener al menos 6 caracteres.");
        });

        it("should handle Error objects", () => {
            const err = new Error("Something user-friendly happened");
            expect(getSafeErrorMessage(err)).toBe("Something user-friendly happened");
        });

        it("should sanitize internal Postgres/Supabase errors", () => {
            const err = new Error("column 'id' does not exist in relation 'members'");
            const result = getSafeErrorMessage(err);
            expect(result).toBe("Ha ocurrido un error interno. Por favor, intenta nuevamente.");
        });

        it("should handle object errors with message property", () => {
            const err = { message: "Email rate limit exceeded" };
            expect(getSafeErrorMessage(err)).toBe("Demasiados intentos. Por favor espera antes de volver a intentarlo.");
        });

        it("should handle object errors with error_description property", () => {
            const err = { error_description: "Custom description" };
            expect(getSafeErrorMessage(err)).toBe("Custom description");
        });
    });
});
