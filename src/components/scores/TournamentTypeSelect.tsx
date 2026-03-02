import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContextCore";
import { DISCIPLINE_LABELS, metersToYards } from "@/lib/archeryConstants";
import type { TournamentType } from "@/types/archery";


interface TournamentTypeSelectProps {
    value: string;
    onChange: (value: string) => void;
    onTypeChange?: (tournamentType: TournamentType | null) => void;
    label?: string;
    placeholder?: string;
}

const DISCIPLINE_ICONS: Record<string, string> = {
    outdoor: "🎯",
    indoor: "🏠",
    campo: "🌲",
    "3d": "🐗",
};

function getDistanceLabel(type: TournamentType): string {
    if (type.distance_yards) return `${type.distance_yards} yd`;
    if (type.distance_meters) return `${metersToYards(type.distance_meters)} yd`;
    return "";
}

export default function TournamentTypeSelect({
    value,
    onChange,
    onTypeChange,
    label = "Tipo de Torneo",
    placeholder = "Seleccionar tipo",
}: TournamentTypeSelectProps) {
    const { member } = useAuth();
    const [types, setTypes] = useState<TournamentType[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchTournamentTypes = useCallback(async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("tournament_types")
                .select("*")
                .eq("active", true)
                .order("discipline")
                .order("name");

            if (member?.club_id) {
                query = query.or(`is_system.eq.true,club_id.eq.${member.club_id}`);
            } else {
                query = query.eq("is_system", true);
            }

            const { data, error } = await query;
            if (error) throw error;
            setTypes(data || []);
        } catch (error) {
            if (import.meta.env.DEV) console.error("Error fetching tournament types:", error);
        } finally {
            setLoading(false);
        }
    }, [member?.club_id]);

    useEffect(() => {
        fetchTournamentTypes();
    }, [fetchTournamentTypes]);

    // Solo dispara cuando los `types` terminan de cargarse (carga asíncrona).
    useEffect(() => {
        if (value && onTypeChange && types.length > 0) {
            const selectedType = types.find((t) => t.id === value);
            onTypeChange(selectedType || null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, types]);

    const filteredTypes = types.filter((type) =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Agrupar por disciplina para el dropdown
    const grouped = filteredTypes.reduce<Record<string, TournamentType[]>>((acc, t) => {
        const group = t.discipline || "otro";
        if (!acc[group]) acc[group] = [];
        acc[group].push(t);
        return acc;
    }, {});

    const disciplineOrder = ["indoor", "outdoor", "campo", "3d", "otro"];

    return (
        <div className="space-y-2">
            {label && <Label>{label}</Label>}
            <Select
                value={value}
                onValueChange={(newId) => {
                    onChange(newId);
                    // Llamada directa al cambiar selección del usuario (no useEffect)
                    if (onTypeChange) {
                        const selectedType = types.find((t) => t.id === newId) || null;
                        onTypeChange(selectedType);
                    }
                }}
                disabled={loading}
            >
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <div className="p-2">
                        <Input
                            placeholder="Buscar tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2 h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    {disciplineOrder.map(disc => {
                        const items = grouped[disc];
                        if (!items || items.length === 0) return null;
                        const icon = DISCIPLINE_ICONS[disc] || "🏹";
                        const discLabel = disc !== "otro"
                            ? (DISCIPLINE_LABELS[disc as keyof typeof DISCIPLINE_LABELS] || disc)
                            : "Otros";
                        return (
                            <div key={disc}>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-3 py-1.5 border-t border-border/30 mt-1">
                                    {icon} {discLabel}
                                </p>
                                {items.map((type) => {
                                    const distLabel = getDistanceLabel(type);
                                    return (
                                        <SelectItem key={type.id} value={type.id}>
                                            <div className="flex flex-col gap-0.5 py-0.5">
                                                <span className="font-medium text-sm">{type.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {type.arrows_per_end} flechas/serie
                                                    {distLabel && ` • ${distLabel}`}
                                                    {type.target_size_cm && ` • ${type.target_size_cm} cm`}
                                                    {!type.is_system && " • Personalizado"}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {filteredTypes.length === 0 && (
                        <div className="py-2 px-4 text-sm text-muted-foreground">
                            No se encontraron tipos de torneo
                        </div>
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
