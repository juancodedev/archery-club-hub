import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Target, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Mountain } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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
    club_id: string | null;
    active: boolean;
}

interface TournamentTypesManagerProps {
    clubId: string;
    isSuperAdmin?: boolean;
}

export default function TournamentTypesManager({ clubId, isSuperAdmin = false }: TournamentTypesManagerProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<TournamentType | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        arrows_per_end: "3",
        ends_per_round: "10",
        distance_meters: "",
        target_size_cm: "",
        is_indoor: false,
    });

    const { data: tournamentTypes, isLoading } = useQuery({
        queryKey: ["tournament_types", clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tournament_types")
                .select("*")
                .or(`is_system.eq.true,club_id.eq.${clubId}`)
                .order("is_system", { ascending: false })
                .order("name");

            if (error) throw error;
            return data as TournamentType[];
        },
        enabled: !!clubId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { error } = await supabase.from("tournament_types").insert({
                name: data.name,
                description: data.description?.trim() || null,
                arrows_per_end: parseInt(data.arrows_per_end) || 3,
                ends_per_round: parseInt(data.ends_per_round) || 10,
                distance_meters: data.distance_meters && data.distance_meters.trim() !== "" ? parseInt(data.distance_meters) : null,
                target_size_cm: data.target_size_cm && data.target_size_cm.trim() !== "" ? parseInt(data.target_size_cm) : null,
                is_indoor: data.is_indoor,
                is_system: false,
                club_id: clubId,
                active: true,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament_types"] });
            toast({ title: "Tipo de torneo creado" });
            setEditDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const { error } = await supabase
                .from("tournament_types")
                .update({
                    name: data.name,
                    description: data.description?.trim() || null,
                    arrows_per_end: parseInt(data.arrows_per_end) || 3,
                    ends_per_round: parseInt(data.ends_per_round) || 10,
                    distance_meters: data.distance_meters && data.distance_meters.trim() !== "" ? parseInt(data.distance_meters) : null,
                    target_size_cm: data.target_size_cm && data.target_size_cm.trim() !== "" ? parseInt(data.target_size_cm) : null,
                    is_indoor: data.is_indoor,
                })
                .eq("id", id)
                .select();

            if (error) throw error;
            if (!data || (data as any).length === 0) {
                throw new Error("No se pudo actualizar el registro. Es posible que no tengas permisos para modificar formatos globales del sistema.");
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament_types"] });
            toast({ title: "Tipo de torneo actualizado" });
            setEditDialogOpen(false);
            resetForm();
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase.from("tournament_types").update({ active: !active }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament_types"] });
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("tournament_types").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament_types"] });
            toast({ title: "Tipo de torneo eliminado" });
            setDeleteDialogOpen(false);
        },
        onError: (error: any) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            arrows_per_end: "3",
            ends_per_round: "10",
            distance_meters: "",
            target_size_cm: "",
            is_indoor: false,
        });
        setSelectedType(null);
    };

    const handleEdit = (type: TournamentType) => {
        setSelectedType(type);
        setFormData({
            name: type.name,
            description: type.description || "",
            arrows_per_end: type.arrows_per_end.toString(),
            ends_per_round: type.ends_per_round.toString(),
            distance_meters: type.distance_meters?.toString() || "",
            target_size_cm: type.target_size_cm?.toString() || "",
            is_indoor: type.is_indoor,
        });
        setEditDialogOpen(true);
    };

    const handleCreate = () => {
        resetForm();
        setEditDialogOpen(true);
    };

    const handleSubmit = () => {
        if (selectedType?.is_system && !isSuperAdmin) {
            toast({ title: "Acceso denegado", description: "No puedes modificar formatos del sistema", variant: "destructive" });
            return;
        }

        if (!formData.name || !formData.arrows_per_end || !formData.ends_per_round) {
            toast({ title: "Error", description: "Completa los campos obligatorios", variant: "destructive" });
            return;
        }
        if (selectedType) {
            updateMutation.mutate({ id: selectedType.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const filtered = tournamentTypes?.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-10 h-9"
                        placeholder="Buscar tipos de torneo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreate} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Tipo
                </Button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass rounded-lg p-3 h-16 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden border border-border/50">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="font-bold text-foreground">Nombre</TableHead>
                                <TableHead className="font-bold text-foreground hidden md:table-cell">Configuración</TableHead>
                                <TableHead className="font-bold text-foreground">Tipo</TableHead>
                                <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered?.map((type) => (
                                <TableRow key={type.id} className="hover:bg-muted/30 border-border/30 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {type.is_indoor ? <Target className="h-3.5 w-3.5 text-blue-500" /> : <Mountain className="h-3.5 w-3.5 text-green-500" />}
                                            <span className="font-medium text-foreground">{type.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                        {type.arrows_per_end} arr / {type.ends_per_round} ser
                                        {type.distance_meters && ` (${type.distance_meters}m)`}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={type.is_system ? "default" : "secondary"} className="text-[10px]">
                                            {type.is_system ? "Sistema" : "Club"}
                                        </Badge>
                                        {!type.active && <Badge variant="destructive" className="ml-1 text-[10px]">Inactivo</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(type)} title={type.is_system && !isSuperAdmin ? "Ver detalles" : "Editar"}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>

                                            {(isSuperAdmin || !type.is_system) && (
                                                <>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActiveMutation.mutate({ id: type.id, active: type.active })} title={type.active ? "Desactivar" : "Activar"}>
                                                        {type.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedType(type); setDeleteDialogOpen(true); }} title="Eliminar">
                                                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                    </Button>
                                                </>
                                            )}

                                            {type.is_system && !isSuperAdmin && (
                                                <Badge variant="outline" className="text-[10px] opacity-50 ml-1">Sistema</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedType ? "Editar Formato" : "Nuevo Formato"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 text-left">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="t-name">Nombre *</Label>
                            <Input id="t-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="arrows">Flechas por Serie</Label>
                                <Input id="arrows" type="number" value={formData.arrows_per_end} onChange={(e) => setFormData({ ...formData, arrows_per_end: e.target.value })} />
                            </div>
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="ends">Series por Ronda</Label>
                                <Input id="ends" type="number" value={formData.ends_per_round} onChange={(e) => setFormData({ ...formData, ends_per_round: e.target.value })} />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id="indoor" checked={formData.is_indoor} onCheckedChange={(c) => setFormData({ ...formData, is_indoor: c as boolean })} />
                            <Label htmlFor="indoor" className="cursor-pointer">Es Indoor (afecta conteo de X=10)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={selectedType?.is_system && !isSuperAdmin}>
                            {selectedType?.is_system && !isSuperAdmin ? "Solo Lectura" : (selectedType ? "Actualizar" : "Crear")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>¿Eliminar formato?</DialogTitle></DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => selectedType && deleteMutation.mutate(selectedType.id)}>Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
