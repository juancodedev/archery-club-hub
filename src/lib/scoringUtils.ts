/**
 * Utilidades para cálculo de puntajes en arquería
 */

export interface ScoreResult {
    score: number;
    xCount: number;
    tensCount: number; // Cuenta tanto X como 10 numérico
}

/**
 * Calcula el valor numérico de una flecha
 * @param value - Valor de la flecha ('X', 'M', '0'-'10')
 * @param isIndoor - Si es torneo indoor (afecta el conteo de X para desempates)
 * @returns El valor numérico de la flecha
 */
export function arrowValue(value: string, isIndoor: boolean = false): number {
    const v = value.toUpperCase().trim();

    if (v === "X") {
        // X siempre suma 10 puntos (tanto en Indoor como Outdoor)
        // La diferencia es solo para efectos de desempate
        return 10;
    }

    if (v === "M" || v === "" || v === "-") {
        return 0;
    }

    const numValue = Number(v);
    if (isNaN(numValue) || numValue < 0 || numValue > 10) {
        return 0;
    }

    return numValue;
}

/**
 * Calcula el puntaje total de una serie (end)
 * @param arrows - Array de valores de flechas
 * @param isIndoor - Si es torneo indoor
 * @returns Objeto con score total y conteo de X's
 */
export function calculateEndScore(
    arrows: string[],
    isIndoor: boolean = false
): ScoreResult {
    let score = 0;
    let xCount = 0;
    let tensCount = 0;

    arrows.forEach((arrow) => {
        const v = arrow.toUpperCase().trim();
        score += arrowValue(v, isIndoor);

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
 * @returns Resultado total con score y conteos
 */
export function calculateTotalScore(
    ends: string[][],
    isIndoor: boolean = false
): ScoreResult {
    let totalScore = 0;
    let totalXCount = 0;
    let totalTensCount = 0;

    ends.forEach((end) => {
        const endResult = calculateEndScore(end, isIndoor);
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

    // Valores numéricos del 0 al 10 (solo enteros)
    const numValue = Number(v);
    if (!isNaN(numValue) && numValue >= 0 && numValue <= 10 && Number.isInteger(numValue)) {
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

/**
 * Determina el color de una flecha según su valor
 * @param value - Valor de la flecha
 * @returns Clase CSS para el color
 */
export function getArrowColor(value: string): string {
    const numValue = arrowValue(value);

    if (value.toUpperCase() === "X") {
        return "text-yellow-500 font-bold";
    }

    if (numValue === 10) {
        return "text-yellow-400 font-semibold";
    }

    if (numValue >= 9) {
        return "text-green-500";
    }

    if (numValue >= 7) {
        return "text-blue-500";
    }

    if (numValue >= 5) {
        return "text-gray-400";
    }

    if (numValue === 0) {
        return "text-red-400";
    }

    return "text-foreground";
}
