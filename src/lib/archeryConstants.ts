/**
 * Constantes de Arquería — World Archery Standards
 * Distancias en yardas (sistema Imperial) con referencia métrica
 */

// ─── DISCIPLINAS ────────────────────────────────────────────────────────────

export const DISCIPLINES = [
    { value: "outdoor", label: "Diana Aire Libre (Outdoor Target)", icon: "🎯" },
    { value: "indoor", label: "Sala (Indoor)", icon: "🏠" },
    { value: "campo", label: "Tiro de Campo (Field)", icon: "🌲" },
    { value: "3d", label: "3D", icon: "🐗" },
] as const;

export type DisciplineValue = (typeof DISCIPLINES)[number]["value"];

export const DISCIPLINE_LABELS: Record<DisciplineValue, string> = {
    outdoor: "Aire Libre",
    indoor: "Sala",
    campo: "Campo",
    "3d": "3D",
};

// ─── TIPOS DE ARCO ───────────────────────────────────────────────────────────

export const BOW_TYPES = [
    { value: "recurvo", label: "Recurvo (Olímpico)" },
    { value: "compuesto", label: "Compuesto" },
    { value: "barebow", label: "Arco Desnudo (Barebow)" },
    { value: "longbow", label: "Longbow (Arco Largo)" },
    { value: "todos", label: "Todos los tipos" },
] as const;

export type BowTypeValue = (typeof BOW_TYPES)[number]["value"];

// ─── CONVERSIÓN DE DISTANCIAS ────────────────────────────────────────────────

/** Convierte metros a yardas (1 metro = 1.09361 yardas) */
export function metersToYards(meters: number): number {
    return Math.round(meters * 1.09361 * 10) / 10;
}

/** Convierte metros a pies (1 metro = 3.28084 pies) */
export function metersToFeet(meters: number): number {
    return Math.round(meters * 3.28084 * 10) / 10;
}

/** Convierte yardas a metros */
export function yardsToMeters(yards: number): number {
    return Math.round((yards / 1.09361) * 10) / 10;
}

/** Formatea yardas para mostrar en UI. Ej: "76 yd" */
export function formatYards(yards: number | null | undefined): string {
    if (yards == null) return "—";
    return `${yards} yd`;
}

/** Formatea yardas con referencia métrica. Ej: "76 yd (70 m)" */
export function formatYardsWithMeters(yards: number | null | undefined): string {
    if (yards == null) return "—";
    const meters = yardsToMeters(yards);
    return `${yards} yd (≈${meters} m)`;
}

// ─── DISTANCIAS ESTÁNDAR WORLD ARCHERY ──────────────────────────────────────
// Referencia oficial: https://worldarchery.sport/rulebook

export const STANDARD_DISTANCES = [
    // Outdoor Target
    { yards: 76, meters: 70, discipline: "outdoor", label: "76 yd (70 m) — Olímpico Recurvo" },
    { yards: 55, meters: 50, discipline: "outdoor", label: "55 yd (50 m) — Olímpico Compuesto" },
    { yards: 66, meters: 60, discipline: "outdoor", label: "66 yd (60 m)" },
    { yards: 33, meters: 30, discipline: "outdoor", label: "33 yd (30 m)" },
    // Indoor
    { yards: 20, meters: 18, discipline: "indoor", label: "20 yd (18 m) — Estándar Sala" },
    { yards: 25, meters: 25, discipline: "indoor", label: "27 yd (25 m)" },
    // Field
    { yards: 5, meters: 5, discipline: "campo", label: "5 yd (mínimo campo)" },
    { yards: 66, meters: 60, discipline: "campo", label: "66 yd (máximo campo)" },
] as const;

// ─── CARAS DE DIANA ──────────────────────────────────────────────────────────

export const TARGET_FACES = [
    {
        sizeCm: 122,
        label: "122 cm",
        description: "Distancias largas: Outdoor 70 m / 76 yd y 60 m / 66 yd",
        disciplines: ["outdoor"],
    },
    {
        sizeCm: 80,
        label: "80 cm",
        description: "Distancias medias: Outdoor 50 m / 55 yd y 30 m / 33 yd. Compuesto indoor",
        disciplines: ["outdoor", "indoor"],
    },
    {
        sizeCm: 60,
        label: "60 cm",
        description: "Tiro de Campo (Field Archery)",
        disciplines: ["campo"],
    },
    {
        sizeCm: 40,
        label: "40 cm",
        description: "Indoor estándar (18 m / 20 yd). Triple vertical en alta competencia",
        disciplines: ["indoor"],
    },
    {
        sizeCm: null,
        label: "Figura 3D",
        description: "Animales de espuma a escala real. Sin anillos visibles, zonas vitales",
        disciplines: ["3d"],
    },
] as const;

// ─── FORMATOS DE TORNEO ──────────────────────────────────────────────────────

export const TOURNAMENT_FORMATS = [
    {
        value: "ranking_round",
        label: "Ronda Clasificatoria",
        description:
            "Todos tiran un número fijo de flechas (72 outdoor / 60 indoor). Suma total determina posición.",
    },
    {
        value: "sets",
        label: "Sistema de Sets (Recurvo)",
        description:
            "Cara a cara. 3 flechas por set. 2 pts al ganador, 1 a cada uno en empate. Primero en 6 pts gana el match.",
    },
    {
        value: "acumulado",
        label: "Puntuación Acumulada (Compuesto)",
        description:
            "Cara a cara. 15 flechas totales. El que sume más puntos avanza.",
    },
    {
        value: "equipos",
        label: "Equipos / Mixtos",
        description:
            "Equipos de 3 arqueros del mismo sexo, o parejas mixtas. Formato similar a individual.",
    },
    {
        value: "libre",
        label: "Entrenamiento Libre",
        description: "Sin formato competitivo específico.",
    },
] as const;

export type TournamentFormatValue = (typeof TOURNAMENT_FORMATS)[number]["value"];

export const TOURNAMENT_FORMAT_LABELS: Record<string, string> = Object.fromEntries(
    TOURNAMENT_FORMATS.map((f) => [f.value, f.label])
);

// ─── ENTRENAMIENTOS ──────────────────────────────────────────────────────────

export const TRAINING_TYPES = [
    { value: "libre", label: "Entrenamiento Libre", icon: "📈" },
    { value: "estandar", label: "Serie Estándar", icon: "🎯" },
] as const;

export const WEATHER_TYPES = [
    { value: "soleado", label: "Soleado", icon: "☀️" },
    { value: "nublado", label: "Nublado", icon: "☁️" },
    { value: "lluvioso", label: "Lluvioso", icon: "🌧️" },
    { value: "viento", label: "Viento Fuerte", icon: "🌬️" },
] as const;

export const WIND_DIRECTIONS = [
    { value: "frente", label: "De Frente", icon: "⬇️" },
    { value: "espalda", label: "De Espalda", icon: "⬆️" },
    { value: "izquierda", label: "Desde Izquierda", icon: "➡️" },
    { value: "derecha", label: "Desde Derecha", icon: "⬅️" },
] as const;

export const TRAINING_PRESETS = [
    {
        id: "wa-standard",
        name: "WA Estandar",
        description: "50m/30m: 6x6 flechas (122cm)",
        rounds: [
            { distance: 55, target: "122 cm", ends: 6, arrows: 6 },
            { distance: 33, target: "122 cm", ends: 6, arrows: 6 }
        ]
    },
    {
        id: "indoor-18m",
        name: "Sala Estándar",
        description: "18m: 10x3 flechas (40cm)",
        rounds: [
            { distance: 20, target: "40 cm", ends: 10, arrows: 3 }
        ]
    }
] as const;

// ─── SISTEMA DE PUNTUACIÓN ──────────────────────────────────────────────────

/**
 * Anillos estándar (10 anillos, 5 colores):
 * Amarillo: X / 10
 * Rojo:     9  / 8
 * Azul:     7  / 6
 * Negro:    5  / 4
 * Blanco:   3  / 2 / 1
 *
 * La "X" (innermost) = 10 pts, pero cuenta como desempate en Indoor.
 */
export const RING_COLORS: { min: number; max: number; color: string; name: string }[] = [
    { min: 10, max: 10, color: "#FFD700", name: "Amarillo (X/10)" },
    { min: 9, max: 9, color: "#FFD700", name: "Amarillo (9)" },
    { min: 8, max: 8, color: "#E53E3E", name: "Rojo (8)" },
    { min: 7, max: 7, color: "#E53E3E", name: "Rojo (7)" },
    { min: 6, max: 6, color: "#3182CE", name: "Azul (6)" },
    { min: 5, max: 5, color: "#3182CE", name: "Azul (5)" },
    { min: 4, max: 4, color: "#1A202C", name: "Negro (4)" },
    { min: 3, max: 3, color: "#1A202C", name: "Negro (3)" },
    { min: 2, max: 2, color: "#FFFFFF", name: "Blanco (2)" },
    { min: 1, max: 1, color: "#FFFFFF", name: "Blanco (1)" },
];

// ─── DISCIPLINAS NFAA/IFAA ──────────────────────────────────────────────────

export const NFAA_DISCIPLINES = [
    { value: "indoor", label: "Indoor", icon: "🏠" },
    { value: "flint", label: "Flint", icon: "🪨" },
    { value: "field", label: "Field", icon: "🌲" },
    { value: "hunter", label: "Hunter", icon: "🦌" },
    { value: "animal_marked", label: "Animal Marked", icon: "🐾" },
    { value: "animal_unmarked", label: "Animal Unmarked", icon: "🐾" },
    { value: "hunting", label: "Hunting", icon: "🎯" },
    { value: "3d", label: "3D", icon: "🐗" },
] as const;

export type NfaaDisciplineValue = (typeof NFAA_DISCIPLINES)[number]["value"];

// Modalidades de sesión: torneo o práctica
export const SESSION_MODES = [
    { value: "practice", label: "Práctica" },
    { value: "tournament", label: "Torneo" },
] as const;

export type SessionModeValue = (typeof SESSION_MODES)[number]["value"];

// ─── ESTILOS DE ARCO NFAA/IFAA ───────────────────────────────────────────────

const createNfaaBowStyle = <T extends string>(value: T, label: string) => ({
    value,
    label,
    code: value,
} as const);

export const NFAA_BOW_STYLES = [
    createNfaaBowStyle("HB", "Histórico Bow"),
    createNfaaBowStyle("LB", "Longbow"),
    createNfaaBowStyle("TR", "Tradicional Recurvo"),
    createNfaaBowStyle("BU", "Bowhunter Unlimited"),
    createNfaaBowStyle("BL", "Bowhunter Limited"),
    createNfaaBowStyle("BH-C", "Bowhunter Compound"),
    createNfaaBowStyle("BH-R", "Bowhunter Recurvo"),
    createNfaaBowStyle("FU", "Freestyle Unlimited"),
    createNfaaBowStyle("FS-C", "Freestyle Limited Compound"),
    createNfaaBowStyle("FS-R", "Freestyle Limited Recurvo"),
    createNfaaBowStyle("BB-C", "Barebow Compound"),
    createNfaaBowStyle("BB-R", "Barebow Recurvo"),
] as const;

export type NfaaBowStyleValue = (typeof NFAA_BOW_STYLES)[number]["value"];

// ─── CATEGORÍAS DE EDAD NFAA/IFAA ────────────────────────────────────────────

export const NFAA_AGE_CATEGORIES = [
    { value: "C", label: "Cub", description: "Hasta 13 años" },
    { value: "J", label: "Junior", description: "14-17 años" },
    { value: "Y", label: "Joven Adulto", description: "18-20 años" },
    { value: "A", label: "Adulto", description: "21-49 años" },
    { value: "V", label: "Veterano", description: "50-59 años" },
    { value: "S", label: "Senior", description: "60+ años" },
] as const;

export type NfaaAgeCategoryValue = (typeof NFAA_AGE_CATEGORIES)[number]["value"];

export const NFAA_GENDERS = [
    { value: "F", label: "Femenino" },
    { value: "M", label: "Masculino" },
] as const;

export type NfaaGenderValue = (typeof NFAA_GENDERS)[number]["value"];

// ─── DIANA INDOOR ────────────────────────────────────────────────────────────

export const INDOOR_TARGET_TYPES = [
    { value: "1spot", label: "1 Spot" },
    { value: "5spots", label: "5 Spots" },
] as const;

export type IndoorTargetTypeValue = (typeof INDOOR_TARGET_TYPES)[number]["value"];

// ─── TABLA COMPLETA DE DIVISIONES NFAA/IFAA ─────────────────────────────────
// Generada combinando edad × género × estilo para búsqueda por código corto

export interface NfaaDivision {
    code: string;    // ej: "AFBH-C"
    label: string;   // ej: "Adulto Femenino Bowhunter Compound"
    age: string;
    gender: string;
    bowStyle: string;
}

function _buildDivisions(): NfaaDivision[] {
    const divisions: NfaaDivision[] = [];
    for (const age of NFAA_AGE_CATEGORIES) {
        for (const g of NFAA_GENDERS) {
            for (const bow of NFAA_BOW_STYLES) {
                divisions.push({
                    code: `${age.value}${g.value}${bow.code}`,
                    label: `${age.label} ${g.label === "Femenino" ? "Femenino" : "Masculino"} ${bow.label}`,
                    age: age.value,
                    gender: g.value,
                    bowStyle: bow.value,
                });
            }
        }
    }
    return divisions;
}

export const NFAA_ALL_DIVISIONS: NfaaDivision[] = _buildDivisions();
