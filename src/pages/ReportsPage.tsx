import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(160, 84%, 29%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

export default function ReportsPage() {
  const { member } = useAuth();

  const { data: scores } = useQuery({
    queryKey: ["club-scores-report", member?.club_id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("scores")
        .select("*, members!inner(full_name)")
        .eq("club_id", member.club_id)
        .order("score_date", { ascending: true });
      return data || [];
    },
    enabled: !!member,
  });

  const { data: members } = useQuery({
    queryKey: ["club-members-report", member?.club_id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("members")
        .select("id, full_name, status, member_roles(role)")
        .eq("club_id", member.club_id);
      return data || [];
    },
    enabled: !!member,
  });

  // Chart data: Average score per member (top 10)
  const memberAvgs = (() => {
    if (!scores?.length) return [];
    const map: Record<string, { name: string; total: number; count: number }> = {};
    scores.forEach((s: any) => {
      const name = s.members?.full_name || "Sin nombre";
      if (!map[s.member_id]) map[s.member_id] = { name, total: 0, count: 0 };
      map[s.member_id].total += s.total_score;
      map[s.member_id].count += 1;
    });
    return Object.values(map)
      .map((m) => ({ name: m.name.split(" ")[0], promedio: Math.round(m.total / m.count), sesiones: m.count }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 10);
  })();

  // Chart data: scores over time (monthly avg)
  const monthlyTrend = (() => {
    if (!scores?.length) return [];
    const map: Record<string, { total: number; count: number }> = {};
    scores.forEach((s: any) => {
      const month = s.score_date.substring(0, 7);
      if (!map[month]) map[month] = { total: 0, count: 0 };
      map[month].total += s.total_score;
      map[month].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ mes: month, promedio: Math.round(v.total / v.count) }));
  })();

  // Pie: member status distribution
  const statusDist = (() => {
    if (!members?.length) return [];
    const active = members.filter((m) => m.status === "activo").length;
    const inactive = members.filter((m) => m.status !== "activo").length;
    return [
      { name: "Activos", value: active },
      { name: "Inactivos", value: inactive },
    ].filter((d) => d.value > 0);
  })();

  // Pie: role distribution
  const roleDist = (() => {
    if (!members?.length) return [];
    const map: Record<string, number> = {};
    members.forEach((m: any) => {
      (m.member_roles as any[])?.forEach((r: any) => {
        map[r.role] = (map[r.role] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const totalMembers = members?.length || 0;
  const totalScores = scores?.length || 0;
  const avgScore = totalScores > 0
    ? Math.round(scores!.reduce((s, sc) => s + sc.total_score, 0) / totalScores)
    : 0;
  const bestScore = totalScores > 0
    ? Math.max(...scores!.map((s) => s.total_score))
    : 0;

  const stats = [
    { icon: Users, label: "Miembros", value: totalMembers },
    { icon: Target, label: "Puntajes Registrados", value: totalScores },
    { icon: TrendingUp, label: "Promedio General", value: avgScore },
    { icon: BarChart3, label: "Mejor Puntaje", value: bestScore },
  ];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Reportes del Club
        </h1>
        <p className="text-muted-foreground">Análisis de rendimiento y estadísticas</p>
      </motion.div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ icon: Icon, label, value }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-xl p-5"
          >
            <Icon className="h-5 w-5 mb-2 text-primary" />
            <p className="text-2xl font-display font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar: avg per member */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Promedio por Arquero</h3>
          {memberAvgs.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={memberAvgs}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Bar dataKey="promedio" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sin datos</p>
          )}
        </motion.div>

        {/* Line: monthly trend */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Tendencia Mensual</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Line type="monotone" dataKey="promedio" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sin datos</p>
          )}
        </motion.div>

        {/* Pie: status */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Estado de Miembros</h3>
          {statusDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sin datos</p>
          )}
        </motion.div>

        {/* Pie: roles */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Distribución de Roles</h3>
          {roleDist.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={roleDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {roleDist.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-muted-foreground py-12">Sin datos</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
