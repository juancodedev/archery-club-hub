import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Target, Users, TrendingUp, Shield, ArrowRight, LayoutDashboard, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContextCore";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import RingCell from "@/components/scores/RingCell";
import { arrowValue } from "@/lib/scoringUtils";

// Sample ends for the hero card: an IFAA Field round, four arrows per target.
const SAMPLE_FIELD_ENDS = [
  ["5", "5", "4", "3"],
  ["4", "4", "5", "M"],
  ["5", "4", "4", "4"],
  ["3", "5", "5", "4"],
  ["5", "5", "5", "4"],
];
const endTotal = (end: string[]) => end.reduce((sum, arrow) => sum + arrowValue(arrow), 0);
const SAMPLE_TOTAL = SAMPLE_FIELD_ENDS.reduce((sum, end) => sum + endTotal(end), 0);

function SampleScoreCard() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ejemplo</p>
          <p className="font-display text-2xl font-semibold text-foreground">Ronda IFAA Field</p>
        </div>
        <p className="font-display text-3xl font-bold text-primary tabular-nums">{SAMPLE_TOTAL}</p>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {SAMPLE_FIELD_ENDS.map((end, idx) => (
          <li key={idx} className="flex items-center gap-2 py-2">
            <span className="w-8 text-sm font-semibold text-muted-foreground">#{idx + 1}</span>
            {end.map((arrow, j) => (
              <RingCell key={j} ifaaRound="field" value={arrow} className="h-9 w-10 text-lg" />
            ))}
            <span className="ml-auto font-display text-xl font-bold text-foreground tabular-nums">{endTotal(end)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Plan { id: string; name: string; description: string | null; price: number; features: string[] | null; }
function PricingPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      const { data } = await supabase.from("plans").select("*").eq("is_active", true).order("price", { ascending: true });
      if (data) setPlans(data as unknown as Plan[]);
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
  const isSuperAdmin = !!member?.is_super_admin;
  const dashboardPath = isSuperAdmin ? "/super-admin" : "/dashboard";

  const features = [
    { icon: Target, title: "Un teclado por ronda", desc: "Solo los valores que existen en ese blanco. Indoor y Field Experto suman el 2, el 1 y la X de desempate." },
    { icon: Shield, title: "Reglas IFAA al guardar", desc: "Flechas por blanco y valores válidos se controlan en la base de datos, no solo en la pantalla." },
    { icon: Users, title: "Gestión de Miembros", desc: "Registra y administra los miembros de tu club con fichas completas." },
    { icon: TrendingUp, title: "Historial de Entrenamientos", desc: "Seguimiento completo del progreso de cada arquero." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <span className="font-display font-bold text-2xl text-foreground">QuiverApp</span>
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
      </header>

      <section className="container mx-auto px-4 pt-16 pb-20 md:pt-20 md:pb-24">
        <div className="flex flex-wrap items-center gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="min-w-0 flex-[999_1_420px]"
          >
            <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Para clubes de arquería IFAA</p>
            <h1 className="text-5xl md:text-6xl font-display font-bold leading-none text-foreground mb-5">
              Cada flecha, anotada como manda la ronda.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8">
              Field, Hunter, Animal, 3D e Indoor, cada ronda con su teclado y sus reglas. Tus arqueros anotan en la cancha y el club ve el progreso de toda la temporada.
            </p>
            <div className="flex flex-wrap gap-4">
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
          <div className="flex min-w-0 flex-[1_1_340px] justify-center">
            <SampleScoreCard />
          </div>
        </div>
      </section>

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
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
            ¿Listo para empezar?
          </h2>
          <p className="text-sidebar-foreground mb-6 max-w-md mx-auto">
            Registra tu club en minutos y comienza a gestionar tu equipo hoy.
          </p>
          <Link to="/register-club">
            <Button size="lg" className="gap-2 bg-white text-primary hover:bg-white/90">
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
