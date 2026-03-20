import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, Users, CheckCircle, XCircle, QrCode, Info,
  User as UserIcon, Target, Sun, Cloud, CloudRain, Wind,
  MapPin, Activity, Shield, ArrowRight, Settings2, Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DISCIPLINES, STANDARD_DISTANCES, formatYards,
  TRAINING_TYPES, WEATHER_TYPES, WIND_DIRECTIONS, TRAINING_PRESETS,
  type DisciplineValue
} from "@/lib/archeryConstants";
import { logger } from "@/lib/logger";

const DISCIPLINE_ICONS: Record<string, string> = { outdoor: "🎯", indoor: "🏠", campo: "🌲", "3d": "🐗" };
const DISCIPLINE_BADGE: Record<string, string> = {
  outdoor: "bg-green-500/10 text-green-600 border-green-500/20",
  indoor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  campo: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "3d": "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function QRCodeCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = (ref: HTMLCanvasElement | null) => {
    if (ref) {
      QRCode.toCanvas(ref, value, {
        width: size,
        margin: 2,
        color: { dark: "#0F172A", light: "#FFFFFF" },
      }, (error) => { if (error) logger.error("QR Error:", error); });
    }
  };
  return (
    <div className="p-4 bg-white rounded-3xl shadow-2xl inline-block border-8 border-white">
      <canvas ref={canvasRef} />
    </div>
  );
}

interface ClubItem { id: string; name: string; }
interface QrSession { id: string; name: string; attendance_token?: string; }

export default function TrainingSessionsPage() {
  const { member } = useAuth();
  const isSuperAdmin = !!member?.is_super_admin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = member?.roles?.includes("administrador") || member?.roles?.includes("presidente") || member?.roles?.includes("entrenador");

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [qrSession, setQrSession] = useState<QrSession | null>(null);

  // New state for training types
  const [trainingType, setTrainingType] = useState<string>("libre");
  const [rounds, setRounds] = useState<any[]>([]);
  const [weather, setWeather] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [bowInfo, setBowInfo] = useState("");
  const [arrowInfo, setArrowInfo] = useState("");
  const [arrowNumbers, setArrowNumbers] = useState(false);
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.club_id) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["training-sessions", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null" || selectedClubId === "00000000-0000-0000-0000-000000000000") return [];
      const { data } = await supabase
        .from("training_sessions")
        .select("*, training_enrollments(id, member_id, attended, members(full_name))")
        .eq("club_id", selectedClubId)
        .order("event_date", { ascending: false });
      return data || [];
    },
    enabled: !!selectedClubId && selectedClubId !== "null" && selectedClubId !== "00000000-0000-0000-0000-000000000000",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [discipline, setDiscipline] = useState<string>("");
  const [distanceYards, setDistanceYards] = useState<string>("");
  const [targetType, setTargetType] = useState("");
  const [detail, setDetail] = useState("");
  const [dialogClubId, setDialogClubId] = useState("");

  // Filtrar distancias estándar por disciplina seleccionada
  const filteredDistances = discipline
    ? STANDARD_DISTANCES.filter(d => d.discipline === discipline)
    : STANDARD_DISTANCES;

  const createSession = useMutation({
    mutationFn: async () => {
      const targetClubId = isSuperAdmin ? dialogClubId : selectedClubId;
      if (!targetClubId || targetClubId === "null") throw new Error("Debe seleccionar un club");

      const isVirtual = member?.id?.startsWith('00000000');
      const creatorId = (member?.id && !isVirtual) ? member.id : null;

      const [distYards] = distanceYards.split("-");
      const { error } = await supabase.from("training_sessions").insert({
        club_id: targetClubId,
        created_by: creatorId,
        name,
        event_date: eventDate,
        division: discipline || null,
        discipline: discipline || null,
        distance_yards: distYards && distYards !== "custom" ? parseFloat(distYards) : null,
        target_type: targetType || null,
        detail: detail || null,
        training_type: trainingType,
        rounds_config: rounds,
        weather,
        wind_direction: windDirection,
        wind_speed: windSpeed,
        bow_info: bowInfo,
        arrow_info: arrowInfo,
        arrow_numbers: arrowNumbers,
        location,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Sesión creada exitosamente" });
      setDialogOpen(false);
      setName(""); setDiscipline(""); setDistanceYards(""); setTargetType(""); setDetail(""); setDialogClubId("");
      setTrainingType("libre"); setRounds([]); setWeather(""); setWindDirection(""); setWindSpeed("");
      setBowInfo(""); setArrowInfo(""); setArrowNumbers(false); setLocation("");
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleAttendance = useMutation({
    mutationFn: async ({ enrollmentId, currentStatus }: { enrollmentId: string, currentStatus: boolean }) => {
      const { error } = await supabase.from("training_enrollments").update({ attended: !currentStatus }).eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-sessions"] }); toast({ title: "Asistencia actualizada" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const generateQR = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = Math.random().toString(36).substring(2, 15);
      const expires = new Date(); expires.setHours(expires.getHours() + 24);
      const { error } = await supabase.from("training_sessions").update({ attendance_token: token, attendance_token_expires: expires.toISOString() } as never).eq("id", sessionId);
      if (error) throw error;
      return { token, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      const currentSession = sessions?.find((s: { id: string }) => s.id === data.sessionId);
      if (currentSession) { setQrSession({ ...currentSession, attendance_token: data.token }); }
      toast({ title: "Código QR generado", description: "Válido por 24 horas." });
    },
  });

  const enroll = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!member) throw new Error("No member");
      const { error } = await supabase.from("training_enrollments").insert({ training_session_id: sessionId, member_id: member.id, club_id: selectedClubId });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-sessions"] }); toast({ title: "¡Inscripción exitosa!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unenroll = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!member) throw new Error("No member");
      const { error } = await supabase.from("training_enrollments").delete().eq("training_session_id", sessionId).eq("member_id", member.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["training-sessions"] }); toast({ title: "Desinscrito correctamente" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isEnrolled = (session: { training_enrollments: { member_id: string }[] | null }) =>
    session.training_enrollments?.some((e: { member_id: string }) => e.member_id === member?.id);
  const qrUrl = qrSession ? `${window.location.origin}/attendance/${qrSession.id}?token=${qrSession.attendance_token}` : "";

  const getDisciplineIcon = (d: string | null) => DISCIPLINE_ICONS[d || ""] || "";
  const getDisciplineBadge = (d: string | null) => DISCIPLINE_BADGE[d || ""] || "bg-muted/30";

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Entrenamientos
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">Gestiona tu asistencia y sesiones de práctica</p>
          </div>

          {(isAdmin || isSuperAdmin) && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto h-11 sm:h-10 font-bold shadow-lg shadow-primary/20"><Plus className="h-4 w-4" />Nueva Sesión</Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl glass max-w-[95vw] sm:max-w-lg scrollbar-hide max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display font-bold text-xl">Crear Sesión de Entrenamiento</DialogTitle>
                </DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createSession.mutate(); }} className="space-y-5 pt-4">
                  {isSuperAdmin && (
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Club para el entrenamiento</Label>
                      <Select value={dialogClubId} onValueChange={setDialogClubId}>
                        <SelectTrigger className="glass h-11"><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                        <SelectContent className="glass">
                          {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Fecha del Evento</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="h-11 glass border-primary/10" />
                  </div>

                  {/* Tipo de Entrenamiento TABS */}
                  <Tabs value={trainingType} onValueChange={setTrainingType} className="w-full">
                    <TabsList className="grid grid-cols-2 w-full glass p-1 h-12 mb-4">
                      {TRAINING_TYPES.map(t => (
                        <TabsTrigger key={t.value} value={t.value} className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                          {t.icon} {t.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    <TabsContent value="libre" className="space-y-4 animate-in fade-in-50 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Nombre de la Sesión</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Práctica Libre - Calentamiento" required className="h-11 glass border-primary/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Disciplina</Label>
                          <Select value={discipline} onValueChange={(v) => { setDiscipline(v); setDistanceYards(""); }}>
                            <SelectTrigger className="glass h-11"><SelectValue placeholder="..." /></SelectTrigger>
                            <SelectContent className="glass">
                              {DISCIPLINES.map(d => (
                                <SelectItem key={d.value} value={d.value}>{d.icon} {d.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Distancia</Label>
                          <Select value={distanceYards} onValueChange={setDistanceYards} disabled={!discipline}>
                            <SelectTrigger className="glass h-11"><SelectValue placeholder="..." /></SelectTrigger>
                            <SelectContent className="glass">
                              {filteredDistances.map(d => (
                                <SelectItem key={`${d.yards}-${d.discipline}`} value={`${d.yards}-${d.discipline}`}>{d.label}</SelectItem>
                              ))}
                              <SelectItem value="custom">Otra...</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Diana / Target</Label>
                        <Input value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="Ej: 40 cm" className="h-11 glass border-primary/10" />
                      </div>
                    </TabsContent>

                    <TabsContent value="estandar" className="space-y-4 animate-in fade-in-50 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Presets de Serie</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {TRAINING_PRESETS.map(p => (
                            <Button
                              key={p.id}
                              type="button"
                              variant="outline"
                              className={cn("h-auto py-3 px-3 flex flex-col items-start gap-1 glass border-white/10", rounds.length > 0 && rounds[0].presetId === p.id && "border-primary bg-primary/5")}
                              onClick={() => {
                                setRounds(p.rounds.map(r => ({ ...r, presetId: p.id })));
                                setName(`Serie: ${p.name}`);
                              }}
                            >
                              <span className="font-bold text-[11px] leading-tight">{p.name}</span>
                              <span className="text-[9px] text-muted-foreground leading-tight text-left">{p.description}</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Configuración de Rondas</Label>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-primary" onClick={() => setRounds([...rounds, { distance: 55, target: "122 cm", ends: 6, arrows: 6 }])}>
                            + Agregar Ronda
                          </Button>
                        </div>

                        <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                          {rounds.map((round, idx) => (
                            <div key={idx} className="glass p-3 rounded-2xl border-white/5 space-y-3 relative group">
                              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => setRounds(rounds.filter((_, i) => i !== idx))}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Distancia (yd)</Label>
                                  <Input type="number" value={round.distance} onChange={(e) => {
                                    const newRounds = [...rounds];
                                    newRounds[idx].distance = parseFloat(e.target.value);
                                    setRounds(newRounds);
                                  }} className="h-8 text-xs glass" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Diana</Label>
                                  <Input value={round.target} onChange={(e) => {
                                    const newRounds = [...rounds];
                                    newRounds[idx].target = e.target.value;
                                    setRounds(newRounds);
                                  }} className="h-8 text-xs glass" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Ends</Label>
                                  <Input type="number" value={round.ends} onChange={(e) => {
                                    const newRounds = [...rounds];
                                    newRounds[idx].ends = parseInt(e.target.value);
                                    setRounds(newRounds);
                                  }} className="h-8 text-xs glass" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">Flechas x End</Label>
                                  <Input type="number" value={round.arrows} onChange={(e) => {
                                    const newRounds = [...rounds];
                                    newRounds[idx].arrows = parseInt(e.target.value);
                                    setRounds(newRounds);
                                  }} className="h-8 text-xs glass" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Metadatos (Clima / Equipo) */}
                  <div className="space-y-4 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Settings2 className="h-3.5 w-3.5 text-primary" />
                      <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">Condiciones y Equipo</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Clima</Label>
                        <Select value={weather} onValueChange={setWeather}>
                          <SelectTrigger className="glass h-10 text-xs"><SelectValue placeholder="Opcional" /></SelectTrigger>
                          <SelectContent className="glass">
                            {WEATHER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ubicación</Label>
                        <div className="relative">
                          <MapPin className="h-3 w-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ej: Club Central" className="h-10 text-xs glass pl-8" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Viento</Label>
                        <div className="flex gap-2">
                          <Select value={windDirection} onValueChange={setWindDirection}>
                            <SelectTrigger className="glass h-10 text-xs flex-1"><SelectValue placeholder="..." /></SelectTrigger>
                            <SelectContent className="glass">
                              {WIND_DIRECTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.icon} {d.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Input value={windSpeed} onChange={(e) => setWindSpeed(e.target.value)} placeholder="Km/h" className="h-10 text-xs glass w-20" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Arco</Label>
                        <Input value={bowInfo} onChange={(e) => setBowInfo(e.target.value)} placeholder="Ej: Win&Win" className="h-10 text-xs glass" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between glass p-3 rounded-2xl border-white/5 mt-2">
                      <div className="space-y-0.5">
                        <Label className="text-[11px] font-bold">Números de Flecha</Label>
                        <p className="text-[9px] text-muted-foreground">Registrar qué flecha cae dónde</p>
                      </div>
                      <Switch checked={arrowNumbers} onCheckedChange={setArrowNumbers} className="data-[state=checked]:bg-primary" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Detalle Opcional</Label>
                    <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Notas..." className="h-11 glass border-primary/10" />
                  </div>
                  <Button type="submit" className="w-full h-12 rounded-2xl font-black shadow-lg" disabled={createSession.isPending}>
                    {createSession.isPending ? "Configurando..." : "CREAR SESIÓN AHORA"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:max-w-xs">
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="glass h-11"><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
              <SelectContent className="glass">
                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl p-6 h-32 animate-pulse" />)}</div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session, i: number) => {
            const enrolled = isEnrolled(session);
            const enrollments: { id: string; member_id: string; attended: boolean; members?: { full_name?: string } }[] =
              (session.training_enrollments as { id: string; member_id: string; attended: boolean; members?: { full_name?: string } }[]) || [];
            const enrollCount = enrollments.length;
            const attendedCount = enrollments.filter(e => e.attended).length;
            const disc = session.discipline || session.division || null;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl p-5 sm:p-6 space-y-5 border-white/5 active:scale-[0.99] transition-transform"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-foreground text-xl leading-tight">{session.name}</h3>
                      {session.training_type === 'estandar' && (
                        <Badge className="bg-primary/20 text-primary border-primary/30 h-5 text-[9px] uppercase font-black">Serie Estándar</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.event_date).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                      </span>
                      {disc && (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${getDisciplineBadge(disc)}`}>
                          {getDisciplineIcon(disc)} {disc}
                        </span>
                      )}
                      {session.location && (
                        <span className="flex items-center gap-1.5 opacity-70">
                          <MapPin className="h-3 w-3" /> {session.location}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                      {session.distance_yards && !session.rounds_config?.length && (
                        <span className="flex items-center gap-1 bg-muted/20 px-2 py-0.5 rounded-lg font-mono">
                          📏 {session.distance_yards} yd
                        </span>
                      )}
                      {session.target_type && (
                        <span className="flex items-center gap-1.5 bg-muted/20 px-2 py-0.5 rounded-lg">
                          <Target className="h-3 w-3 opacity-70" /> {session.target_type}
                        </span>
                      )}

                      {/* Weather & Wind */}
                      {session.weather && (
                        <span className="flex items-center gap-1.5 bg-primary/5 text-primary/80 px-2 py-0.5 rounded-lg border border-primary/10">
                          {WEATHER_TYPES.find(t => t.value === session.weather)?.icon} {session.weather}
                        </span>
                      )}
                      {session.wind_direction && (
                        <span className="flex items-center gap-1.5 bg-primary/5 text-primary/80 px-2 py-0.5 rounded-lg border border-primary/10">
                          <Wind className="h-3 w-3" /> {WIND_DIRECTIONS.find(d => d.value === session.wind_direction)?.icon} {session.wind_speed && `${session.wind_speed} km/h`}
                        </span>
                      )}
                    </div>

                    {/* Equipment Info */}
                    {(session.bow_info || session.arrow_info) && (
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] opacity-60">
                        {session.bow_info && <span className="flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> {session.bow_info}</span>}
                        {session.arrow_info && <span className="flex items-center gap-1"><ArrowRight className="h-2.5 w-2.5" /> {session.arrow_info}</span>}
                      </div>
                    )}

                    {session.detail && (
                      <div className="flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10 mt-3">
                        <Info className="h-3.5 w-3.5 text-primary/40 mt-0.5" />
                        <p className="text-[11px] leading-relaxed italic text-muted-foreground line-clamp-2">"{session.detail}"</p>
                      </div>
                    )}

                    {/* Rondas Compactas para Estándar */}
                    {session.training_type === 'estandar' && session.rounds_config?.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {session.rounds_config.map((r: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between glass py-1.5 px-3 rounded-xl border-white/5 text-[10px]">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-primary">R{idx + 1}</span>
                              <span className="font-bold opacity-80">{r.distance} yd • {r.target}</span>
                            </div>
                            <span className="opacity-60">{r.ends}x{r.arrows} flechas</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-none border-border/50">
                    <div className="flex flex-col items-center sm:items-end mr-2 bg-muted/20 px-3 py-1.5 rounded-xl border border-border/50 min-w-[70px]">
                      <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Asistencia</span>
                      <span className="text-lg font-black text-primary tabular-nums">{attendedCount}/{enrollCount}</span>
                    </div>
                    <div className="flex gap-2">
                      {isAdmin && (
                        <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl glass border-primary/20 hover:border-primary/50 text-primary" onClick={() => generateQR.mutate(session.id)} disabled={generateQR.isPending}>
                          <QrCode className="h-5 w-5" />
                        </Button>
                      )}

                      {enrolled && (
                        <Link to={`/scores/new?sessionId=${session.id}`} className="flex-1 sm:flex-initial">
                          <Button size="sm" className="h-11 px-6 gap-2 rounded-xl font-black shadow-lg shadow-primary/20 w-full">
                            <Target className="h-4 w-4" /> REGISTRAR PUNTOS
                          </Button>
                        </Link>
                      )}

                      {member?.id && member.id !== "00000000-0000-0000-0000-000000000000" && (
                        <>
                          {!enrolled && (
                            <Button size="sm" className="h-11 px-6 gap-2 rounded-xl font-black shadow-lg shadow-primary/20" onClick={() => enroll.mutate(session.id)}>
                              <CheckCircle className="h-4 w-4" /> INSCRIBIRME
                            </Button>
                          )}
                          {enrolled && (
                            <Button variant="ghost" size="sm" className="h-11 px-4 gap-2 text-destructive font-black rounded-xl hover:bg-destructive/5" onClick={() => unenroll.mutate(session.id)}>
                              <XCircle className="h-4 w-4" /> SALIR
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {isAdmin && enrollCount > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-3 px-1 flex items-center gap-2">
                      <Users className="h-3 w-3" /> Miembros Inscritos
                    </p>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {enrollments.map((e) => (
                        <button
                          key={e.id}
                          disabled={toggleAttendance.isPending}
                          onClick={() => toggleAttendance.mutate({ enrollmentId: e.id, currentStatus: e.attended })}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all relative group",
                            e.attended ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30 border-transparent hover:bg-muted/50"
                          )}
                        >
                          <div className={cn("h-1.5 w-1.5 rounded-full absolute top-2 right-2", e.attended ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/20")} />
                          <div className={cn("h-8 w-8 rounded-full mb-1.5 flex items-center justify-center border transition-colors", e.attended ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500" : "bg-background/50 border-border text-muted-foreground")}>
                            <UserIcon className="h-4 w-4" />
                          </div>
                          <span className={cn("text-[10px] font-bold truncate w-full text-center px-1", e.attended ? "text-emerald-600" : "text-muted-foreground")}>
                            {e.members?.full_name?.split(" ")[0]}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-[2rem] p-20 text-center space-y-6 border-dashed border-2 border-border/50">
          <Calendar className="h-16 w-16 mx-auto text-muted-foreground/20 animate-bounce" />
          <div className="space-y-1">
            <p className="text-xl font-bold text-foreground">Bandeja Vacía</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium leading-relaxed">No hay sesiones programadas en este servidor para el club seleccionado.</p>
          </div>
          {(isAdmin || isSuperAdmin) && (
            <Button onClick={() => setDialogOpen(true)} className="rounded-xl px-8 h-11 font-black">PROGRAMAR PRIMERA SESIÓN</Button>
          )}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!qrSession} onOpenChange={(open) => !open && setQrSession(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] glass overflow-hidden border-none p-0">
          <div className="p-8 space-y-8 flex flex-col items-center text-center">
            <div className="space-y-2">
              <DialogTitle className="font-display font-black text-2xl tracking-tighter">ACCESO RÁPIDO</DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground">Escanea para registrar tu participación en la nube</DialogDescription>
            </div>
            {qrSession && <QRCodeCanvas value={qrUrl} size={240} />}
            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 w-full">
              <p className="font-black text-foreground text-lg uppercase">{qrSession?.name}</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Token validado - 24 horas</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground" onClick={() => setQrSession(null)}>Cerrar Panel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
