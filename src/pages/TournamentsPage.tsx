import { useState } from "react";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Trophy,
    Calendar as CalendarIcon,
    MapPin,
    Plus,
    Search,
    CheckCircle2,
    XCircle,
    Clock,
    Users,
    ChevronDown,
    ChevronUp,
    Building2,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

interface Registration {
    id: string;
    tournament_id: string;
    member_id: string;
    status: "pendiente" | "confirmado" | "rechazado";
    notes: string | null;
    members?: {
        id: string;
        full_name: string;
        avatar_url?: string | null;
    };
}

const STATUS_CONFIG = {
    pendiente: { label: "Pendiente", icon: Clock, color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
    confirmado: { label: "Confirmado", icon: CheckCircle2, color: "bg-green-500/10 text-green-600 border-green-500/20" },
    rechazado: { label: "Rechazado", icon: XCircle, color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

function MemberAvatar({ name, avatarUrl, size = "sm" }: { name: string; avatarUrl?: string | null; size?: "sm" | "md" }) {
    const initials = name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
    const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
    return (
        <div className={cn("rounded-full flex items-center justify-center font-bold border-2 border-background bg-primary/20 text-primary shrink-0", sizeClass)}>
            {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="rounded-full object-cover w-full h-full" />
            ) : (
                initials
            )}
        </div>
    );
}

interface TournamentType {
    id: string;
    name: string;
}

export default function TournamentsPage() {
    const { member } = useAuth();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedManager, setExpandedManager] = useState<string | null>(null);
    const [selectedClubId, setSelectedClubId] = useState<string | null>(null);

    const isSuperAdmin = member?.is_super_admin ?? false;
    // Superadmins pick a club to manage; regular users use their own club_id
    const clubId = isSuperAdmin ? selectedClubId : (member?.club_id ?? null);
    const memberId = member?.id;
    const roles = member?.roles || [];
    const isAdmin = isSuperAdmin || roles.some(r => ["administrador", "presidente", "entrenador"].includes(r));
    const isManager = isSuperAdmin || roles.some(r => ["gestor_torneos", "administrador", "presidente"].includes(r));

    // --- Clubs list (superadmin only) ---
    const { data: allClubs } = useQuery<{ id: string; name: string }[]>({
        queryKey: ["all-clubs-for-superadmin"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clubs")
                .select("id, name")
                .order("name");
            if (error) throw error;
            return data as { id: string; name: string }[];
        },
        enabled: isSuperAdmin,
    });

    // --- Tournaments ---
    const { data: tournaments, isLoading } = useQuery<Tournament[]>({
        queryKey: ["tournaments", clubId],
        queryFn: async () => {
            if (!clubId) return [];
            // We use unknown cast for table names not present in the generated types
            const { data, error } = await supabase
                .from("tournaments" as unknown as "members")
                .select("*, tournament_types(name)")
                .eq("club_id", clubId)
                .order("start_date", { ascending: true });
            if (error) throw error;
            return data as unknown as Tournament[];
        },
        enabled: !!clubId,
    });

    // --- Registrations ---
    const { data: registrations } = useQuery<Registration[]>({
        queryKey: ["tournament-registrations", clubId],
        queryFn: async () => {
            if (!clubId) return [];
            const { data, error } = await supabase
                .from("tournament_registrations" as unknown as "members")
                .select("*, members(id, full_name, avatar_url)")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as unknown as Registration[];
        },
        enabled: !!clubId,
    });

    // --- Tournament Types ---
    const { data: tournamentTypes } = useQuery<TournamentType[]>({
        queryKey: ["tournament-types"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("tournament_types")
                .select("id, name")
                .order("name");
            if (error) throw error;
            return data as TournamentType[];
        },
    });

    // --- Create tournament ---
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
    const [location, setLocation] = useState("");
    const [typeId, setTypeId] = useState<string | null>(null);

    const resetForm = () => { setName(""); setDescription(""); setStartDate(new Date().toISOString().split("T")[0]); setEndDate(new Date().toISOString().split("T")[0]); setLocation(""); setTypeId(null); };

    const createMutation = useMutation({
        mutationFn: async () => {
            if (!clubId) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("tournaments").insert({
                club_id: clubId, name, description, start_date: startDate, end_date: endDate, location,
                tournament_type_id: typeId, created_by: memberId,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournaments"] });
            toast({ title: "✅ Torneo creado" });
            setIsFormOpen(false);
            resetForm();
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    // --- Self-register ---
    const registerMutation = useMutation({
        mutationFn: async (tournamentId: string) => {
            if (!memberId) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("tournament_registrations").insert({
                tournament_id: tournamentId, member_id: memberId
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament-registrations"] });
            toast({ title: "✅ Inscripción enviada. Pendiente de confirmación." });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    // --- Cancel registration ---
    const cancelMutation = useMutation({
        mutationFn: async (regId: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("tournament_registrations").delete().eq("id", regId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament-registrations"] });
            toast({ title: "Inscripción cancelada" });
        },
    });

    // --- Update status (manager) ---
    const updateStatusMutation = useMutation({
        mutationFn: async ({ regId, status }: { regId: string; status: Registration["status"] }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from("tournament_registrations").update({ status }).eq("id", regId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tournament-registrations"] });
            toast({ title: "Estado actualizado" });
        },
        onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });

    // --- Helpers ---
    const myReg = (tournamentId: string) => registrations?.find(r => r.tournament_id === tournamentId && r.member_id === memberId);
    const confirmedRegs = (tournamentId: string) => registrations?.filter(r => r.tournament_id === tournamentId && r.status === "confirmado") || [];
    const pendingRegs = (tournamentId: string) => registrations?.filter(r => r.tournament_id === tournamentId && r.status === "pendiente") || [];

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
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <Trophy className="h-7 w-7 text-primary" />
                        Calendario de Torneos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Inscríbete en próximas competencias y sigue el estado de tu participación.</p>
                </div>
                {isAdmin && (
                    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="gap-2 shadow-lg shadow-primary/20 h-11 px-6 rounded-xl font-bold"
                                disabled={isSuperAdmin && !selectedClubId}
                                title={isSuperAdmin && !selectedClubId ? "Selecciona un club primero" : undefined}
                            >
                                <Plus className="h-4 w-4" /> Crear Torneo
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="glass sm:max-w-[500px] rounded-[2rem] border-none">
                            <DialogHeader>
                                <DialogTitle className="font-display font-bold text-xl">Nuevo Torneo</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4 pt-4">
                                <div className="space-y-2"><Label>Nombre del Torneo</Label><Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Abierto de Primavera" className="glass h-11 rounded-xl" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Fecha Inicio</Label><Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="glass h-11 rounded-xl" /></div>
                                    <div className="space-y-2"><Label>Fecha Fin</Label><Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="glass h-11 rounded-xl" /></div>
                                </div>
                                <div className="space-y-2"><Label>Ubicación</Label><Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ej: Campo Principal" className="glass h-11 rounded-xl" /></div>
                                <div className="space-y-2">
                                    <Label>Tipo de Torneo</Label>
                                    <Select value={typeId || ""} onValueChange={setTypeId}>
                                        <SelectTrigger className="glass h-11 rounded-xl"><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                                        <SelectContent className="glass">
                                            {tournamentTypes?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2"><Label>Descripción</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalles, requisitos, premios..." className="glass rounded-xl min-h-[100px]" /></div>
                                <Button type="submit" className="w-full h-12 rounded-xl font-black mt-4" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Guardando..." : "CREAR TORNEO"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </motion.div>

            {/* SuperAdmin: club selector */}
            {isSuperAdmin && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass border border-yellow-500/20 rounded-[1.5rem] p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 text-yellow-500 shrink-0">
                        <Building2 className="h-5 w-5" />
                        <span className="text-sm font-bold uppercase tracking-wider">Vista SuperAdmin</span>
                    </div>
                    <Select value={selectedClubId ?? ""} onValueChange={(v) => setSelectedClubId(v || null)}>
                        <SelectTrigger className="glass h-11 rounded-xl max-w-xs border-yellow-500/20 text-sm">
                            <SelectValue placeholder="Selecciona un club para gestionar..." />
                        </SelectTrigger>
                        <SelectContent className="glass">
                            {allClubs?.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {!selectedClubId && (
                        <p className="text-xs text-muted-foreground italic">Selecciona un club para ver y gestionar sus torneos.</p>
                    )}
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* --- Calendar Side --- */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
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

                    {/* Day Panel */}
                    <Card className="glass border-primary/5 shadow-lg rounded-[2rem]">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <CalendarIcon className="h-4 w-4" />
                                {selectedDate ? format(selectedDate, "d 'de' MMMM", { locale: es }) : "Hoy"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {tournamentsOnSelectedDate && tournamentsOnSelectedDate.length > 0 ? tournamentsOnSelectedDate.map(t => {
                                const confirmed = confirmedRegs(t.id);
                                return (
                                    <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                        className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-3">
                                        <h4 className="font-bold text-foreground leading-tight">{t.name}</h4>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                            <MapPin className="h-3 w-3 text-primary/60" />
                                            {t.location || "Ubicación por confirmar"}
                                        </div>
                                        {confirmed.length > 0 && (
                                            <div>
                                                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><Users className="h-3 w-3" /> Inscritos confirmados</p>
                                                <div className="flex flex-wrap gap-1">
                                                    {confirmed.slice(0, 8).map(r => r.members && (
                                                        <div key={r.id} title={r.members.full_name}>
                                                            <MemberAvatar name={r.members.full_name} avatarUrl={r.members.avatar_url} />
                                                        </div>
                                                    ))}
                                                    {confirmed.length > 8 && (
                                                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground border-2 border-background">
                                                            +{confirmed.length - 8}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            }) : (
                                <p className="text-sm text-muted-foreground italic text-center py-6">No hay torneos programados para este día.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* --- List Side --- */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    <div className="flex items-center gap-3 glass p-2 rounded-2xl border-primary/10">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar torneos..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-10 h-11 border-none bg-transparent shadow-none focus-visible:ring-0"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => <Card key={i} className="glass rounded-[2rem] h-56 animate-pulse border-none" />)
                        ) : filteredTournaments?.length === 0 ? (
                            <div className="col-span-full py-20 text-center glass rounded-[2.5rem]">
                                <Trophy className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
                                <p className="text-muted-foreground font-medium italic">No se encontraron torneos.</p>
                            </div>
                        ) : filteredTournaments?.map((t, i) => {
                            const myRegistration = myReg(t.id);
                            const confirmed = confirmedRegs(t.id);
                            const pending = pendingRegs(t.id);
                            const statusConfig = myRegistration ? STATUS_CONFIG[myRegistration.status] : null;
                            const StatusIcon = statusConfig?.icon;
                            const isExpanded = expandedManager === t.id;

                            return (
                                <motion.div key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                                    <Card className="glass border-primary/5 hover:border-primary/20 transition-all rounded-[2rem] flex flex-col">
                                        <CardHeader className="pb-2">
                                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                                                {format(new Date(t.start_date + "T12:00:00"), "MMM d", { locale: es })}
                                                {t.start_date !== t.end_date && ` – ${format(new Date(t.end_date + "T12:00:00"), "MMM d", { locale: es })}`}
                                            </p>
                                            <CardTitle className="text-lg font-display font-bold leading-tight">{t.name}</CardTitle>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3 text-primary/40" />
                                                <span className="truncate">{t.location || "Sin ubicación"}</span>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex-1 space-y-4">
                                            {t.description && <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">{t.description}</p>}

                                            {/* Avatar stack of confirmed attendees */}
                                            {confirmed.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1.5">{confirmed.length} Confirmado{confirmed.length !== 1 ? "s" : ""}</p>
                                                    <div className="flex">
                                                        {confirmed.slice(0, 6).map((r, idx) => r.members && (
                                                            <div key={r.id} style={{ marginLeft: idx > 0 ? "-8px" : 0 }} title={r.members.full_name}>
                                                                <MemberAvatar name={r.members.full_name} avatarUrl={r.members.avatar_url} />
                                                            </div>
                                                        ))}
                                                        {confirmed.length > 6 && (
                                                            <div style={{ marginLeft: "-8px" }} className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                                                +{confirmed.length - 6}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Registration action for archers (hidden for superadmins) */}
                                            {!isSuperAdmin && (
                                                <div className="pt-1">
                                                    {myRegistration ? (
                                                        <div className="flex items-center justify-between">
                                                            <Badge variant="outline" className={cn("rounded-lg border text-[10px] uppercase font-black tracking-widest px-3 h-6 gap-1", statusConfig?.color)}>
                                                                {StatusIcon && <StatusIcon className="h-3 w-3" />}
                                                                {statusConfig?.label}
                                                            </Badge>
                                                            {myRegistration.status === "pendiente" && (
                                                                <Button variant="ghost" size="sm" onClick={() => cancelMutation.mutate(myRegistration.id)}
                                                                    className="text-[10px] h-7 text-destructive hover:bg-destructive/10 font-bold uppercase tracking-wide">
                                                                    Cancelar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <Button size="sm" variant="outline"
                                                            className="w-full h-9 rounded-xl font-bold text-xs border-primary/20 hover:bg-primary/5 hover:border-primary/40 gap-2"
                                                            onClick={() => registerMutation.mutate(t.id)}
                                                            disabled={registerMutation.isPending}>
                                                            <Trophy className="h-3.5 w-3.5" />
                                                            Inscribirme
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Manager panel */}
                                            {isManager && (pending.length > 0 || isExpanded) && (
                                                <div className="border-t border-border pt-3">
                                                    <button
                                                        onClick={() => setExpandedManager(isExpanded ? null : t.id)}
                                                        className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                                                        <span className="flex items-center gap-1.5">
                                                            <Clock className="h-3 w-3" />
                                                            {pending.length} Pendiente{pending.length !== 1 ? "s" : ""}
                                                        </span>
                                                        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                                    </button>
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                                <div className="space-y-2 mt-3">
                                                                    {pending.map(r => r.members && (
                                                                        <div key={r.id} className="flex items-center gap-2 p-2 rounded-xl bg-muted/40">
                                                                            <MemberAvatar name={r.members.full_name} avatarUrl={r.members.avatar_url} size="sm" />
                                                                            <span className="text-xs font-medium flex-1 truncate">{r.members.full_name}</span>
                                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-500/10 rounded-lg"
                                                                                onClick={() => updateStatusMutation.mutate({ regId: r.id, status: "confirmado" })}>
                                                                                <CheckCircle2 className="h-4 w-4" />
                                                                            </Button>
                                                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/10 rounded-lg"
                                                                                onClick={() => updateStatusMutation.mutate({ regId: r.id, status: "rechazado" })}>
                                                                                <XCircle className="h-4 w-4" />
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
