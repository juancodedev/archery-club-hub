import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Target, TrendingUp, Calendar, Award, BarChart3, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
      if (!member) return 0;
      const { count } = await supabase
        .from("training_sessions")
        .select("*", { count: "exact", head: true })
        .eq("club_id", member.club_id);
      return count || 0;
    },
    enabled: !!member,
  });

  const bestScore = scores?.length
    ? Math.max(...scores.map((s) => s.total_score))
    : 0;

  const statCards = [
    { icon: Target, label: "Puntajes Tuyos", value: totalScores || 0, color: "text-primary", to: "/scores" },
    { icon: TrendingUp, label: "Mejor Puntaje", value: bestScore, color: "text-accent", to: "/scores" },
    { icon: Calendar, label: "Sesiones Club", value: sessionCount || 0, color: "text-primary", to: "/training" },
    { icon: Award, label: "Rol Principal", value: member?.roles[0] || "—", color: "text-accent", to: "/profile" },
  ];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground">
            ¡Hola, {member?.full_name?.split(" ")[0]}! 🏹
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenido a tu panel de arquería</p>
        </div>

        {memberships.length > 1 && (
          <div className="w-full sm:w-auto sm:min-w-[240px]">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Cambiar Club</label>
            <Select value={member?.club_id} onValueChange={setActiveMembership}>
              <SelectTrigger className="glass">
                <SelectValue placeholder="Seleccionar Club" />
              </SelectTrigger>
              <SelectContent>
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

      {/* Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map(({ icon: Icon, label, value, color, to }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={to} className="glass rounded-xl p-4 sm:p-5 block hover:bg-muted/50 transition-colors">
              <Icon className={`h-5 w-5 mb-2 sm:mb-3 ${color}`} />
              <p className="text-xl sm:text-2xl font-display font-bold text-foreground capitalize">{value}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">{label}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col xs:flex-row flex-wrap gap-2 sm:gap-3">
        <Link to="/scores/new" className="w-full xs:w-auto">
          <Button className="gap-2 w-full xs:w-auto">
            <Target className="h-4 w-4" />
            Registrar Puntaje
          </Button>
        </Link>
        <Link to="/training" className="w-full xs:w-auto">
          <Button variant="outline" className="gap-2 w-full xs:w-auto">
            <Calendar className="h-4 w-4" />
            Sesiones
          </Button>
        </Link>
        {isPresidente && (
          <Link to="/reports" className="w-full xs:w-auto">
            <Button variant="outline" className="gap-2 w-full xs:w-auto">
              <BarChart3 className="h-4 w-4" />
              Reportes
            </Button>
          </Link>
        )}
        {isAdmin && (
          <Link to="/admin" className="w-full xs:w-auto">
            <Button variant="outline" className="gap-2 w-full xs:w-auto">
              <Shield className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        )}
      </div>

      {/* Recent Scores */}
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground mb-4">Últimos Puntajes</h2>
        {scores && scores.length > 0 ? (
          <div className="space-y-3">
            {scores.map((score, i) => (
              <motion.div
                key={score.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{score.event_name || "Entrenamiento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(score.score_date).toLocaleDateString("es-CL")}
                    {score.division && ` • ${score.division}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-display font-bold text-primary">{score.total_score}</p>
                  <p className="text-xs text-muted-foreground">pts</p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-8 text-center">
            <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aún no tienes puntajes registrados</p>
            <Link to="/scores/new">
              <Button variant="outline" size="sm" className="mt-3">
                Registrar primer puntaje
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
