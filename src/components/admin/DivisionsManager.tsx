import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
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

interface DivisionsManagerProps {
    clubId: string;
    isSuperAdmin?: boolean;
}

export default function DivisionsManager({ clubId, isSuperAdmin = false }: DivisionsManagerProps) {
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
        queryKey: ["divisions", clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("divisions")
                .select("*")
                .or(`is_system.eq.true,club_id.eq.${clubId}`)
                .order("is_system", { ascending: false })
                .order("name");

            if (error) throw error;
            return data as Division[];
        },
        enabled: !!clubId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const { error } = await supabase.from("divisions").insert({
                name: data.name,
                abbreviation: data.abbreviation,
                description: data.description?.trim() || null,
                min_age: data.min_age && data.min_age.trim() !== "" ? parseInt(data.min_age) : null,
                max_age: data.max_age && data.max_age.trim() !== "" ? parseInt(data.max_age) : null,
                gender: data.gender === "mixed" ? null : (data.gender || null),
                is_system: false,
                club_id: clubId,
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
        mutationFn: async ({ id, data: formValues }: { id: string; data: typeof formData }) => {
            const { error, data: updated } = await supabase
                .from("divisions")
                .update({
                    name: formValues.name.trim(),
                    abbreviation: formValues.abbreviation.trim().toUpperCase(),
                    description: formValues.description?.trim() || null,
                    min_age: formValues.min_age && formValues.min_age.trim() !== "" ? parseInt(formValues.min_age) : null,
                    max_age: formValues.max_age && formValues.max_age.trim() !== "" ? parseInt(formValues.max_age) : null,
                    gender: formValues.gender === "mixed" ? null : (formValues.gender || null),
                })
                .eq("id", id)
                .select();

            if (error) throw error;
            if (!updated || updated.length === 0) {
                throw new Error("No se pudo actualizar el registro. Es posible que no tengas permisos para modificar categorías globales del sistema.");
            }
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
        if (division.is_system && !isSuperAdmin) {
            toast({
                title: "Acceso limitado",
                description: "Como administrador del club, puedes ver estos detalles pero no puedes modificar las categorías base del sistema.",
                variant: "default"
            });
            // Still allow opening to view details, but we will protect the "Save" button
        }
        setSelectedDivision(division);
        setFormData({
            name: division.name,
            abbreviation: division.abbreviation,
            description: division.description || "",
            min_age: division.min_age?.toString() || "",
            max_age: division.max_age?.toString() || "",
            gender: division.gender || "mixed",
        });
        setEditDialogOpen(true);
    };

    const handleCreate = () => {
        resetForm();
        setEditDialogOpen(true);
    };

    const handleSubmit = () => {
        if (selectedDivision?.is_system && !isSuperAdmin) {
            toast({ title: "Error", description: "No tienes permisos para modificar categorías del sistema", variant: "destructive" });
            return;
        }

        if (!formData.name || !formData.abbreviation) {
            toast({ title: "Error", description: "Nombre y abreviación son obligatorios", variant: "destructive" });
            return;
        }

        const submittableData = {
            ...formData,
            gender: formData.gender === "mixed" ? "" : formData.gender
        };

        if (selectedDivision) {
            updateMutation.mutate({ id: selectedDivision.id, data: submittableData });
        } else {
            createMutation.mutate(submittableData);
        }
    };

    const handleDelete = (division: Division) => {
        if (division.is_system && !isSuperAdmin) {
            toast({ title: "No se puede eliminar", description: "Las divisiones del sistema no pueden ser eliminadas", variant: "destructive" });
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
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-10 h-9"
                        placeholder="Buscar divisiones..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreate} size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Nueva División
                </Button>
            </div>

            {/* Divisions table */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="glass rounded-lg p-3 h-16 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden border border-border/50">
                    <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-border/50">
                                <TableHead className="font-bold text-foreground">Nombre</TableHead>
                                <TableHead className="font-bold text-foreground hidden md:table-cell">Edades</TableHead>
                                <TableHead className="font-bold text-foreground">Tipo</TableHead>
                                <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered?.map((division) => (
                                <TableRow key={division.id} className="hover:bg-muted/30 border-border/30 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{division.name}</span>
                                            <span className="text-xs text-muted-foreground">{division.abbreviation}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                                        {division.min_age || division.max_age
                                            ? `${division.min_age || "—"} a ${division.max_age || "—"} años`
                                            : "Cualquiera"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={division.is_system ? "default" : "secondary"} className="text-[10px]">
                                            {division.is_system ? "Sistema" : "Club"}
                                        </Badge>
                                        {!division.active && (
                                            <Badge variant="destructive" className="ml-1 text-[10px]">Inactiva</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9"
                                                onClick={() => handleEdit(division)}
                                                title={division.is_system && !isSuperAdmin ? "Ver detalles" : "Editar"}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            {(isSuperAdmin || !division.is_system) && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9"
                                                        onClick={() => toggleActiveMutation.mutate({ id: division.id, active: division.active })}
                                                        title={division.active ? "Desactivar" : "Activar"}
                                                    >
                                                        {division.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9"
                                                        onClick={() => handleDelete(division)}
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </>
                                            )}

                                            {division.is_system && !isSuperAdmin && (
                                                <Badge variant="outline" className="text-[10px] opacity-50 ml-1">Sistema</Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    </div>

                    {filtered?.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-sm text-muted-foreground">No hay divisiones</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{selectedDivision ? "Editar División" : "Nueva División"}</DialogTitle>
                        <DialogDescription>
                            Configure los parámetros de edad y género para esta categoría.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4 text-left">
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="abbreviation">Abreviación *</Label>
                            <Input id="abbreviation" value={formData.abbreviation} onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value })} maxLength={5} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="min_age">Edad Mínima</Label>
                                <Input id="min_age" type="number" value={formData.min_age} onChange={(e) => setFormData({ ...formData, min_age: e.target.value })} />
                            </div>
                            <div className="grid gap-2 text-left">
                                <Label htmlFor="max_age">Edad Máxima</Label>
                                <Input id="max_age" type="number" value={formData.max_age} onChange={(e) => setFormData({ ...formData, max_age: e.target.value })} />
                            </div>
                        </div>
                        <div className="grid gap-2 text-left">
                            <Label htmlFor="gender">Género</Label>
                            <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                                <SelectTrigger><SelectValue placeholder="Mixto" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mixed">Mixto</SelectItem>
                                    <SelectItem value="M">Masculino</SelectItem>
                                    <SelectItem value="F">Femenino</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={selectedDivision?.is_system && !isSuperAdmin}>
                            {selectedDivision?.is_system && !isSuperAdmin ? "Solo Lectura" : (selectedDivision ? "Actualizar" : "Crear")}
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
                            ¿Estás seguro de eliminar "{selectedDivision?.name}"? Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={() => selectedDivision && deleteMutation.mutate(selectedDivision.id)}>Eliminar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
