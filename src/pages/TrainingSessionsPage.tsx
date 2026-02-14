import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Plus, Users, CheckCircle, XCircle, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import QRCode from "qrcode";

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
    <div className="p-4 bg-white rounded-2xl shadow-inner inline-block">
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
    enabled: !!selectedClubId,
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
      console.log("Creando sesión con creador:", creatorId, "isVirtual:", isVirtual);

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
      toast({ title: "Sesión creada" });
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
      toast({ title: "¡Inscrito!" });
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
      toast({ title: "Desinscrito" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isEnrolled = (session: any) =>
    (session.training_enrollments as any[])?.some((e: any) => e.member_id === member?.id);

  const qrUrl = qrSession ? `${window.location.origin}/attendance/${qrSession.id}?token=${qrSession.attendance_token}` : "";

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Entrenamientos
          </h1>
          <p className="text-muted-foreground">Sesiones de entrenamiento del club</p>
        </div>

        {isSuperAdmin && (
          <div className="w-full md:w-64">
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
              <SelectContent>
                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {(isAdmin || isSuperAdmin) && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" />Nueva Sesión</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Crear Sesión de Entrenamiento</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createSession.mutate(); }} className="space-y-4 pt-4">
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label>Club para el entrenamiento</Label>
                    <Select value={dialogClubId} onValueChange={setDialogClubId}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                      <SelectContent>
                        {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Entrenamiento semanal" required />
                </div>
                <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>División</Label>
                    <Input value={division} onChange={(e) => setDivision(e.target.value)} placeholder="Recurvo..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Target</Label>
                    <Input value={targetType} onChange={(e) => setTargetType(e.target.value)} placeholder="40cm..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Detalle</Label>
                  <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Notas..." />
                </div>
                <Button type="submit" className="w-full" disabled={createSession.isPending}>
                  {createSession.isPending ? "Creando..." : "Crear Sesión"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-lg p-4 h-20 animate-pulse" />)}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session: any, i: number) => {
            const enrolled = isEnrolled(session);
            const enrollments = (session.training_enrollments as any[]) || [];
            const enrollCount = enrollments.length;
            const attendedCount = enrollments.filter(e => e.attended).length;

            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{session.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(session.event_date).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {session.division && ` • ${session.division}`}
                      {session.target_type && ` • ${session.target_type}`}
                    </p>
                    {session.detail && <p className="text-xs text-muted-foreground mt-1">{session.detail}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-end mr-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Asistencia</span>
                      <span className="text-sm font-display font-bold text-primary">{attendedCount}/{enrollCount}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => generateQR.mutate(session.id)}
                        disabled={generateQR.isPending}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        QR
                      </Button>
                    )}
                    {member?.id && member.id !== "00000000-0000-0000-0000-000000000000" && (
                      <>
                        {enrolled ? (
                          <Button variant="outline" size="sm" className="gap-1 text-destructive h-8" onClick={() => unenroll.mutate(session.id)}>
                            <XCircle className="h-3.5 w-3.5" />Salir
                          </Button>
                        ) : (
                          <Button size="sm" className="gap-1 h-8" onClick={() => enroll.mutate(session.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />Inscribirme
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Enrolled members list (visible to admin/entrenador) */}
                {isAdmin && enrollCount > 0 && (
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                    <p className="w-full text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                      Control de Asistencia:
                    </p>
                    {enrollments.map((e: any) => (
                      <button
                        key={e.id}
                        disabled={toggleAttendance.isPending}
                        onClick={() => toggleAttendance.mutate({ enrollmentId: e.id, currentStatus: e.attended })}
                        className="group transition-all"
                      >
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors ${e.attended
                          ? "bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20"
                          : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                          }`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${e.attended ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                          {e.members?.full_name || "—"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-xl p-8 text-center">
          <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">No hay sesiones de entrenamiento</p>
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={!!qrSession} onOpenChange={(open) => !open && setQrSession(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-display">Asistencia vía QR</DialogTitle>
            <DialogDescription className="text-center">
              Escanea este código desde la app para marcar tu asistencia
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            {qrSession && (
              <QRCodeCanvas
                value={qrUrl}
                size={220}
              />
            )}
            <div className="text-center">
              <p className="font-semibold text-foreground">{qrSession?.name}</p>
              <p className="text-xs text-muted-foreground">Token válido por 24 horas</p>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setQrSession(null)}>Cerrar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
