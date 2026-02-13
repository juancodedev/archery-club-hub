import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Plus, Users, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TrainingSessionsPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = member?.roles.includes("administrador") || member?.roles.includes("presidente") || member?.roles.includes("entrenador");

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<any[]>([]);

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
            const enrollCount = (session.training_enrollments as any[])?.length || 0;
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
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />{enrollCount}
                    </span>
                    {member?.id && member.id !== "00000000-0000-0000-0000-000000000000" && (
                      <>
                        {enrolled ? (
                          <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => unenroll.mutate(session.id)}>
                            <XCircle className="h-3.5 w-3.5" />Salir
                          </Button>
                        ) : (
                          <Button size="sm" className="gap-1" onClick={() => enroll.mutate(session.id)}>
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
                      Asistencia / Inscritos:
                    </p>
                    {(session.training_enrollments as any[]).map((e: any) => (
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
    </div>
  );
}
