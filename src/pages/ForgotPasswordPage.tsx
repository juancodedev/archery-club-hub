import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Target, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });

        setLoading(false);

        if (error) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } else {
            setDone(true);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <motion.div
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
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center space-y-4 py-4"
                        >
                            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
                            <h2 className="text-xl font-display font-bold">Enlace enviado</h2>
                            <p className="text-sm text-muted-foreground">
                                Hemos enviado un enlace de recuperación a <strong>{email}</strong>.
                                Revisa tu bandeja de entrada.
                            </p>
                            <Button
                                onClick={() => navigate("/login")}
                                variant="outline"
                                className="w-full h-12 rounded-xl"
                            >
                                VOLVER AL INICIO
                                </Button>
                        </motion.div>
                    ) : (
                        <>
                            <div className="mb-6">
                                <h2 className="text-xl font-display font-bold text-foreground">Recuperar contraseña</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Ingresa tu correo electrónico para recibir un enlace de recuperación.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-sm font-medium">
                                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                        Correo Electrónico
                                    </Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="tu@email.com"
                                        className="glass h-12 rounded-xl"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 rounded-xl font-black text-sm shadow-lg shadow-primary/20 mt-2"
                                    disabled={loading}
                                >
                                    {loading ? "Enviando..." : "ENVIAR ENLACE"}
                                </Button>
                                <div className="text-center mt-4">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Volver al login
                                    </Link>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
