import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Target, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContextCore";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session, member, isSuperAdminSubdomain } = useAuth();

  useEffect(() => {
    if (session) {
      if (member) {
        console.log("🎯 [LoginPage] Miembro cargado, redirigiendo...");
        if (isSuperAdminSubdomain || member.is_super_admin) {
          navigate("/super-admin");
        } else if (member.roles?.includes('administrador') || member.roles?.includes('presidente')) {
          navigate("/admin");
        } else {
          navigate("/dashboard");
        }
      } else {
        // Si tenemos sesión pero después de 5s no hay miembro, algo anda mal en la DB
        const timer = setTimeout(() => {
          if (session && !member) {
            console.error("🚨 [LoginPage] Tiempo de espera agotado para cargar el perfil del miembro.");
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
  }, [session, member, navigate, isSuperAdminSubdomain, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      console.log("🚀 [LoginPage] Intentando signIn para:", email);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        console.error("❌ [LoginPage] Error de auth:", error.message);
        toast({ title: "Error al iniciar sesión", description: error.message, variant: "destructive" });
      } else if (data.session) {
        console.log("✅ [LoginPage] Sesión iniciada con éxito para UID:", data.session.user.id);
      }
    } catch (err: unknown) {
      console.error("💥 [LoginPage] Error inesperado:", err);
      toast({ title: "Error inesperado", description: "Ocurrió un error al procesar tu solicitud.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12" style={{ background: "var(--gradient-dark)" }}>
        <motion.div
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
            Archery<span className="text-primary">Hub</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm">
            {isSuperAdminSubdomain
              ? "Panel de control maestro para la administración global de clubes de arquería."
              : "La plataforma de gestión para clubes de arquería. Controla miembros, entrenamientos y puntajes en un solo lugar."}
          </p>
        </motion.div>
      </div>

      {/* Right panel - form */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center items-center p-8 bg-background">
        <motion.div
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
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
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
        </motion.div>
      </div>
    </div>
  );
}
