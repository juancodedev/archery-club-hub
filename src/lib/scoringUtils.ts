/**
 * Utilidades para cálculo de puntajes en arquería
 */

export interface ScoreResult {
    score: number;
    xCount: number;
    tensCount: number; // Cuenta tanto X como 10 numérico
}

/**
 * Rondas IFAA puntuadas 5, 4, 3, 2, 1 con una X central que solo sirve para desempatar.
 */
const FIVE_RING_ROUNDS = ["indoor_standard", "field_expert"];

/**
 * Valor de la X según la ronda.
 * En las rondas IFAA Indoor y Field Experto la X está dentro del 5, vale 5 y solo
 * sirve para desempatar. En el resto vale 10.
 * @param ifaaRound - Ronda IFAA del tipo de torneo, o null si no es IFAA
 */
export function xValueForRound(ifaaRound?: string | null): number {
    return ifaaRound && FIVE_RING_ROUNDS.includes(ifaaRound) ? 5 : 10;
}

/**
 * Valores del teclado para las rondas IFAA de anillos (Field, Hunter, Field Experto, Indoor, Flint).
 * @param ifaaRound - Ronda IFAA del tipo de torneo
 */
export function ifaaRingKeypad(ifaaRound?: string | null): string[] {
    if (ifaaRound && FIVE_RING_ROUNDS.includes(ifaaRound)) {
        return ["X", "5", "4", "3", "2", "1", "M"];
    }
    return ["5", "4", "3", "M"];
}

/**
 * Flechas por serie según la ronda IFAA (Manual del Arquero IFAA).
 * @param ifaaRound - Ronda IFAA del tipo de torneo, o null si no es IFAA
 * @param configured - Flechas por serie del tipo de torneo, usadas fuera de IFAA
 */
export function ifaaArrowsPerEnd(ifaaRound: string | null | undefined, configured: number): number {
    switch (ifaaRound) {
        case "indoor_standard":
            return 5;
        case "field":
        case "hunter":
        case "field_expert":
        case "flint_indoor":
            return 4;
        case "animal_2d":
        case "animal_3d":
            return 3;
        case "3d_standard":
            return 2;
        case "3d_hunting":
            return 1;
        default:
            return configured;
    }
}

/**
 * Calcula el valor numérico de una flecha
 * @param value - Valor de la flecha ('X', 'M', '0'-'20')
 * @param isIndoor - Sin uso, se mantiene por compatibilidad
 * @param xValue - Puntos de la X (ver xValueForRound)
 * @returns El valor numérico de la flecha
 */
export function arrowValue(value: string, _isIndoor: boolean = false, xValue: number = 10): number {
    const v = value.toUpperCase().trim();

    if (v === "X") {
        return xValue;
    }

    if (v === "M" || v === "" || v === "-") {
        return 0;
    }

    const numValue = Number(v);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
        return 0;
    }

    return numValue;
}

/**
 * Calcula el puntaje total de una serie (end)
 * @param arrows - Array de valores de flechas
 * @param isIndoor - Si es torneo indoor
 * @param xValue - Puntos de la X (ver xValueForRound)
 * @returns Objeto con score total y conteo de X's
 */
export function calculateEndScore(
    arrows: string[],
    isIndoor: boolean = false,
    xValue: number = 10
): ScoreResult {
    let score = 0;
    let xCount = 0;
    let tensCount = 0;

    arrows.forEach((arrow) => {
        const v = arrow.toUpperCase().trim();
        score += arrowValue(v, isIndoor, xValue);

        if (v === "X") {
            xCount++;
            tensCount++;
        } else if (v === "10") {
            tensCount++;
        }
    });

    return { score, xCount, tensCount };
}

/**
 * Calcula el puntaje total de todas las series
 * @param ends - Array de arrays de valores de flechas
 * @param isIndoor - Si es torneo indoor
 * @param xValue - Puntos de la X (ver xValueForRound)
 * @returns Resultado total con score y conteos
 */
export function calculateTotalScore(
    ends: string[][],
    isIndoor: boolean = false,
    xValue: number = 10
): ScoreResult {
    let totalScore = 0;
    let totalXCount = 0;
    let totalTensCount = 0;

    ends.forEach((end) => {
        const endResult = calculateEndScore(end, isIndoor, xValue);
        totalScore += endResult.score;
        totalXCount += endResult.xCount;
        totalTensCount += endResult.tensCount;
    });

    return {
        score: totalScore,
        xCount: totalXCount,
        tensCount: totalTensCount,
    };
}

/**
 * Valida si un valor de flecha es válido
 * @param value - Valor a validar
 * @returns true si el valor es válido
 */
export function validateArrowValue(value: string): boolean {
    const v = value.toUpperCase().trim();

    // Valores especiales permitidos
    if (v === "" || v === "X" || v === "M" || v === "-") {
        return true;
    }

    // Valores numéricos del 0 al 20 (solo enteros)
    const numValue = Number(v);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 20 && Number.isInteger(numValue)) {
        return true;
    }

    return false;
}

/**
 * Formatea el valor de una flecha para display
 * @param value - Valor de la flecha
 * @returns Valor formateado
 */
export function formatArrowValue(value: string): string {
    const v = value.toUpperCase().trim();

    if (v === "" || v === "-") {
        return "—";
    }

    if (v === "M") {
        return "M";
    }

    if (v === "X") {
        return "X";
    }

    return v;
}
