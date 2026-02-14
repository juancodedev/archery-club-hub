import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

export default function RegisterClubPage() {
  const [clubName, setClubName] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase.from("plans").select("id, name, price").order("price", { ascending: true });
      if (data) {
        setPlans(data);
        if (data.length > 0) setPlanId(data[0].id);
      }
    }
    fetchPlans();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: contactEmail,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("No se pudo crear el usuario");

      // 2. Call register_club function (Atomic: includes plan and price)
      const selectedPlan = plans.find(p => p.id === planId);
      const { data: clubId, error: rpcError } = await supabase.rpc("register_club", {
        p_club_name: clubName,
        p_city: city,
        p_country: country,
        p_contact_email: contactEmail,
        p_admin_name: adminName,
        p_user_id: authData.user.id,
        p_plan_id: planId || null,
        p_monthly_price: selectedPlan?.price || 29.99
      });

      if (rpcError) throw rpcError;

      toast({
        title: "¡Club registrado!",
        description: "Configurando tu sesión...",
      });

      // Ir directamente al dashboard
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Registrar Club</h1>
          <p className="text-muted-foreground">Crea tu club y elige un plan SaaS</p>
        </div>

        <div className="glass rounded-xl p-6">
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clubName">Nombre del club</Label>
                <Input id="clubName" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Club de Arquería..." required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Santiago" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Chile" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Plan SaaS</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} (${plan.price}/mes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>



            <div className="border-t border-border my-4" />
            <h3 className="font-display font-semibold text-foreground">Cuenta del Administrador</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminName">Nombre completo</Label>
                <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Juan Pérez" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Correo electrónico</Label>
                <Input id="adminEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="admin@club.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Club"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
