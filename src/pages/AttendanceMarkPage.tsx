import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AttendanceMarkPage() {
    const { sessionId } = useParams();
    const token = new URLSearchParams(window.location.search).get("token");
    const { member } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error" | "unauthorized">("loading");
    const [message, setMessage] = useState("Verificando asistencia...");

    useEffect(() => {
        async function markAttendance() {
            if (!sessionId || !token) {
                setStatus("error");
                setMessage("Enlace de asistencia inválido");
                return;
            }

            if (!member) {
                setStatus("unauthorized");
                setMessage("Debes iniciar sesión para marcar tu asistencia");
                return;
            }

            try {
                // 1. Verify token and session
                const { data: session, error: sessionError } = await supabase
                    .from("training_sessions")
                    .select("id, attendance_token, attendance_token_expires")
                    .eq("id", sessionId)
                    .single();

                if (sessionError || !session) throw new Error("Sesión no encontrada");

                const now = new Date();
                const expires = session.attendance_token_expires ? new Date(session.attendance_token_expires) : null;

                if (session.attendance_token !== token || (expires && now > expires)) {
                    setStatus("error");
                    setMessage("El código QR ha expirado o es inválido");
                    return;
                }

                // 2. Check if already enrolled, if not, enroll them automatically
                const { data: enrollment, error: enrollCheckError } = await supabase
                    .from("training_enrollments")
                    .select("id")
                    .eq("training_session_id", sessionId)
                    .eq("member_id", member.id)
                    .maybeSingle();

                if (enrollment) {
                    // Already enrolled, just update attendance
                    const { error: updateError } = await supabase
                        .from("training_enrollments")
                        .update({ attended: true } as any)
                        .eq("id", enrollment.id);

                    if (updateError) throw updateError;
                } else {
                    // Auto-enroll and mark attendance
                    const { error: insertError } = await supabase
                        .from("training_enrollments")
                        .insert({
                            training_session_id: sessionId,
                            member_id: member.id,
                            club_id: member.club_id,
                            attended: true
                        } as any);

                    if (insertError) throw insertError;
                }

                setStatus("success");
                setMessage("¡Asistencia registrada correctamente!");
                toast({ title: "Asistencia confirmada", description: "Tu participación ha sido registrada." });

            } catch (error: any) {
                console.error("Error marking attendance:", error);
                setStatus("error");
                setMessage(error.message || "Ocurrió un error al registrar la asistencia");
            }
        }

        markAttendance();
    }, [sessionId, token, member, toast]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass max-w-sm w-full p-8 text-center space-y-6 rounded-2xl"
            >
                {status === "loading" && (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                        <p className="text-muted-foreground font-medium">{message}</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-foreground">¡Listo!</h1>
                        <p className="text-muted-foreground">{message}</p>
                        <Button className="w-full mt-4" onClick={() => navigate("/training")}>
                            Ver mis sesiones
                        </Button>
                    </div>
                )}

                {(status === "error" || status === "unauthorized") && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                            <XCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-foreground">Upps...</h1>
                        <p className="text-muted-foreground">{message}</p>

                        {status === "unauthorized" ? (
                            <Button className="w-full mt-4" onClick={() => navigate("/login")}>
                                Iniciar Sesión
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full mt-4 gap-2" onClick={() => navigate("/training")}>
                                <ArrowLeft className="h-4 w-4" /> Volver
                            </Button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
