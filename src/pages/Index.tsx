import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Target, Users, TrendingUp, Shield, ArrowRight, LayoutDashboard, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContextCore";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Plan { id: string; name: string; description: string | null; price: number; features: string[] | null; }
function PricingPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("price", { ascending: true });
      if (data) setPlans(data);
      setLoading(false);
    }
    fetchPlans();
  }, []);

  if (loading) return <div className="col-span-full py-20 text-center text-muted-foreground">Cargando planes...</div>;

  return (
    <>
      {plans.map((plan) => (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass rounded-2xl p-8 border border-border/50 hover:border-primary/50 transition-colors flex flex-col"
        >
          <div className="mb-6">
            <h3 className="text-xl font-display font-bold text-foreground mb-2">{plan.name}</h3>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-foreground">${plan.price}</span>
              <span className="text-muted-foreground">/mes</span>
            </div>
            {plan.description && <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>}
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {Array.isArray(plan.features) && plan.features.map((feature: string, idx: number) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className="h-4 w-4 text-primary mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>

          <Link to="/register-club" className="w-full">
            <Button variant={plan.name === "Pro" ? "default" : "outline"} className="w-full">
              Empezar ahora
            </Button>
          </Link>
        </motion.div>
      ))}
    </>
  );
}

export default function Index() {
  const { session, member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const dashboardPath = isSuperAdmin ? "/super-admin" : "/dashboard";

  const features = [
    { icon: Users, title: "Gestión de Miembros", desc: "Registra y administra los miembros de tu club con fichas completas." },
    { icon: Target, title: "Registro de Puntajes", desc: "Tarjeta de puntuación con 6 ends y 5 flechas por end." },
    { icon: TrendingUp, title: "Historial de Entrenamientos", desc: "Seguimiento completo del progreso de cada arquero." },
    { icon: Shield, title: "Multi-tenant", desc: "Cada club tiene su espacio independiente y seguro." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-dark)" }} />
        <div className="relative container mx-auto px-4 py-6">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span className="font-display font-bold text-lg text-foreground">QuiverApp</span>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <Link to={dashboardPath}>
                  <Button size="sm" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" size="sm">Iniciar Sesión</Button>
                  </Link>
                  <Link to="/register-club">
                    <Button size="sm">Registrar Club</Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>

        <div className="relative container mx-auto px-4 pt-20 pb-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 glow-primary">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-4">
              Gestiona tu club de{" "}
              <span className="text-gradient">Arquería</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              La plataforma SaaS diseñada para clubes de arquería. Controla miembros, entrenamientos y puntajes en un solo lugar.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              {session ? (
                <Link to={dashboardPath}>
                  <Button size="lg" className="gap-2">
                    Ir a mi Panel
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register-club">
                    <Button size="lg" className="gap-2">
                      Comenzar Gratis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="lg">Ya tengo cuenta</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </header>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">
            Todo lo que tu club necesita
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Herramientas simples y potentes para gestionar tu club de arquería
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-6 hover:shadow-lg transition-shadow"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-4 py-20 bg-muted/30">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">
            Planes de Membresía
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Elige el plan que mejor se adapte a las necesidades de tu club
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          <PricingPlans />
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl p-8 md:p-12 text-center"
          style={{ background: "var(--gradient-dark)" }}
        >
          <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-3">
            ¿Listo para empezar?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Registra tu club en minutos y comienza a gestionar tu equipo hoy.
          </p>
          <Link to="/register-club">
            <Button size="lg" className="gap-2">
              Registrar mi Club
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-display font-semibold">QuiverApp</span>
          </div>
          <p>© {new Date().getFullYear()} QuiverApp</p>
        </div>
      </footer>
    </div>
  );
}
