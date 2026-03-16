import { logger } from "./logger";

/**
 * Maps Supabase / generic errors to safe, user-friendly messages.
 * Never exposes internal error details in production.
 */

const AUTH_ERROR_MAP: Record<string, string> = {
    "Invalid login credentials": "Correo o contraseña incorrectos.",
    "Email not confirmed": "Debes confirmar tu correo electrónico antes de iniciar sesión.",
    "User already registered": "Ya existe una cuenta con este correo electrónico.",
    "Password should be at least 6 characters": "La contraseña debe tener al menos 6 caracteres.",
    "Email rate limit exceeded": "Demasiados intentos. Por favor espera antes de volver a intentarlo.",
    "Token has expired or is invalid": "El enlace ha expirado o es inválido. Solicita uno nuevo.",
};

export function getSafeErrorMessage(error: unknown, fallback?: string): string {
    if (!error) return fallback || "Ha ocurrido un error. Por favor, intenta nuevamente.";

    let message = "";

    if (typeof error === "string") {
        message = error;
    } else if (error instanceof Error) {
        message = error.message;
    } else if (typeof error === "object" && error !== null) {
        const obj = error as Record<string, unknown>;
        if (typeof obj.message === "string") message = obj.message;
        else if (typeof obj.error_description === "string") message = obj.error_description;
        else if (typeof obj.msg === "string") message = obj.msg;
    }

    // Check auth error map
    if (message && AUTH_ERROR_MAP[message]) {
        return AUTH_ERROR_MAP[message];
    }

    // Filter out internal details for production safety
    const lowerMsg = message.toLowerCase();
    const isInternalError =
        lowerMsg.includes("column") ||
        lowerMsg.includes("relation") ||
        lowerMsg.includes("postgres") ||
        lowerMsg.includes("sql") ||
        lowerMsg.includes("supabase") ||
        lowerMsg.includes("409") ||
        lowerMsg.includes("duplicate key");

    if (isInternalError) {
        logger.error("Unhandled error:", error);
        return fallback || "Ha ocurrido un error interno. Por favor, intenta nuevamente.";
    }

    // Return raw message if it seems user-friendly
    if (message && message.length < 200) {
        return message;
    }

    logger.error("Unhandled error:", error);
    return fallback || "Ha ocurrido un error. Por favor, intenta nuevamente.";
}
