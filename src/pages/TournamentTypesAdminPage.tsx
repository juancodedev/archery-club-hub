import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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

export default function TournamentTypesAdminPage() {
    const { member } = useAuth();
    const isSuperAdmin = member?.is_super_admin || member?.email === "cl.jmunoz@gmail.com";
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<TournamentType | null>(null);

    // Form state
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
        queryKey: ["tournament_types", member?.club_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tournament_types")
                .select("*")
                .or(`is_system.eq.true,club_id.eq.${member?.club_id}`)
                .order("is_system", { ascending: false })
                .order("name");

            if (error) throw error;
            return data as TournamentType[];
        },
        enabled: !!member?.club_id,
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { error } = await supabase.from("tournament_types").insert({
                name: data.name,
                description: data.description || null,
                arrows_per_end: parseInt(data.arrows_per_end),
                ends_per_round: parseInt(data.ends_per_round),
                distance_meters: data.distance_meters ? parseInt(data.distance_meters) : null,
                target_size_cm: data.target_size_cm ? parseInt(data.target_size_cm) : null,
                is_indoor: data.is_indoor,
                is_system: false,
                club_id: member?.club_id,
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
                    description: data.description || null,
                    arrows_per_end: parseInt(data.arrows_per_end),
                    ends_per_round: parseInt(data.ends_per_round),
                    distance_meters: data.distance_meters ? parseInt(data.distance_meters) : null,
                    target_size_cm: data.target_size_cm ? parseInt(data.target_size_cm) : null,
                    is_indoor: data.is_indoor,
                })
                .eq("id", id);
            if (error) throw error;
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
            const { error } = await supabase
                .from("tournament_types")
                .update({ active: !active })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament_types"] });
            toast({ title: "Estado actualizado" });
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
            setSelectedType(null);
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
        if (type.is_system) {
            toast({ title: "No se puede editar", description: "Los tipos de torneo del sistema no se pueden modificar", variant: "destructive" });
            return;
        }
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
        if (!formData.name || !formData.arrows_per_end || !formData.ends_per_round) {
            toast({ title: "Error", description: "Nombre, flechas por serie y series por ronda son obligatorios", variant: "destructive" });
            return;
        }

        if (selectedType) {
            updateMutation.mutate({ id: selectedType.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (type: TournamentType) => {
        if (type.is_system) {
            toast({ title: "No se puede eliminar", description: "Los tipos de torneo del sistema no se pueden eliminar", variant: "destructive" });
            return;
        }
        setSelectedType(type);
        setDeleteDialogOpen(true);
    };

    const filtered = tournamentTypes?.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.description?.toLowerCase() || "").includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            Gestión de Tipos de Torneo
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Administra los formatos de competencia disponibles
                        </p>
                    </div>

                    <Button onClick={handleCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nuevo Tipo de Torneo
                    </Button>
                </div>
            </motion.div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-10"
                    placeholder="Buscar tipos de torneo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Tournament Types table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass rounded-lg p-3 sm:p-4 h-16 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden border border-border/50">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/50">
                                    <TableHead className="font-bold text-foreground">Nombre</TableHead>
                                    <TableHead className="font-bold text-foreground">Flechas x Serie</TableHead>
                                    <TableHead className="font-bold text-foreground">Series x Ronda</TableHead>
                                    <TableHead className="font-bold text-foreground">Distancia</TableHead>
                                    <TableHead className="font-bold text-foreground">Cara</TableHead>
                                    <TableHead className="font-bold text-foreground">Tipo</TableHead>
                                    <TableHead className="font-bold text-foreground">Estado</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered?.map((type) => (
                                    <TableRow key={type.id} className="hover:bg-muted/30 border-border/30 transition-colors">
                                        <TableCell className="font-medium text-foreground">
                                            <div className="flex items-center gap-2">
                                                {type.is_indoor ? (
                                                    <Target className="h-4 w-4 text-blue-500" />
                                                ) : (
                                                    <Mountain className="h-4 w-4 text-green-500" />
                                                )}
                                                {type.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{type.arrows_per_end}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{type.ends_per_round}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {type.distance_meters ? `${type.distance_meters}m` : "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {type.target_size_cm ? `${type.target_size_cm}cm` : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={type.is_system ? "default" : "secondary"}>
                                                {type.is_system ? "Sistema" : "Personalizado"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={type.active ? "default" : "destructive"}>
                                                {type.active ? "Activo" : "Inactivo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!type.is_system && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(type)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleActiveMutation.mutate({ id: type.id, active: type.active })}
                                                        >
                                                            {type.active ? (
                                                                <ToggleRight className="h-4 w-4" />
                                                            ) : (
                                                                <ToggleLeft className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(type)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </>
                                                )}
                                                {type.is_system && (
                                                    <span className="text-xs text-muted-foreground italic px-2">
                                                        Sistema
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {filtered?.length === 0 && (
                        <div className="p-8 text-center bg-muted/10">
                            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                            <p className="text-muted-foreground">No se encontraron tipos de torneo</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedType ? "Editar Tipo de Torneo" : "Nuevo Tipo de Torneo"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedType
                                ? "Modifica los datos del tipo de torneo"
                                : "Crea un nuevo formato de competencia para tu club"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Indoor 18m Vegas"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del formato"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="arrows_per_end">Flechas por Serie *</Label>
                                <Input
                                    id="arrows_per_end"
                                    type="number"
                                    value={formData.arrows_per_end}
                                    onChange={(e) => setFormData({ ...formData, arrows_per_end: e.target.value })}
                                    placeholder="3"
                                    min="1"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="ends_per_round">Series por Ronda *</Label>
                                <Input
                                    id="ends_per_round"
                                    type="number"
                                    value={formData.ends_per_round}
                                    onChange={(e) => setFormData({ ...formData, ends_per_round: e.target.value })}
                                    placeholder="10"
                                    min="1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="distance_meters">Distancia (m)</Label>
                                <Input
                                    id="distance_meters"
                                    type="number"
                                    value={formData.distance_meters}
                                    onChange={(e) => setFormData({ ...formData, distance_meters: e.target.value })}
                                    placeholder="18"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="target_size_cm">Tamaño Cara (cm)</Label>
                                <Input
                                    id="target_size_cm"
                                    type="number"
                                    value={formData.target_size_cm}
                                    onChange={(e) => setFormData({ ...formData, target_size_cm: e.target.value })}
                                    placeholder="40"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_indoor"
                                checked={formData.is_indoor}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_indoor: checked as boolean })}
                            />
                            <Label htmlFor="is_indoor" className="cursor-pointer">
                                Torneo Indoor (afecta conteo de X's para desempate)
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                            {selectedType ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar tipo de torneo?</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de eliminar el tipo de torneo "{selectedType?.name}"? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedType && deleteMutation.mutate(selectedType.id)}
                            disabled={deleteMutation.isPending}
                        >
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
