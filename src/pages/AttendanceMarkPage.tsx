import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AttendanceMarkPage() {
    const { sessionId } = useParams();
    const token = new URLSearchParams(window.location.search).get("token");
    const { member, user, refreshMember } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [status, setStatus] = useState<"loading" | "success" | "error" | "unauthorized" | "not-member">("loading");
    const [message, setMessage] = useState("Verificando asistencia...");
    const [trainingSession, setTrainingSession] = useState<any>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false);

    // Form states for quick register
    const [regName, setRegName] = useState("");
    const [regEmail, setRegEmail] = useState("");
    const [regPass, setRegPass] = useState("");

    const markAttendance = async (targetMember: any) => {
        try {
            setLoadingAction(true);
            // Check if already enrolled
            const { data: enrollment, error: enrollCheckError } = await supabase
                .from("training_enrollments")
                .select("id")
                .eq("training_session_id", sessionId)
                .eq("member_id", targetMember.id)
                .maybeSingle();

            if (enrollment) {
                const { error: updateError } = await supabase
                    .from("training_enrollments")
                    .update({ attended: true } as any)
                    .eq("id", enrollment.id);
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("training_enrollments")
                    .insert({
                        training_session_id: sessionId,
                        member_id: targetMember.id,
                        club_id: trainingSession.club_id,
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
        } finally {
            setLoadingAction(false);
        }
    };

    const handleJoinAndMark = async () => {
        if (!user || !trainingSession) return;
        setLoadingAction(true);
        try {
            // 1. Create member record
            const { data: newMember, error: memberError } = await supabase
                .from("members")
                .insert({
                    user_id: user.id,
                    club_id: trainingSession.club_id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Arquero",
                    email: user.email!,
                    status: "activo" as any
                })
                .select()
                .single();
            if (memberError) throw memberError;

            // 2. Add role
            await supabase.from("member_roles").insert({
                member_id: newMember.id,
                club_id: trainingSession.club_id,
                role: "arquero" as any
            });

            await markAttendance(newMember);
            await refreshMember();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoadingAction(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: regEmail,
                password: regPass,
                options: { data: { full_name: regName } }
            });
            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear la cuenta");

            const { data: newMember, error: memberError } = await supabase
                .from("members")
                .insert({
                    user_id: authData.user.id,
                    club_id: trainingSession.club_id,
                    full_name: regName,
                    email: regEmail,
                    status: "activo" as any
                })
                .select()
                .single();
            if (memberError) throw memberError;

            await supabase.from("member_roles").insert({
                member_id: newMember.id,
                club_id: trainingSession.club_id,
                role: "arquero" as any
            });

            setStatus("success");
            setMessage("Cuenta creada y asistencia registrada. ¡Bienvenido!");
            toast({ title: "Registro exitoso", description: "Revisa tu correo para confirmar tu cuenta." });
            await refreshMember();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoadingAction(false);
        }
    };

    useEffect(() => {
        async function verifyAndMark() {
            if (!sessionId || !token) {
                setStatus("error");
                setMessage("Enlace de asistencia inválido");
                return;
            }

            try {
                const { data: session, error: sessionError } = await supabase
                    .from("training_sessions")
                    .select("id, club_id, attendance_token, attendance_token_expires")
                    .eq("id", sessionId)
                    .single() as any;

                if (sessionError || !session) throw new Error("Sesión no encontrada");
                setTrainingSession(session);

                const now = new Date();
                const expires = session.attendance_token_expires ? new Date(session.attendance_token_expires) : null;

                if (session.attendance_token !== token || (expires && now > expires)) {
                    setStatus("error");
                    setMessage("El código QR ha expirado o es inválido");
                    return;
                }

                if (!user) {
                    setStatus("unauthorized");
                    setMessage("Debes iniciar sesión para marcar tu asistencia");
                    return;
                }

                // Check if user is member of THIS club
                const { data: clubMember, error: memberError } = await supabase
                    .from("members")
                    .select("id, club_id")
                    .eq("user_id", user.id)
                    .eq("club_id", session.club_id)
                    .maybeSingle();

                if (!clubMember) {
                    setStatus("not-member");
                    setMessage("No eres miembro de este club aún");
                    return;
                }

                await markAttendance(clubMember);

            } catch (error: any) {
                console.error("Error verifying attendance:", error);
                setStatus("error");
                setMessage(error.message || "Ocurrió un error");
            }
        }

        verifyAndMark();
    }, [sessionId, token, user]);

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
                        <Button className="w-full mt-4" onClick={() => navigate("/dashboard")}>
                            Ir al Dashboard
                        </Button>
                    </div>
                )}

                {status === "not-member" && (
                    <div className="flex flex-col items-center gap-4 text-left">
                        <h1 className="text-2xl font-display font-bold text-foreground self-center">Unirte al Club</h1>
                        <p className="text-muted-foreground text-center">Para marcar asistencia en este club, primero debes unirte como arquero.</p>
                        <Button className="w-full mt-2" onClick={handleJoinAndMark} disabled={loadingAction}>
                            {loadingAction ? <Loader2 className="animate-spin mr-2" /> : null}
                            Unirme y Registrar Asistencia
                        </Button>
                        <Button variant="ghost" className="w-full" onClick={() => navigate("/login")}>
                            Volver
                        </Button>
                    </div>
                )}

                {status === "unauthorized" && (
                    <div className="flex flex-col gap-4">
                        {!isRegistering ? (
                            <>
                                <h1 className="text-2xl font-display font-bold text-foreground">Identifícate</h1>
                                <p className="text-muted-foreground">Debes tener una cuenta para marcar asistencia.</p>
                                <Button className="w-full mt-2" onClick={() => navigate("/login")}>
                                    Iniciar Sesión
                                </Button>
                                <div className="relative my-2">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border"></span></div>
                                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">O</span></div>
                                </div>
                                <Button variant="outline" className="w-full" onClick={() => setIsRegistering(true)}>
                                    Registrar nueva cuenta
                                </Button>
                            </>
                        ) : (
                            <form onSubmit={handleRegister} className="space-y-4 text-left">
                                <h2 className="text-xl font-display font-bold text-center">Registro Rápido</h2>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Nombre Completo</label>
                                    <Input value={regName} onChange={e => setRegName(e.target.value)} required placeholder="Tu nombre" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} required placeholder="tu@email.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Contraseña</label>
                                    <Input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} required placeholder="••••••" minLength={6} />
                                </div>
                                <Button type="submit" className="w-full" disabled={loadingAction}>
                                    {loadingAction ? <Loader2 className="animate-spin mr-2" /> : "Crear cuenta y Marcar"}
                                </Button>
                                <Button type="button" variant="ghost" className="w-full" onClick={() => setIsRegistering(false)}>
                                    Ya tengo cuenta
                                </Button>
                            </form>
                        )}
                    </div>
                )}

                {status === "error" && (
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
                            <XCircle className="h-12 w-12 text-destructive" />
                        </div>
                        <h1 className="text-2xl font-display font-bold text-foreground">Upps...</h1>
                        <p className="text-muted-foreground">{message}</p>
                        <Button variant="outline" className="w-full mt-4 gap-2" onClick={() => navigate("/")}>
                            <ArrowLeft className="h-4 w-4" /> Volver al inicio
                        </Button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
