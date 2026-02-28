import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Plus, Users, CheckCircle, XCircle, QrCode, Info, MapPin, User as UserIcon, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "qrcode";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function QRCodeCanvas({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = (ref: HTMLCanvasElement | null) => {
    if (ref) {
      QRCode.toCanvas(ref, value, {
        width: size,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      }, (error) => {
        if (error) console.error("QR Error:", error);
      });
    }
  };

  return (
    <div className="p-4 bg-white rounded-3xl shadow-2xl inline-block border-8 border-white">
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function TrainingSessionsPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = member?.roles?.includes("administrador") || member?.roles?.includes("presidente") || member?.roles?.includes("entrenador");

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [qrSession, setQrSession] = useState<any>(null);

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
  const [division, setDivision] = useState("");
  const [targetType, setTargetType] = useState("");
  const [detail, setDetail] = useState("");
  const [dialogClubId, setDialogClubId] = useState("");

  const createSession = useMutation({
    mutationFn: async () => {
      const targetClubId = isSuperAdmin ? dialogClubId : selectedClubId;
      if (!targetClubId || targetClubId === "null") throw new Error("Debe seleccionar un club");

      const isVirtual = member?.id?.startsWith('00000000');
      const creatorId = (member?.id && !isVirtual) ? member.id : null;

      const { error } = await supabase.from("training_sessions").insert({
        club_id: targetClubId,
        created_by: creatorId,
        name,
        event_date: eventDate,
        division: division || null,
        target_type: targetType || null,
        detail: detail || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Sesión creada exitosamente" });
      setDialogOpen(false);
      setName("");
      setDivision("");
      setTargetType("");
      setDetail("");
      setDialogClubId("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleAttendance = useMutation({
    mutationFn: async ({ enrollmentId, currentStatus }: { enrollmentId: string, currentStatus: boolean }) => {
      const { error } = await supabase
        .from("training_enrollments")
        .update({ attended: !currentStatus } as any)
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Asistencia actualizada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const generateQR = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = Math.random().toString(36).substring(2, 15);
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      const { error } = await supabase
        .from("training_sessions")
        .update({
          attendance_token: token,
          attendance_token_expires: expires.toISOString()
        } as any)
        .eq("id", sessionId);

      if (error) throw error;
      return { token, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      const currentSession = sessions?.find(s => s.id === data.sessionId);
      if (currentSession) {
        setQrSession({ ...currentSession, attendance_token: data.token });
      }
      toast({ title: "Código QR generado", description: "Válido por 24 horas." });
    },
  });

  const enroll = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!member) throw new Error("No member");
      const { error } = await supabase.from("training_enrollments").insert({
        training_session_id: sessionId,
        member_id: member.id,
        club_id: selectedClubId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "¡Inscripción exitosa!" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const unenroll = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!member) throw new Error("No member");
      const { error } = await supabase
        .from("training_enrollments")
        .delete()
        .eq("training_session_id", sessionId)
        .eq("member_id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Desinscrito correctamente" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isEnrolled = (session: any) =>
    (session.training_enrollments as any[])?.some((e: any) => e.member_id === member?.id);

  const qrUrl = qrSession ? `${window.location.origin}/attendance/${qrSession.id}?token=${qrSession.attendance_token}` : "";

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
              <DialogContent className="rounded-3xl glass max-w-[95vw] sm:max-w-lg">
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
                    <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Nombre de la Sesión</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Práctica barebow del jueves" required className="h-11 glass border-primary/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Fecha del Evento</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required className="h-11 glass border-primary/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">División</Label>
                      <Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Recurvo..." className="h-11 glass border-primary/10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">Diana / Target</Label>
                      <Input value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="40cm..." className="h-11 glass border-primary/10" />
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
        )}      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl p-6 h-32 animate-pulse" />)}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-4">
          {sessions.map((session: any, i: number) => {
            const enrolled = isEnrolled(session);
            const enrollments = (session.training_enrollments as any[]) || [];
            const enrollCount = enrollments.length;
            const attendedCount = enrollments.filter(e => e.attended).length;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-2xl p-5 sm:p-6 space-y-5 border-white/5 active:scale-[0.99] transition-transform"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="font-bold text-foreground text-xl leading-tight">{session.name}</h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                        <Calendar className="h-3 w-3" /> 
                        {new Date(session.event_date).toLocaleDateString("es-CL", { day: "numeric", month: "long" })}
                      </span>
                      {session.division && <Badge variant="secondary" className="h-5 px-2 text-[9px] uppercase font-black">{session.division}</Badge>}
                      {session.target_type && (
                          <span className="flex items-center gap-1.5 opacity-70">
                              <Target className="h-3 w-3" /> {session.target_type}
                          </span>
                      )}
                    </div>
                    {session.detail && (
                        <div className="flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10 mt-3">
                            <Info className="h-3.5 w-3.5 text-primary/40 mt-0.5" />
                            <p className="text-[11px] leading-relaxed italic text-muted-foreground line-clamp-2">"{session.detail}"</p>
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
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-11 w-11 rounded-xl glass border-primary/20 hover:border-primary/50 text-primary"
                            onClick={() => generateQR.mutate(session.id)}
                            disabled={generateQR.isPending}
                        >
                            <QrCode className="h-5 w-5" />
                        </Button>
                        )}
                        {member?.id && member.id !== "00000000-0000-0000-0000-000000000000" && (
                        <>
                            {enrolled ? (
                            <Button variant="ghost" size="sm" className="h-11 px-4 gap-2 text-destructive font-black rounded-xl hover:bg-destructive/5" onClick={() => unenroll.mutate(session.id)}>
                                <XCircle className="h-4 w-4" /> SALIR
                            </Button>
                            ) : (
                            <Button size="sm" className="h-11 px-6 gap-2 rounded-xl font-black shadow-lg shadow-primary/20" onClick={() => enroll.mutate(session.id)}>
                                <CheckCircle className="h-4 w-4" /> INSCRIBIRME
                            </Button>
                            )}
                        </>
                        )}
                    </div>
                  </div>
                </div>

                {/* Control de Asistencia Grid (visible to admin/entrenador) */}
                {isAdmin && enrollCount > 0 && (
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-3 px-1 flex items-center gap-2">
                      <Users className="h-3 w-3" /> Miembros Inscritos
                    </p>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                        {enrollments.map((e: any) => (
                        <button
                            key={e.id}
                            disabled={toggleAttendance.isPending}
                            onClick={() => toggleAttendance.mutate({ enrollmentId: e.id, currentStatus: e.attended })}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all relative group",
                                e.attended ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/30 border-transparent hover:bg-muted/50"
                            )}
                        >
                            <div className={cn(
                                "h-1.5 w-1.5 rounded-full absolute top-2 right-2",
                                e.attended ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/20"
                            )} />
                            <div className={cn(
                                "h-8 w-8 rounded-full mb-1.5 flex items-center justify-center border transition-colors",
                                e.attended ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500" : "bg-background/50 border-border text-muted-foreground"
                            )}>
                                <UserIcon className="h-4 w-4" />
                            </div>
                            <span className={cn(
                                "text-[10px] font-bold truncate w-full text-center px-1",
                                e.attended ? "text-emerald-600" : "text-muted-foreground"
                            )}>
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
                <DialogDescription className="font-medium text-muted-foreground">
                Escanea para registrar tu participación en la nube
                </DialogDescription>
            </div>
            
            {qrSession && (
              <QRCodeCanvas
                value={qrUrl}
                size={240}
              />
            )}
            
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
