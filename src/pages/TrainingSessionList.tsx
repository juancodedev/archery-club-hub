import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle,
  XCircle,
  QrCode,
  Info,
  MapPin,
  Shield,
  ArrowRight,
  Target,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContextCore";
import { WEATHER_TYPES, WIND_DIRECTIONS } from "@/lib/archeryConstants";
import TrainingEnrollmentPanel, {
  type TrainingEnrollment,
} from "./TrainingEnrollmentPanel";

const DISCIPLINE_ICONS: Record<string, string> = {
  outdoor: "🎯",
  indoor: "🏠",
  campo: "🌲",
  "3d": "🐗",
  flint: "🪨",
  field: "🌿",
  hunter: "🏹",
  animal_marked: "🦌",
  animal_unmarked: "🐗",
  hunting: "🏹",
};

const DISCIPLINE_BADGE: Record<string, string> = {
  outdoor: "bg-green-500/10 text-green-600 border-green-500/20",
  indoor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  campo: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  "3d": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  flint: "bg-stone-500/10 text-stone-600 border-stone-500/20",
  field: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  hunter: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  animal_marked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  animal_unmarked: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  hunting: "bg-red-500/10 text-red-600 border-red-500/20",
};

function generateSecureToken(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(raw)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface QrSessionInfo {
  id: string;
  name: string;
  attendance_token?: string;
}

interface TrainingSessionListProps {
  clubId: string;
  isSuperAdmin: boolean;
  onCreateSession: () => void;
  onShowQR: (session: QrSessionInfo) => void;
}

export default function TrainingSessionList({
  clubId,
  isSuperAdmin,
  onCreateSession,
  onShowQR,
}: TrainingSessionListProps) {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin =
    member?.roles?.includes("administrador") ||
    member?.roles?.includes("presidente") ||
    member?.roles?.includes("entrenador");

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["training-sessions", clubId],
    queryFn: async () => {
      if (
        !clubId ||
        clubId === "null" ||
        clubId === "00000000-0000-0000-0000-000000000000"
      )
        return [];
      const { data } = await supabase
        .from("training_sessions")
        .select(
          "*, training_enrollments(id, member_id, attended, members(full_name))"
        )
        .eq("club_id", clubId)
        .order("event_date", { ascending: false });
      return data || [];
    },
    enabled:
      !!clubId &&
      clubId !== "null" &&
      clubId !== "00000000-0000-0000-0000-000000000000",
  });

  const generateQR = useMutation({
    mutationFn: async (sessionId: string) => {
      const token = generateSecureToken();
      const tokenHash = await sha256Hex(token);
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);
      const { error } = await supabase
        .from("training_sessions")
        .update({
          attendance_token: tokenHash,
          attendance_token_expires: expires.toISOString(),
        } as never)
        .eq("id", sessionId);
      if (error) throw error;
      return { token, sessionId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      const currentSession = (
        sessions as { id: string; name: string }[] | undefined
      )?.find((s) => s.id === data.sessionId);
      if (currentSession) {
        onShowQR({
          id: currentSession.id,
          name: currentSession.name,
          attendance_token: data.token,
        });
      }
      toast({
        title: "Código QR generado",
        description: "Válido por 24 horas.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const enroll = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!member) throw new Error("No member");
      const { error } = await supabase
        .from("training_enrollments")
        .insert({
          training_session_id: sessionId,
          member_id: member.id,
          club_id: clubId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "¡Inscripción exitosa!" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
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
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const isEnrolled = (
    session: { training_enrollments: { member_id: string }[] | null }
  ) =>
    session.training_enrollments?.some(
      (e: { member_id: string }) => e.member_id === member?.id
    );

  const getDisciplineIcon = (d: string | null) =>
    DISCIPLINE_ICONS[d || ""] || "";
  const getDisciplineBadge = (d: string | null) =>
    DISCIPLINE_BADGE[d || ""] || "bg-muted/30";

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="glass rounded-2xl p-6 h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="glass rounded-[2rem] p-20 text-center space-y-6 border-dashed border-2 border-border/50">
        <Calendar className="h-16 w-16 mx-auto text-muted-foreground/20 animate-bounce" />
        <div className="space-y-1">
          <p className="text-xl font-bold text-foreground">Bandeja Vacía</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium leading-relaxed">
            No hay sesiones programadas en este servidor para el club
            seleccionado.
          </p>
        </div>
        {(isAdmin || isSuperAdmin) && (
          <Button
            onClick={onCreateSession}
            className="rounded-xl px-8 h-11 font-black"
          >
            PROGRAMAR PRIMERA SESIÓN
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session, _i: number) => {
        const enrolled = isEnrolled(session);
        const enrollments: TrainingEnrollment[] =
          (session.training_enrollments as TrainingEnrollment[]) || [];
        const enrollCount = enrollments.length;
        const attendedCount = enrollments.filter((e) => e.attended).length;
        const disc = session.discipline || session.division || null;

        return (
          <div
            key={session.id}
            className="glass rounded-2xl p-5 sm:p-6 space-y-5 border-white/5 active:scale-[0.99] transition-transform"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-foreground text-xl leading-tight">
                    {session.name}
                  </h3>
                  {session.training_type === "estandar" && (
                    <span className="inline-flex items-center rounded-full bg-primary/20 text-primary border border-primary/30 h-5 px-2.5 text-[9px] uppercase font-black">
                      Serie Estándar
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                    <Calendar className="h-3 w-3" />
                    {new Date(session.event_date).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  {disc && (
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${getDisciplineBadge(disc)}`}
                    >
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
                  {session.distance_yards &&
                    !(
                      session.rounds_config as { length?: number } | null
                    )?.length && (
                      <span className="flex items-center gap-1 bg-muted/20 px-2 py-0.5 rounded-lg font-mono">
                        📏 {session.distance_yards} yd
                      </span>
                    )}
                  {session.target_type && (
                    <span className="flex items-center gap-1.5 bg-muted/20 px-2 py-0.5 rounded-lg">
                      <Target className="h-3 w-3 opacity-70" />{" "}
                      {session.target_type}
                    </span>
                  )}
                  {session.weather && (
                    <span className="flex items-center gap-1.5 bg-primary/5 text-primary/80 px-2 py-0.5 rounded-lg border border-primary/10">
                      {WEATHER_TYPES.find((t) => t.value === session.weather)
                        ?.icon || session.weather}
                    </span>
                  )}
                  {session.wind_direction && (
                    <span className="flex items-center gap-1.5 bg-primary/5 text-primary/80 px-2 py-0.5 rounded-lg border border-primary/10">
                      <Wind className="h-3 w-3" />{" "}
                      {WIND_DIRECTIONS.find(
                        (d) => d.value === session.wind_direction
                      )?.icon || session.wind_direction}{" "}
                      {session.wind_speed &&
                        `${session.wind_speed} km/h`}
                    </span>
                  )}
                </div>

                {(session.bow_info || session.arrow_info) && (
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[10px] opacity-60">
                    {session.bow_info && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-2.5 w-2.5" /> {session.bow_info}
                      </span>
                    )}
                    {session.arrow_info && (
                      <span className="flex items-center gap-1">
                        <ArrowRight className="h-2.5 w-2.5" />{" "}
                        {session.arrow_info}
                      </span>
                    )}
                  </div>
                )}

                {(() => {
                  const rc = session.rounds_config as {
                    nfaaDiscipline?: string;
                    totalScore?: number;
                    totalX?: number;
                    indoorTargetType?: string;
                  } | null;
                  if (rc?.nfaaDiscipline !== "indoor" || rc.totalScore == null)
                    return null;
                  return (
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                      <span className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-lg border border-blue-500/20 font-mono font-bold">
                        🏠{" "}
                        {rc.indoorTargetType === "5spots"
                          ? "5 Spots"
                          : "1 Spot"}{" "}
                        · {rc.totalScore} pts · {rc.totalX ?? 0} X
                      </span>
                    </div>
                  );
                })()}

                {session.detail && (
                  <div className="flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/10 mt-3">
                    <Info className="h-3.5 w-3.5 text-primary/40 mt-0.5" />
                    <p className="text-[11px] leading-relaxed italic text-muted-foreground line-clamp-2">
                      "{session.detail}"
                    </p>
                  </div>
                )}

                {session.training_type === "estandar" &&
                  (
                    session.rounds_config as {
                      distance: number;
                      target: string;
                      ends: number;
                      arrows: number;
                    }[] | null
                  )?.length && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(
                        session.rounds_config as {
                          distance: number;
                          target: string;
                          ends: number;
                          arrows: number;
                        }[]
                      ).map(
                        (
                          r: {
                            distance: number;
                            target: string;
                            ends: number;
                            arrows: number;
                          },
                          idx: number
                        ) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between glass py-1.5 px-3 rounded-xl border-white/5 text-[10px]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-black text-primary">
                                R{idx + 1}
                              </span>
                              <span className="font-bold opacity-80">
                                {r.distance} yd • {r.target}
                              </span>
                            </div>
                            <span className="opacity-60">
                              {r.ends}x{r.arrows} flechas
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-0 border-t sm:border-none border-border/50">
                <div className="flex flex-col items-center sm:items-end mr-2 bg-muted/20 px-3 py-1.5 rounded-xl border border-border/50 min-w-[70px]">
                  <span className="text-[8px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">
                    Asistencia
                  </span>
                  <span className="text-lg font-black text-primary tabular-nums">
                    {attendedCount}/{enrollCount}
                  </span>
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

                  {enrolled && (
                    <Link
                      to={`/scores/new?sessionId=${session.id}`}
                      className="flex-1 sm:flex-initial"
                    >
                      <Button
                        size="sm"
                        className="h-11 px-6 gap-2 rounded-xl font-black shadow-lg shadow-primary/20 w-full"
                      >
                        <Target className="h-4 w-4" /> REGISTRAR PUNTOS
                      </Button>
                    </Link>
                  )}

                  {member?.id &&
                    member.id !==
                      "00000000-0000-0000-0000-000000000000" && (
                      <>
                        {!enrolled && (
                          <Button
                            size="sm"
                            className="h-11 px-6 gap-2 rounded-xl font-black shadow-lg shadow-primary/20"
                            onClick={() => enroll.mutate(session.id)}
                          >
                            <CheckCircle className="h-4 w-4" /> INSCRIBIRME
                          </Button>
                        )}
                        {enrolled && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11 px-4 gap-2 text-destructive font-black rounded-xl hover:bg-destructive/5"
                            onClick={() => unenroll.mutate(session.id)}
                          >
                            <XCircle className="h-4 w-4" /> SALIR
                          </Button>
                        )}
                      </>
                    )}
                </div>
              </div>
            </div>

            {/* Enrolled Members Panel */}
            <TrainingEnrollmentPanel
              sessionId={session.id}
              enrollments={enrollments}
              isAdmin={isAdmin ?? false}
            />
          </div>
        );
      })}
    </div>
  );
}
