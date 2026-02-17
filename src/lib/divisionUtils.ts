/**
 * Utilidades para manejo de divisiones y categorías
 */

import { supabase } from "@/integrations/supabase/client";

export interface Division {
    id: string;
    name: string;
    abbreviation: string;
    description: string | null;
    min_age: number | null;
    max_age: number | null;
    gender: string | null;
    is_system: boolean;
    club_id: string | null;
    active: boolean;
}

export interface MemberDivision {
    id: string;
    member_id: string;
    division_id: string;
    is_primary: boolean;
    valid_from: string;
    valid_until: string | null;
    division?: Division;
}

/**
 * Calcula la edad de una persona
 * @param birthDate - Fecha de nacimiento
 * @returns Edad en años
 */
export function calculateAge(birthDate: Date | string): number {
    const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * Calcula la división apropiada según edad
 * @param birthDate - Fecha de nacimiento
 * @param gender - Género (optional)
 * @param bowType - Tipo de arco (default: 'Recurvo')
 * @returns División sugerida o null
 */
export async function calculateDivisionByAge(
    birthDate: Date | string,
    gender?: string,
    bowType: string = "Recurvo"
): Promise<Division | null> {
    const age = calculateAge(birthDate);

    let query = supabase
        .from("divisions")
        .select("*")
        .eq("is_system", true)
        .eq("active", true);

    // Filtrar por rango de edad
    if (age < 15) {
        query = query.ilike("name", "%cadete%");
    } else if (age < 18) {
        query = query.ilike("name", "%junior%");
    }

    // Filtrar por tipo de arco
    query = query.ilike("name", `%${bowType}%`);

    // Filtrar por género si está disponible
    if (gender && (gender === "M" || gender === "F")) {
        if (gender === "M") {
            query = query.or(
                `gender.is.null,gender.eq.M,name.ilike.%masculino%`
            );
        } else {
            query = query.or(
                `gender.is.null,gender.eq.F,name.ilike.%femenino%`
            );
        }
    }

    const { data, error } = await query.limit(1).single();

    if (error || !data) {
        // Si no encontramos una división específica, buscar la genérica del tipo de arco
        const { data: genericData } = await supabase
            .from("divisions")
            .select("*")
            .eq("is_system", true)
            .eq("active", true)
            .eq("name", bowType)
            .limit(1)
            .single();

        return genericData || null;
    }

    return data;
}

/**
 * Obtiene las divisiones activas de un miembro
 * @param memberId - ID del miembro
 * @returns Array de divisiones activas
 */
export async function getMemberActiveDivisions(
    memberId: string
): Promise<MemberDivision[]> {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
        .from("member_divisions")
        .select(`
      *,
      division:divisions(*)
    `)
        .eq("member_id", memberId)
        .lte("valid_from", today)
        .or(`valid_until.is.null,valid_until.gte.${today}`)
        .order("is_primary", { ascending: false });

    if (error) {
        console.error("Error fetching member divisions:", error);
        return [];
    }

    return data || [];
}

/**
 * Obtiene la división primaria de un miembro
 * @param memberId - ID del miembro
 * @returns División primaria o null
 */
export async function getMemberPrimaryDivision(
    memberId: string
): Promise<Division | null> {
    const divisions = await getMemberActiveDivisions(memberId);
    const primary = divisions.find((md) => md.is_primary);

    return primary?.division || divisions[0]?.division || null;
}

/**
 * Verifica si un miembro es elegible para una división
 * @param memberId - ID del miembro
 * @param divisionId - ID de la división
 * @returns true si es elegible
 */
export async function checkDivisionEligibility(
    memberId: string,
    divisionId: string
): Promise<boolean> {
    // Obtener datos del miembro
    const { data: member, error: memberError } = await supabase
        .from("members")
        .select("date_of_birth")
        .eq("id", memberId)
        .single();

    if (memberError || !member) {
        return false;
    }

    // Obtener datos de la división
    const { data: division, error: divisionError } = await supabase
        .from("divisions")
        .select("*")
        .eq("id", divisionId)
        .single();

    if (divisionError || !division) {
        return false;
    }

    // Si no hay restricciones de edad, es elegible
    if (!division.min_age && !division.max_age) {
        return true;
    }

    // Calcular edad
    if (!member.date_of_birth) {
        // Si no hay fecha de nacimiento, no podemos verificar
        return true;
    }

    const age = calculateAge(member.date_of_birth);

    // Verificar rango de edad
    if (division.min_age && age < division.min_age) {
        return false;
    }

    if (division.max_age && age > division.max_age) {
        return false;
    }

    return true;
}
