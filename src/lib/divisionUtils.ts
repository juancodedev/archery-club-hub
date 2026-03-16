/**
 * Utilidades para la gestión de divisiones y categorías de arquería
 */

/**
 * Calcula la edad exacta basándose en una fecha de nacimiento
 * @param dateString Fecha en formato ISO o string compatible con Date
 * @returns Edad calculada en años
 */
export function calculateAge(dateString: string): number {
    const birth = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Sugiere divisiones de sistema basadas en la edad y el tipo de arco
 * Basado en estándares de World Archery (referencia seed data)
 */
export function getDivisionSuggestions(age: number, bowType?: string): string[] {
    const suggestions: string[] = [];

    // Si no hay tipo de arco, sugerimos bases genéricas
    const basePrefix = bowType === 'recurvo' ? 'RC' : bowType === 'compuesto' ? 'CO' : '';

    if (age < 15) {
        if (basePrefix) suggestions.push(`${basePrefix}C`); // Cadete
    } else if (age < 18) {
        if (basePrefix) suggestions.push(`${basePrefix}J`); // Junior
    } else if (age >= 50) {
        // En algunos sistemas hay Master, aquí usaremos Senior por defecto si no hay específicas
        if (basePrefix) suggestions.push(`${basePrefix}M`); // Sugerencia de Masculino/Master
    }

    // Siempre incluir las bases si hay arco
    if (basePrefix) {
        suggestions.push(basePrefix);
    } else {
        // Sugerencias generales si no hay arco definido
        suggestions.push('RC', 'CO', 'BB', 'LB');
    }

    return suggestions;
}
