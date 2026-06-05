import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContextCore";
import { logger } from "@/lib/logger";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { toast } = useToast();
    const { session, member, isSuperAdminSubdomain, systemMode } = useAuth();

    useEffect(() => {
        if (session) {
            if (member) {
                logger.log("🎯 [LoginPage] Miembro cargado, verificando accesos...");

                // Support custom redirect after login
                const searchParams = new URLSearchParams(window.location.search);
                const redirectPath = searchParams.get("redirect");
                if (redirectPath) {
                    logger.log(`➡️ [LoginPage] Redirecting to custom path: ${redirectPath}`);
                    navigate(redirectPath);
                    return;
                }

                const isAdmin = member.roles?.some(role => ['administrador', 'presidente'].includes(role));
                const isExpired = member.subscription_end_date && new Date(member.subscription_end_date) < new Date();
                const graceEndDate = member.subscription_end_date ? new Date(member.subscription_end_date) : null;
                if (graceEndDate) {
                    graceEndDate.setDate(graceEndDate.getDate() + 2);
                }
                const isGraceExpired = graceEndDate && graceEndDate < new Date();
                const isClubBlocked = member.club_status === "bloqueado";
                const isUserInactive = member.status === "inactivo";

                // Check for blocks
                const shouldBeBlocked = systemMode === 'produccion' && !member.is_super_admin && (
                    (isAdmin && (isClubBlocked || isExpired)) ||
                    (!isAdmin && (isClubBlocked || isGraceExpired || isUserInactive))
                );

                if (shouldBeBlocked) {
                    logger.log("🔒 [LoginPage] Acceso denegado: Club o Miembro bloqueado.");
                    navigate("/dashboard");
                } else if (isSuperAdminSubdomain || member.is_super_admin) {
                    navigate("/super-admin");
                } else if (isAdmin) {
                    navigate("/admin");
                } else {
                    navigate("/dashboard");
                }
            } else {
                // Si tenemos sesión pero después de 5s no hay miembro, algo anda mal en la DB
                const timer = setTimeout(() => {
                    if (session && !member) {
                        logger.error("🚨 [LoginPage] Tiempo de espera agotado para cargar el perfil del miembro.");
                        toast({
                            title: "Error de Perfil",
                            description: "Tu cuenta de usuario existe, pero no encontramos tu perfil de miembro en este club. Contacta al soporte.",
                            variant: "destructive"
                        });
                    }
                }, 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [session, member, navigate, isSuperAdminSubdomain, toast, systemMode]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        try {
            logger.log("🚀 [LoginPage] Intentando signIn para: " + email);
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                logger.error("❌ [LoginPage] Error de auth: " + error.message);
                toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
            } else if (data.session) {
                logger.log("✅ [LoginPage] Sesión iniciada con éxito para UID: " + data.session.user.id);
            }
        } catch (err: unknown) {
            logger.error("💥 [LoginPage] Error inesperado:", err);
            toast({ title: "Error inesperado", description: "Ocurrió un error al procesar tu solicitud.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left panel - branding */}
            <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12" style={{ background: "var(--gradient-dark)" }}>
                <div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    <div className="mb-8 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/20 glow-primary">
                            <Target className="h-10 w-10 text-primary" />
                        </div>
                    </div>
                    <h1 className="mb-4 text-4xl font-display font-bold text-primary-foreground">
                        Quiver<span className="text-primary">App</span>
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-sm">
                        {isSuperAdminSubdomain
                            ? "Panel de control maestro para la administración global de clubes de arquería."
                            : "La plataforma de gestión para clubes de arquería. Controla miembros, entrenamientos y puntajes en un solo lugar."}
                    </p>
                </div>
            </div>

            {/* Right panel - form */}
            <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 bg-background">
                <div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-sm"
                >
                    <div className="mb-8 lg:hidden flex justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                            <Target className="h-7 w-7 text-primary" />
                        </div>
                    </div>
                    <h2 className="mb-2 text-2xl font-display font-bold text-foreground">
                        {isSuperAdminSubdomain ? "Panel Central" : "Iniciar Sesión"}
                    </h2>
                    <p className="mb-8 text-muted-foreground">
                        {isSuperAdminSubdomain ? "Acceso exclusivo para administradores globales" : "Ingresa a tu cuenta del club"}
                    </p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email">Correo electrónico</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="pl-10 pr-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <div className="flex justify-end">
                                <Link
                                    to="/forgot-password"
                                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Ingresando..." : "Ingresar"}
                        </Button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            ¿Tu club no tiene cuenta?{" "}
                            <Link to="/register-club" className="text-primary font-medium hover:underline">
                                Registrar club
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
