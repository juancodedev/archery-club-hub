import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    Trophy,
    Calendar as CalendarIcon,
    MapPin,
    Plus,
    Filter,
    ChevronLeft,
    ChevronRight,
    Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Tournament {
    id: string;
    name: string;
    description: string | null;
    start_date: string;
    end_date: string;
    location: string | null;
    tournament_type_id: string | null;
    tournament_types?: { name: string } | null;
}

export default function TournamentsPage() {
    const { member } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [searchQuery, setSearchQuery] = useState("");

    const clubId = member?.club_id;
    const isAdmin = member?.roles?.some(r => ["administrador", "presidente", "entrenador"].includes(r));

    const { data: tournaments, isLoading } = useQuery({
        queryKey: ["tournaments", clubId],
        queryFn: async () => {
            if (!clubId) return [];
            const { data, error } = await supabase
                .from("tournaments" as any)
                .select("*, tournament_types(name)")
                .eq("club_id", clubId)
                .order("start_date", { ascending: true });

            if (error) throw error;
            return data as unknown as Tournament[];
        },
        enabled: !!clubId,
    });

    const { data: tournamentTypes } = useQuery({
        queryKey: ["tournament-types", clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tournament_types")
                .select("id, name")
                .order("name");
            if (error) throw error;
            return data;
        },
    });

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [location, setLocation] = useState("");
    const [typeId, setTypeId] = useState<string | null>(null);

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!clubId) return;
            const { error } = await supabase.from("tournaments" as any).insert({
                club_id: clubId,
                name,
                description,
                start_date: startDate,
                end_date: endDate,
                location,
                tournament_type_id: typeId,
                created_by: member?.id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournaments"] });
            toast({ title: "Torneo creado exitosamente" });
            setIsFormOpen(false);
            resetForm();
        },
        onError: (error: Error) => {
            toast({ title: "Error al crear torneo", description: error.message, variant: "destructive" });
        }
    });

    const resetForm = () => {
        setName("");
        setDescription("");
        setStartDate(new Date().toISOString().split("T")[0]);
        setEndDate(new Date().toISOString().split("T")[0]);
        setLocation("");
        setTypeId(null);
    };

    const filteredTournaments = tournaments?.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const tournamentsOnSelectedDate = tournaments?.filter(t => {
        if (!selectedDate) return false;
        const d = format(selectedDate, "yyyy-MM-dd");
        return t.start_date <= d && t.end_date >= d;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <Trophy className="h-7 w-7 text-primary" />
                        Calendario de Torneos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 text-pretty">
                        Próximas competencias, eventos oficiales y torneos internos del club.
                    </p>
                </div>
                {isAdmin && (
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold">
                                <Plus className="h-4 w-4" /> Crear Torneo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glass sm:max-w-[500px] rounded-[2rem] border-none">
                            <DialogHeader>
                                <DialogTitle className="font-display font-bold text-xl">Nuevo Torneo</DialogTitle>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
                                className="space-y-4 pt-4"
                            >
                                <div className="space-y-2">
                                    <Label>Nombre del Torneo</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Abierto de Primavera" className="glass h-11 rounded-xl" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Fecha Inicio</Label>
                                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="glass h-11 rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fecha Fin</Label>
                                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="glass h-11 rounded-xl" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Ubicación</Label>
                                    <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Campo Principal" className="glass h-11 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Torneo</Label>
                                    <Select value={typeId || ""} onValueChange={setTypeId}>
                                        <SelectTrigger className="glass h-11 rounded-xl">
                                            <SelectValue placeholder="Seleccionar tipo..." />
                                        </SelectTrigger>
                                        <SelectContent className="glass">
                                            {tournamentTypes?.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Descripción</Label>
                                    <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles, requisitos, premios..." className="glass rounded-xl min-h-[100px]" />
                                </div>
                                <Button type="submit" className="w-full h-12 rounded-xl font-black mt-4" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Guardando..." : "CREAR TORNEO"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Calendar Side */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-6">
                    <Card className="glass border-primary/10 shadow-xl rounded-[2rem] overflow-hidden">
                        <CardContent className="p-3">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={es}
                                className="rounded-2xl"
                                modifiers={{
                                    hasTournament: (date) => tournaments?.some(t => {
                                        const d = format(date, "yyyy-MM-dd");
                                        return t.start_date <= d && t.end_date >= d;
                                    }) || false
                                }}
                                modifiersStyles={{
                                    hasTournament: { fontWeight: 'bold', color: 'hsl(var(--primary))', textDecoration: 'underline' }
                                }}
                            />
                        </CardContent>
                    </Card>

                    <Card className="glass border-primary/5 shadow-lg rounded-[2rem]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : "Hoy"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {tournamentsOnSelectedDate && tournamentsOnSelectedDate.length > 0 ? (
                                tournamentsOnSelectedDate.map(t => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2"
                                    >
                                        <h4 className="font-bold text-foreground leading-tight">{t.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                            <MapPin className="h-3 w-3 text-primary/60" />
                                            {t.location || "Ubicación por confirmar"}
                                        </div>
                                        {t.tournament_types && (
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wide">
                                                {t.tournament_types.name}
                                            </span>
                                        )}
                                    </motion.div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic text-center py-6">
                                    No hay torneos programados para este día.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* List Side */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    <div className="flex items-center gap-3 glass p-2 rounded-2xl border-primary/10">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar torneos por nombre o lugar..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 border-none bg-transparent shadow-none focus-visible:ring-0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <Card key={i} className="glass rounded-[2rem] h-48 animate-pulse border-none" />
                            ))
                        ) : filteredTournaments?.length === 0 ? (
                            <div className="col-span-full py-20 text-center glass rounded-[2.5rem]">
                                <Trophy className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium italic">No se encontraron torneos.</p>
                            </div>
                        ) : (
                            filteredTournaments?.map((t, i) => (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                >
                                    <Card className="glass relative group overflow-hidden border-primary/5 hover:border-primary/20 transition-all rounded-[2rem] h-full flex flex-col">
                                        <div className="absolute top-0 right-0 p-4">
                                            <div className="bg-primary/10 text-primary p-2 rounded-xl">
                                                <Trophy className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <CardHeader>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">
                                                {format(new Date(t.start_date), "MMM d", { locale: es })}
                                                {t.start_date !== t.end_date && ` - ${format(new Date(t.end_date), "MMM d", { locale: es })}`}
                                            </p>
                                            <CardTitle className="text-xl font-display font-bold text-foreground leading-tight group-hover:text-primary transition-colors">
                                                {t.name}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium">
                                                    <MapPin className="h-4 w-4 text-primary/40 mt-0.5" />
                                                    <span className="line-clamp-1">{t.location || "Sin ubicación"}</span>
                                                </div>
                                                {t.description && (
                                                    <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3">
                                                        {t.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between pt-2">
                                                {t.tournament_types && (
                                                    <Badge variant="outline" className="rounded-lg bg-primary/5 border-primary/10 text-[10px] uppercase font-black tracking-widest px-3 h-6">
                                                        {t.tournament_types.name}
                                                    </Badge>
                                                )}
                                                <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                                                    Ver detalles
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
