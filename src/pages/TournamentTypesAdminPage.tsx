import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Target, Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Mountain, Compass } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISCIPLINES, BOW_TYPES, TOURNAMENT_FORMATS, yardsToMeters, metersToYards, formatYards } from "@/lib/archeryConstants";
import type { TournamentType } from "@/types/archery";



const DISCIPLINE_BADGE_COLORS: Record<string, string> = {
    outdoor: "bg-green-500/10 text-green-500 border-green-500/20",
    indoor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    campo: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    "3d": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

const DISCIPLINE_ICONS: Record<string, string> = {
    outdoor: "🎯",
    indoor: "🏠",
    campo: "🌲",
    "3d": "🐗",
};

export default function TournamentTypesAdminPage() {
    const { member } = useAuth();
    const isSuperAdmin = member?.is_super_admin ?? false;

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
        distance_yards: "",
        target_size_cm: "",
        is_indoor: false,
        discipline: "",
        bow_type: "todos",
        tournament_format: "ranking_round",
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
            const yardsVal = data.distance_yards ? parseFloat(data.distance_yards) : null;
            const metersVal = yardsVal ? yardsToMeters(yardsVal) : null;

            const { error } = await supabase.from("tournament_types").insert({
                name: data.name,
                description: data.description || null,
                arrows_per_end: parseInt(data.arrows_per_end),
                ends_per_round: parseInt(data.ends_per_round),
                distance_meters: metersVal,
                distance_yards: yardsVal,
                target_size_cm: data.target_size_cm ? parseInt(data.target_size_cm) : null,
                is_indoor: data.discipline === "indoor",
                discipline: data.discipline || null,
                bow_type: data.bow_type || null,
                tournament_format: data.tournament_format || null,
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
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });

        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
            const yardsVal = data.distance_yards ? parseFloat(data.distance_yards) : null;
            const metersVal = yardsVal ? yardsToMeters(yardsVal) : null;

            const { error } = await supabase
                .from("tournament_types")
                .update({
                    name: data.name,
                    description: data.description || null,
                    arrows_per_end: parseInt(data.arrows_per_end),
                    ends_per_round: parseInt(data.ends_per_round),
                    distance_meters: metersVal,
                    distance_yards: yardsVal,
                    target_size_cm: data.target_size_cm ? parseInt(data.target_size_cm) : null,
                    is_indoor: data.discipline === "indoor",
                    discipline: data.discipline || null,
                    bow_type: data.bow_type || null,
                    tournament_format: data.tournament_format || null,
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
        onError: (error: Error) => {
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
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });

        },
    });

    const resetForm = () => {
        setFormData({
            name: "",
            description: "",
            arrows_per_end: "3",
            ends_per_round: "10",
            distance_yards: "",
            target_size_cm: "",
            is_indoor: false,
            discipline: "",
            bow_type: "todos",
            tournament_format: "ranking_round",
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
            distance_yards: type.distance_yards?.toString() || (type.distance_meters ? metersToYards(type.distance_meters).toString() : ""),
            target_size_cm: type.target_size_cm?.toString() || "",
            is_indoor: type.is_indoor,
            discipline: type.discipline || "",
            bow_type: type.bow_type || "todos",
            tournament_format: type.tournament_format || "ranking_round",
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

    const getDisciplineLabel = (d: string | null) => {
        const found = DISCIPLINES.find(disc => disc.value === d);
        return found ? `${found.icon} ${found.label}` : "—";
    };

    const getFormatLabel = (f: string | null) => {
        const found = TOURNAMENT_FORMATS.find(fmt => fmt.value === f);
        return found ? found.label : f || "—";
    };

    const getDistanceDisplay = (type: TournamentType) => {
        if (type.distance_yards) return `${type.distance_yards} yd`;
        if (type.distance_meters) return `${metersToYards(type.distance_meters)} yd`;
        return "—";
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
                            Formatos World Archery — Distancias en Yardas
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
                                    <TableHead className="font-bold text-foreground">Disciplina</TableHead>
                                    <TableHead className="font-bold text-foreground">Flechas x Serie</TableHead>
                                    <TableHead className="font-bold text-foreground">Series x Ronda</TableHead>
                                    <TableHead className="font-bold text-foreground">Distancia</TableHead>
                                    <TableHead className="font-bold text-foreground">Cara</TableHead>
                                    <TableHead className="font-bold text-foreground">Formato</TableHead>
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
                                                ) : type.discipline === "campo" ? (
                                                    <Compass className="h-4 w-4 text-amber-500" />
                                                ) : (
                                                    <Mountain className="h-4 w-4 text-green-500" />
                                                )}
                                                <div>
                                                    <p className="font-semibold leading-tight">{type.name}</p>
                                                    {type.description && (
                                                        <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1 max-w-[200px]">{type.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {type.discipline ? (
                                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${DISCIPLINE_BADGE_COLORS[type.discipline] || "bg-muted/30"}`}>
                                                    {DISCIPLINE_ICONS[type.discipline]} {type.discipline}
                                                </span>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{type.arrows_per_end}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{type.ends_per_round}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-sm">
                                            {getDistanceDisplay(type)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {type.target_size_cm ? `${type.target_size_cm} cm` : "—"}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {getFormatLabel(type.tournament_format)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={type.is_system ? "default" : "secondary"}>
                                                {type.is_system ? "Sistema" : "Club"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {!type.is_system && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => handleEdit(type)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => toggleActiveMutation.mutate({ id: type.id, active: type.active })}
                                                        >
                                                            {type.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleDelete(type)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </>
                                                )}
                                                {type.is_system && (
                                                    <span className="text-xs text-muted-foreground italic px-2">Sistema</span>
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
                <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
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
                        {/* Nombre */}
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ej: Indoor 20yd Vegas"
                            />
                        </div>

                        {/* Descripción */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Descripción</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Descripción del formato"
                            />
                        </div>

                        {/* Disciplina + Tipo de arco */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Disciplina</Label>
                                <Select value={formData.discipline} onValueChange={(v) => setFormData({ ...formData, discipline: v, is_indoor: v === "indoor" })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DISCIPLINES.map(d => (
                                            <SelectItem key={d.value} value={d.value}>
                                                {d.icon} {d.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Tipo de Arco</Label>
                                <Select value={formData.bow_type} onValueChange={(v) => setFormData({ ...formData, bow_type: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {BOW_TYPES.map(b => (
                                            <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Formato de torneo */}
                        <div className="grid gap-2">
                            <Label>Formato de Torneo</Label>
                            <Select value={formData.tournament_format} onValueChange={(v) => setFormData({ ...formData, tournament_format: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar formato..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {TOURNAMENT_FORMATS.map(f => (
                                        <SelectItem key={f.value} value={f.value}>
                                            <div>
                                                <p className="font-medium">{f.label}</p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{f.description}</p>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Flechas + Series */}
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

                        {/* Distancia (yd) + Cara de diana */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="distance_yards">Distancia (yardas)</Label>
                                <Input
                                    id="distance_yards"
                                    type="number"
                                    value={formData.distance_yards}
                                    onChange={(e) => setFormData({ ...formData, distance_yards: e.target.value })}
                                    placeholder="Ej: 20, 55, 76"
                                />
                                {formData.distance_yards && (
                                    <p className="text-[10px] text-muted-foreground">
                                        ≈ {Math.round(parseFloat(formData.distance_yards) / 1.09361)} metros
                                    </p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="target_size_cm">Cara de Diana (cm)</Label>
                                <Input
                                    id="target_size_cm"
                                    type="number"
                                    value={formData.target_size_cm}
                                    onChange={(e) => setFormData({ ...formData, target_size_cm: e.target.value })}
                                    placeholder="40, 80, 122"
                                />
                            </div>
                        </div>

                        {/* Indoor checkbox (auto-check si disciplina = indoor) */}
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_indoor"
                                checked={formData.discipline === "indoor" || formData.is_indoor}
                                onCheckedChange={(checked) => setFormData({ ...formData, is_indoor: checked as boolean })}
                            />
                            <Label htmlFor="is_indoor" className="cursor-pointer">
                                Torneo Indoor (cuenta X's para desempate)
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
                            ¿Estás seguro de eliminar "{selectedType?.name}"? Esta acción no se puede deshacer.
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
