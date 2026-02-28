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

interface Division {
    id: string;
    name: string;
    abbreviation: string;
    description: string | null;
    is_system: boolean;
}

interface DivisionSelectProps {
    value: string;
    onChange: (value: string) => void;
    memberId?: string;
    label?: string;
    placeholder?: string;
}

export default function DivisionSelect({
    value,
    onChange,
    memberId,
    label = "División",
    placeholder = "Seleccionar división",
}: DivisionSelectProps) {
    const { member } = useAuth();
    const [divisions, setDivisions] = useState<Division[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchDivisions = useCallback(async () => {
        setLoading(true);
        try {
            // Obtener divisiones del sistema
            let query = supabase
                .from("divisions")
                .select("id, name, abbreviation, description, is_system")
                .eq("active", true)
                .order("name");

            // Si hay club_id, también traer divisiones personalizadas
            if (member?.club_id) {
                query = query.or(`is_system.eq.true,club_id.eq.${member.club_id}`);
            } else {
                query = query.eq("is_system", true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setDivisions(data || []);
        } catch (error) {
            console.error("Error fetching divisions:", error);
        } finally {
            setLoading(false);
        }
    }, [member?.club_id]);

    useEffect(() => {
        fetchDivisions();
    }, [fetchDivisions]);

    const filteredDivisions = divisions.filter(
        (div) =>
            div.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            div.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
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
                            placeholder="Buscar división..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-2"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    {filteredDivisions.length === 0 ? (
                        <div className="py-2 px-4 text-sm text-muted-foreground">
                            No se encontraron divisiones
                        </div>
                    ) : (
                        filteredDivisions.map((division) => (
                            <SelectItem key={division.id} value={division.id}>
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{division.abbreviation}</span>
                                    <span className="text-muted-foreground">-</span>
                                    <span>{division.name}</span>
                                    {!division.is_system && (
                                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                            Personalizado
                                        </span>
                                    )}
                                </div>
                            </SelectItem>
                        ))
                    )}
                </SelectContent>
            </Select>
        </div>
    );
}
