import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar, Award, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { member, memberships, setActiveMembership } = useAuth();
  const isAdmin = member?.roles?.includes("administrador") || member?.roles?.includes("presidente") || member?.roles?.includes("entrenador");
  const isPresidente = member?.roles?.includes("presidente") || member?.roles?.includes("administrador");

  const { data: scores } = useQuery({
    queryKey: ["my-scores", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("scores")
        .select("*")
        .eq("member_id", member.id)
        .order("score_date", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!member,
  });

  const { data: totalScores } = useQuery({
    queryKey: ["score-count", member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { count } = await supabase
        .from("scores")
        .select("*", { count: "exact", head: true })
        .eq("member_id", member.id);
      return count || 0;
    },
    enabled: !!member,
  });

  const { data: sessionCount } = useQuery({
    queryKey: ["session-count", member?.club_id],
    queryFn: async () => {
      if (!member || !member.club_id) return 0;
      const { count } = await supabase
        .from("training_sessions")
        .select("*", { count: "exact", head: true })
        .eq("club_id", member.club_id);
      return count || 0;
    },
    enabled: !!member && !!member.club_id,
  });

  const bestScore = scores?.length
    ? Math.max(...scores.map((s) => s.total_score))
    : 0;

  const statCards = [
    { icon: Target, label: "Mis Puntajes", value: totalScores || 0, color: "text-primary", to: "/scores" },
    { icon: TrendingUp, label: "Record Personal", value: bestScore, color: "text-amber-500", to: "/scores" },
    { icon: Calendar, label: "Sesiones Club", value: sessionCount || 0, color: "text-indigo-400", to: "/training" },
    { icon: Award, label: "Rol Actual", value: member?.roles[0] || "Arquero", color: "text-emerald-500", to: "/profile" },
  ];

  function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(" ");
  }
  return (
    <div className="space-y-8 pb-10">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-display font-black text-foreground tracking-tight leading-tight">
            Hola, <span className="text-primary">{member?.full_name?.split(" ")[0]}</span>! 🏹
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic opacity-80">"La precisión está en los detalles"</p>
        </div>

        {memberships.length > 1 && (
          <div className="w-full sm:w-auto sm:min-w-[260px] glass p-3 rounded-2xl border-primary/10">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block px-1">Cambiar de Club</label>
            <Select value={member?.club_id} onValueChange={setActiveMembership}>
              <SelectTrigger className="h-10 bg-background/50 border-none shadow-none">
                <SelectValue placeholder="Seleccionar Club" />
              </SelectTrigger>
              <SelectContent className="glass">
                {memberships.map((m) => (
                  <SelectItem key={m.club_id} value={m.club_id}>
                    {m.club_name || "Club sin nombre"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ icon: Icon, label, value, color, to }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={to} className="glass rounded-[2rem] p-5 sm:p-6 block hover:bg-muted/30 transition-all active:scale-[0.97] shadow-xl shadow-black/5 border-white/5 relative overflow-hidden group">
              <div className={cn("absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-5 transition-opacity group-hover:opacity-10 bg-current", color.replace('text-', 'bg-'))} />
              <Icon className={cn("h-6 w-6 mb-4", color)} />
              <p className="text-2xl sm:text-3xl font-display font-black text-foreground truncate tabular-nums">{value}</p>
              <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-wider truncate">{label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions - Mobile First */}
      <div className="space-y-4">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Operaciones Tácticas</h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:flex flex-wrap gap-3">
            <Link to="/scores/new" className="w-full md:w-auto">
            <Button className="w-full h-12 gap-2 rounded-2xl font-black shadow-lg shadow-primary/30">
                <Target className="h-5 w-5" />
                NUEVO PUNTAJE
            </Button>
            </Link>
            <Link to="/training" className="w-full md:w-auto">
            <Button variant="outline" className="w-full h-12 gap-2 rounded-2xl font-bold bg-card/50 hover:bg-card">
                <Calendar className="h-5 w-5" />
                ENTRENAMIENTOS
            </Button>
            </Link>
            {isPresidente && (
            <Link to="/reports" className="w-full md:w-auto">
                <Button variant="outline" className="w-full h-12 gap-2 rounded-2xl font-bold bg-card/50 hover:bg-card">
                <BarChart3 className="h-5 w-5" />
                REPORTES
                </Button>
            </Link>
            )}
            {isAdmin && (
            <Link to="/admin" className="w-full md:w-auto">
                <Button variant="outline" className="w-full h-12 gap-2 rounded-2xl font-bold bg-card/50 hover:bg-card border-primary/20">
                <Shield className="h-5 w-5" />
                ADMINISTRACIÓN
                </Button>
            </Link>
            )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Últimos Registros</h2>
            <Link to="/scores" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Ver Todo</Link>
        </div>

        {scores && scores.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {scores.map((score, i) => (
              <motion.div
                key={score.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-4 sm:p-5 flex items-center justify-between border-white/5 shadow-sm hover:border-primary/20 transition-colors cursor-default"
              >
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/10">
                        {score.total_score >= 300 ? "🎯" : "🏹"}
                    </div>
                    <div>
                        <p className="font-bold text-foreground text-sm sm:text-base leading-tight">{score.event_name || "Entrenamiento"}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-[10px] text-muted-foreground font-medium">
                                {new Date(score.score_date).toLocaleDateString("es-CL", { day: 'numeric', month: 'short' })}
                            </p>
                            {score.division && <Badge variant="secondary" className="text-[8px] h-4 px-1.5 font-bold uppercase">{score.division}</Badge>}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-display font-black text-primary tabular-nums tracking-tighter">{score.total_score}</p>
                  <p className="text-[8px] uppercase text-muted-foreground font-black tracking-widest -mt-1">Puntos</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-3xl p-12 text-center border-dashed border-2 border-white/5">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20 animate-pulse" />
            <p className="text-sm text-muted-foreground font-medium">Aún no hay actividad de rendimiento en tu servidor.</p>
            <Link to="/scores/new">
              <Button variant="outline" size="sm" className="mt-4 rounded-xl px-6">
                Registrar primer puntaje
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
