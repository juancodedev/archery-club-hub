import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);

    // Supabase envía el token en el hash de la URL (#access_token=...&type=recovery)
    // El cliente JS lo procesa automáticamente en el evento onAuthStateChange
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event) => {
                if (event === "PASSWORD_RECOVERY") {
                    setSessionReady(true);
                }
            }
        );
        return () => subscription.unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            toast({ title: "Las contraseñas no coinciden", variant: "destructive" });
            return;
        }
        if (password.length < 8) {
            toast({ title: "La contraseña debe tener al menos 8 caracteres", variant: "destructive" });
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        setLoading(false);
        if (error) {
            toast({ title: "Error al actualizar contraseña", description: error.message, variant: "destructive" });
        } else {
            setDone(true);
            setTimeout(() => navigate("/login"), 2500);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                        <Target className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-foreground">
                        Quiver<span className="text-primary">App</span>
                    </h1>
                </div>

                <div className="glass rounded-[2rem] p-8 border border-primary/10 shadow-2xl shadow-primary/5">
                    {done ? (
                        <div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-4">
                            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
                            <h2 className="text-xl font-display font-bold">¡Contraseña actualizada!</h2>
                            <p className="text-sm text-muted-foreground">Serás redirigido al login en unos segundos...</p>
                        </div>
                    ) : !sessionReady ? (
                        <div className="text-center space-y-4 py-6">
                            <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
                            <p className="text-sm text-muted-foreground">Verificando enlace de recuperación...</p>
                            <p className="text-xs text-muted-foreground/60">
                                Si esperas más de 10 segundos, el enlace puede haber expirado.{" "}
                                <button onClick={() => navigate("/login")} className="text-primary underline">
                                    Volver al login
                                </button>
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-display font-bold text-foreground">Nueva contraseña</h2>
                                <p className="text-sm text-muted-foreground mt-1">Elige una contraseña segura para tu cuenta.</p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                        Nueva Contraseña
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showPw ? "text" : "password"}
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="Mínimo 8 caracteres"
                                            className="glass h-12 rounded-xl pr-12"
                                            required
                                            minLength={8}
                                        />
                                        <button type="button" onClick={() => setShowPw(!showPw)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Confirmar Contraseña</Label>
                                    <Input
                                        type={showPw ? "text" : "password"}
                                        value={confirm}
                                        onChange={e => setConfirm(e.target.value)}
                                        placeholder="Repite la contraseña"
                                        className="glass h-12 rounded-xl"
                                        required
                                    />
                                    {confirm && password !== confirm && (
                                        <p className="text-xs text-destructive font-medium">Las contraseñas no coinciden</p>
                                    )}
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 rounded-xl font-black text-sm shadow-lg shadow-primary/20 mt-2"
                                    disabled={loading || password !== confirm || password.length < 8}
                                >
                                    {loading ? "Actualizando..." : "CAMBIAR CONTRASEÑA"}
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
