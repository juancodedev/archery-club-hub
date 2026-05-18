/**
 * Tipos compartidos de Arquería — usados en componentes y páginas
 */

export interface TournamentType {
    id: string;
    name: string;
    description: string | null;
    arrows_per_end: number;
    ends_per_round: number;
    distance_meters: number | null;
    distance_yards: number | null;
    target_size_cm: number | null;
    is_indoor: boolean;
    discipline: string | null;
    bow_type: string | null;
    tournament_format: string | null;
    is_system: boolean;
    club_id?: string | null;
    active?: boolean;
    ifaa_round?: 'field' | 'hunter' | 'animal_2d' | 'animal_3d' | '3d_hunting' | '3d_standard' | 'field_expert' | 'indoor_standard' | 'flint_indoor' | null;
}

export interface Division {
    id: string;
    name: string;
    abbreviation: string;
    description: string | null;
    is_system: boolean;
}

export interface Club {
    id: string;
    name: string;
}

export interface MemberBasic {
    id: string;
    full_name: string;
}
