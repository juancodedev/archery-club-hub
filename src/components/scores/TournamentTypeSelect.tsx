import { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { Target, Mountain } from "lucide-react";

interface TournamentType {
    id: string;
    name: string;
    description: string | null;
    arrows_per_end: number;
    ends_per_round: number;
    distance_meters: number | null;
    target_size_cm: number | null;
    is_indoor: boolean;
    is_system: boolean;
}

interface TournamentTypeSelectProps {
    value: string;
    onChange: (value: string) => void;
    onTypeChange?: (tournamentType: TournamentType | null) => void;
    label?: string;
    placeholder?: string;
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

    useEffect(() => {
        fetchTournamentTypes();
    }, [member]);

    useEffect(() => {
        // Cuando cambia el value, notificar al padre con el objeto completo
        if (value && onTypeChange) {
            const selectedType = types.find((t) => t.id === value);
            onTypeChange(selectedType || null);
        }
    }, [value, types, onTypeChange]);

    const fetchTournamentTypes = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("tournament_types")
                .select("*")
                .eq("active", true)
                .order("name");

            // Incluir tipos del sistema y del club (si existe)
            if (member?.club_id) {
                query = query.or(`is_system.eq.true,club_id.eq.${member.club_id}`);
            } else {
                query = query.eq("is_system", true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setTypes(data || []);
        } catch (error) {
            console.error("Error fetching tournament types:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredTypes = types.filter((type) =>
        type.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select value={value} onValueChange={onChange} disabled={loading}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <div className="p-2">
                        <Input
                            placeholder="Buscar tipo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    {filteredTypes.length === 0 ? (
                        <div className="py-2 px-4 text-sm text-muted-foreground">
                            No se encontraron tipos de torneo
                        </div>
                    ) : (
                        filteredTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                                <div className="flex items-center gap-2 py-1">
                                    {type.is_indoor ? (
                                        <Target className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <Mountain className="h-4 w-4 text-green-500" />
                                    )}
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium">{type.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {type.arrows_per_end} flechas/serie
                                            {type.distance_meters &&
                                                ` • ${type.distance_meters}m`}
                                            {type.target_size_cm && ` • ${type.target_size_cm}cm`}
                                            {!type.is_system && " • Personalizado"}
                                        </span>
                                    </div>
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
