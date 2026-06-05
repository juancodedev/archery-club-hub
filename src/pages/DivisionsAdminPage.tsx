import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trophy, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Division {
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

export default function DivisionsAdminPage() {
    const { member } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: "",
        abbreviation: "",
        description: "",
        min_age: "",
        max_age: "",
        gender: "",
    });

    const { data: divisions, isLoading } = useQuery({
        queryKey: ["divisions", member?.club_id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("divisions")
                .select("*")
                .or(`is_system.eq.true,club_id.eq.${member?.club_id}`)
                .order("is_system", { ascending: false })
                .order("name");

            if (error) throw error;
            return data as Division[];
        },
        enabled: !!member?.club_id,
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { error } = await supabase.from("divisions").insert({
                name: data.name,
                abbreviation: data.abbreviation,
                description: data.description || null,
                min_age: data.min_age ? parseInt(data.min_age) : null,
                max_age: data.max_age ? parseInt(data.max_age) : null,
                gender: data.gender || null,
                is_system: false,
                club_id: member?.club_id,
                active: true,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["divisions"] });
            toast({ title: "División creada exitosamente" });
            setEditDialogOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const { error } = await supabase
                .from("divisions")
                .update({
                    name: data.name,
                    abbreviation: data.abbreviation,
                    description: data.description || null,
                    min_age: data.min_age ? parseInt(data.min_age) : null,
                    max_age: data.max_age ? parseInt(data.max_age) : null,
                    gender: data.gender || null,
                })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["divisions"] });
            toast({ title: "División actualizada" });
            setEditDialogOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
            const { error } = await supabase
                .from("divisions")
                .update({ active: !active })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["divisions"] });
            toast({ title: "Estado actualizado" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("divisions").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["divisions"] });
            toast({ title: "División eliminada" });
            setDeleteDialogOpen(false);
            setSelectedDivision(null);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            abbreviation: "",
            description: "",
            min_age: "",
            max_age: "",
            gender: "",
        });
        setSelectedDivision(null);
    };

    const handleEdit = (division: Division) => {
        if (division.is_system) {
            toast({ title: "No se puede editar", description: "Las divisiones del sistema no se pueden modificar", variant: "destructive" });
            return;
        }
        setSelectedDivision(division);
        setFormData({
            name: division.name,
            abbreviation: division.abbreviation,
            description: division.description || "",
            min_age: division.min_age?.toString() || "",
            max_age: division.max_age?.toString() || "",
            gender: division.gender || "",
        });
        setEditDialogOpen(true);
    };

    const handleCreate = () => {
        resetForm();
        setEditDialogOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.abbreviation) {
            toast({ title: "Error", description: "Nombre y abreviación son obligatorios", variant: "destructive" });
            return;
        }

        if (selectedDivision) {
            updateMutation.mutate({ id: selectedDivision.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (division: Division) => {
        if (division.is_system) {
            toast({ title: "No se puede eliminar", description: "Las divisiones del sistema no se pueden eliminar", variant: "destructive" });
            return;
        }
        setSelectedDivision(division);
        setDeleteDialogOpen(true);
    };

    const filtered = divisions?.filter((d) =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.abbreviation.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                        <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
                            <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            Gestión de Divisiones
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Administra las categorías y divisiones para competencias
                        </p>
                    </div>

                    <Button onClick={handleCreate} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nueva División
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-10"
                    placeholder="Buscar divisiones..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* Divisions table */}
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
                                    <TableHead className="font-bold text-foreground">Abreviación</TableHead>
                                    <TableHead className="font-bold text-foreground">Edad</TableHead>
                                    <TableHead className="font-bold text-foreground">Género</TableHead>
                                    <TableHead className="font-bold text-foreground">Tipo</TableHead>
                                    <TableHead className="font-bold text-foreground">Estado</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered?.map((division) => (
                                    <TableRow key={division.id} className="hover:bg-muted/30 border-border/30 transition-colors">
                                        <TableCell className="font-medium text-foreground">
                                            {division.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{division.abbreviation}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {division.min_age || division.max_age
                                                ? `${division.min_age || "—"} a ${division.max_age || "—"} años`
                                                : "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {division.gender === "M"
                                                ? "Masculino"
                                                : division.gender === "F"
                                                    ? "Femenino"
                                                    : "Mixto"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={division.is_system ? "default" : "secondary"}>
                                                {division.is_system ? "Sistema" : "Personalizada"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={division.active ? "default" : "destructive"}>
                                                {division.active ? "Activa" : "Inactiva"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!division.is_system && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleEdit(division)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleActiveMutation.mutate({ id: division.id, active: division.active })}
                                                        >
                                                            {division.active ? (
                                                                <ToggleRight className="h-4 w-4" />
                                                            ) : (
                                                                <ToggleLeft className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(division)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </>
                                                )}
                                                {division.is_system && (
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
                            <Trophy className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                            <p className="text-muted-foreground">No se encontraron divisiones</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedDivision ? "Editar División" : "Nueva División"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedDivision
                                ? "Modifica los datos de la división personalizada"
                                : "Crea una nueva división para tu club"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Recurvo Master"
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="abbreviation">Abreviación *</Label>
                            <Input
                                id="abbreviation"
                                value={formData.abbreviation}
                                onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })}
                                placeholder="Ej: RCM"
                                maxLength={5}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción opcional"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="min_age">Edad Mínima</Label>
                                <Input
                                    id="min_age"
                                    type="number"
                                    value={formData.min_age}
                                    onChange={(e) => setFormData({ ...formData, min_age: e.target.value })}
                                    placeholder="Ej: 50"
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="max_age">Edad Máxima</Label>
                                <Input
                                    id="max_age"
                                    type="number"
                                    value={formData.max_age}
                                    onChange={(e) => setFormData({ ...formData, max_age: e.target.value })}
                                    placeholder="Ej: 65"
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="gender">Género</Label>
                            <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar género" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Mixto</SelectItem>
                                    <SelectItem value="M">Masculino</SelectItem>
                                    <SelectItem value="F">Femenino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                            {selectedDivision ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>¿Eliminar división?</DialogTitle>
                        <DialogDescription>
                            ¿Estás seguro de eliminar la división "{selectedDivision?.name}"? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => selectedDivision && deleteMutation.mutate(selectedDivision.id)}
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
