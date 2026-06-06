import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash2, Star } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import DivisionSelect from "@/components/scores/DivisionSelect";
import { Checkbox } from "@/components/ui/checkbox";

interface MemberDivisionsManagerProps {
    memberId: string;
    memberName: string;
}

interface MemberDivision {
    id: string;
    member_id: string;
    division_id: string;
    is_primary: boolean;
    valid_from: string;
    valid_until: string | null;
    division: {
        id: string;
        name: string;
        abbreviation: string;
    };
}

export default function MemberDivisionsManager({ memberId, memberName }: MemberDivisionsManagerProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newDivisionId, setNewDivisionId] = useState("");
    const [isPrimary, setIsPrimary] = useState(false);
    const [validFrom, setValidFrom] = useState<Date>(new Date());
    const [validUntil, setValidUntil] = useState<Date | undefined>();

    const { data: memberDivisions, isLoading } = useQuery({
        queryKey: ["member-divisions", memberId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("member_divisions")
                .select(`
          id,
          member_id,
          division_id,
          is_primary,
          valid_from,
          valid_until,
          division:divisions(id, name, abbreviation)
        `)
                .eq("member_id", memberId)
                .order("is_primary", { ascending: false })
                .order("valid_from", { ascending: false });

            if (error) throw error;
            return data as MemberDivision[];
        },
        enabled: !!memberId,
    });

    const addMutation = useMutation({
        mutationFn: async () => {
            if (!newDivisionId) {
                throw new Error("Selecciona una división");
            }

            // Si se marca como primaria, desmarcar las demás
            if (isPrimary) {
                await supabase
                    .from("member_divisions")
                    .update({ is_primary: false })
                    .eq("member_id", memberId);
            }

            const { error } = await supabase.from("member_divisions").insert({
                member_id: memberId,
                division_id: newDivisionId,
                is_primary: isPrimary,
                valid_from: format(validFrom, "yyyy-MM-dd"),
                valid_until: validUntil ? format(validUntil, "yyyy-MM-dd") : null,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["member-divisions"] });
            toast({ title: "División agregada exitosamente" });
            setShowAddForm(false);
            setNewDivisionId("");
            setIsPrimary(false);
            setValidFrom(new Date());
            setValidUntil(undefined);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const setPrimaryMutation = useMutation({
        mutationFn: async (divisionRecordId: string) => {
            // Desmarcar todas las divisiones primarias del miembro
            await supabase
                .from("member_divisions")
                .update({ is_primary: false })
                .eq("member_id", memberId);

            // Marcar la seleccionada como primaria
            const { error } = await supabase
                .from("member_divisions")
                .update({ is_primary: true })
                .eq("id", divisionRecordId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["member-divisions"] });
            toast({ title: "División primaria actualizada" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("member_divisions").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["member-divisions"] });
            toast({ title: "División eliminada" });
        },
    });

    const isActive = (division: MemberDivision) => {
        const today = new Date().toISOString().split("T")[0];
        const afterStart = division.valid_from <= today;
        const beforeEnd = !division.valid_until || division.valid_until >= today;
        return afterStart && beforeEnd;
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Divisiones de {memberName}</h3>
                    <p className="text-sm text-muted-foreground">
                        Gestiona las categorías en las que compite este arquero
                    </p>
                </div>
                {!showAddForm && (
                    <Button onClick={() => setShowAddForm(true)} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar División
                    </Button>
                )}
            </div>

            {showAddForm && (
                <div className="glass rounded-lg p-4 space-y-4 border border-border">
                    <h4 className="font-semibold">Nueva División</h4>

                    <div className="space-y-2">
                        <Label>División</Label>
                        <DivisionSelect
                            value={newDivisionId}
                            onChange={setNewDivisionId}
                            memberId={memberId}
                            placeholder="Selecciona una división..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Válido Desde</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {validFrom ? format(validFrom, "PPP", { locale: es }) : "Seleccionar fecha"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={validFrom} onSelect={(date) => date && setValidFrom(date)} />
                                </PopoverContent>
                            </Popover>
                        </div>

                        <div className="space-y-2">
                            <Label>Válido Hasta (Opcional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {validUntil ? format(validUntil, "PPP", { locale: es }) : "Sin límite"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Checkbox id="is_primary" checked={isPrimary} onCheckedChange={(checked) => setIsPrimary(checked as boolean)} />
                        <Label htmlFor="is_primary" className="cursor-pointer">
                            Marcar como división primaria
                        </Label>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}>
                            Agregar
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddForm(false)}>
                            Cancelar
                        </Button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="space-y-2">
                    {[1, 2].map((i) => (
                        <div key={i} className="glass rounded-lg p-3 h-16 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="space-y-2">
                    {memberDivisions?.length === 0 && (
                        <div className="glass rounded-lg p-6 text-center text-muted-foreground">
                            No hay divisiones asignadas
                        </div>
                    )}

                    {memberDivisions?.map((md) => (
                        <div
                            key={md.id}
                            className={`glass rounded-lg p-4 flex items-center justify-between ${!isActive(md) ? "opacity-60" : ""
                                }`}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{md.division.name}</h4>
                                    <Badge variant="outline">{md.division.abbreviation}</Badge>
                                    {md.is_primary && (
                                        <Badge className="gap-1">
                                            <Star className="h-3 w-3" />
                                            Primaria
                                        </Badge>
                                    )}
                                    {!isActive(md) && <Badge variant="destructive">Inactiva</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Desde: {format(new Date(md.valid_from), "PPP", { locale: es })}
                                    {md.valid_until && ` • Hasta: ${format(new Date(md.valid_until), "PPP", { locale: es })}`}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                {!md.is_primary && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPrimaryMutation.mutate(md.id)}
                                        disabled={setPrimaryMutation.isPending}
                                    >
                                        Marcar Primaria
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => deleteMutation.mutate(md.id)}
                                    disabled={deleteMutation.isPending}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
