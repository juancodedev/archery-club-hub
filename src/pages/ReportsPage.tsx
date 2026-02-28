import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target, Calendar, Filter, ChevronDown, ChevronUp } from "lucide-react";
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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.club_id) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const { data: scores } = useQuery({
    queryKey: ["club-scores-report", selectedClubId, startDate, endDate, selectedMemberId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return [];
      let query = supabase
        .from("scores")
        .select("*, members!inner(full_name)")
        .eq("club_id", selectedClubId);

      if (startDate) query = query.gte("score_date", startDate);
      if (endDate) query = query.lte("score_date", endDate);
      if (selectedMemberId && selectedMemberId !== "all") query = query.eq("member_id", selectedMemberId);

      const { data } = await query.order("score_date", { ascending: true });
      return data || [];
    },
    enabled: !!selectedClubId,
  });

  const { data: membersList } = useQuery({
    queryKey: ["club-members-report", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return [];
      const { data } = await supabase
        .from("members")
        .select("id, full_name, status, member_roles(role)")
        .eq("club_id", selectedClubId);
      return data || [];
    },
    enabled: !!selectedClubId,
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

  // Pie: member distribution
  const statusDist = (() => {
    if (!membersList?.length) return [];
    const active = membersList.filter((m) => m.status === "activo").length;
    const inactive = membersList.filter((m) => m.status !== "activo").length;
    return [
      { name: "Activos", value: active },
      { name: "Inactivos", value: inactive },
    ].filter((d) => d.value > 0);
  })();

  // Pie: role distribution
  const roleDist = (() => {
    if (!membersList?.length) return [];
    const map: Record<string, number> = {};
    membersList.forEach((m: any) => {
      (m.member_roles as any[])?.forEach((r: any) => {
        map[r.role] = (map[r.role] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const totalMembers = membersList?.length || 0;
  const totalScores = scores?.length || 0;
  const avgScore = totalScores > 0
    ? Math.round(scores!.reduce((s, sc) => s + sc.total_score, 0) / totalScores)
    : 0;
  const bestScore = totalScores > 0
    ? Math.max(...scores!.map((s) => s.total_score))
    : 0;

  const stats = [
    { icon: Users, label: "Miembros", value: totalMembers, color: "text-primary" },
    { icon: Target, label: "Registros", value: totalScores, color: "text-amber-500" },
    { icon: TrendingUp, label: "Promedio", value: avgScore, color: "text-emerald-500" },
    { icon: BarChart3, label: "Record", value: bestScore, color: "text-indigo-400" },
  ];

  function cn(baseClass: string, colorClass: string): string {
    return `${baseClass} ${colorClass}`;
  }
  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Reportes
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic opacity-80">"Análisis de rendimiento estratégico"</p>
        </div>
      </motion.div>

      {/* Filters Panel - Mobile First Collapsible */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border-white/5 overflow-hidden shadow-xl">
        <button 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="w-full p-4 flex items-center justify-between text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors"
        >
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" /> Parámetros de Análisis
            </div>
            {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isFiltersOpen && (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-t border-white/5">
                {isSuperAdmin && (
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Club</Label>
                        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger className="glass h-10"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                            <SelectContent className="glass">
                                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Arquero</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="glass h-10"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="glass">
                            <SelectItem value="all">Todos los arqueros</SelectItem>
                            {membersList?.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Desde</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="glass h-10" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Hasta</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="glass h-10" />
                </div>
            </div>
        )}
      </motion.div>

      {/* Stats Cards - Grid Layout */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map(({ icon: Icon, label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 border-white/5 relative overflow-hidden group shadow-lg"
          >
            <div className={cn("absolute -top-6 -right-6 h-16 w-16 rounded-full opacity-5 bg-current", color.replace('text-', 'bg-'))} />
            <Icon className={cn("h-5 w-5 mb-2", color)} />
            <div>
                <p className="text-2xl sm:text-3xl font-display font-black text-foreground tabular-nums">{value}</p>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid - Adaptive */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Bar: avg per member */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-3xl p-5 sm:p-6 border-white/5 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="font-display font-bold text-foreground">Top 10 Rendimiento</h3>
          </div>
          <div className="h-[300px] w-full mt-4">
              {memberAvgs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberAvgs}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                    contentStyle={{
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "16px",
                        fontSize: "12px"
                    }}
                    cursor={{fill: 'rgba(255,255,255,0.02)'}}
                    />
                    <Bar dataKey="promedio" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={30} />
                </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 italic text-sm">Sin datos para graficar</div>
              )}
          </div>
        </motion.div>

        {/* Line: monthly trend */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-3xl p-5 sm:p-6 border-white/5 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                  <TrendingUp className="h-4 w-4" />
              </div>
              <h3 className="font-display font-bold text-foreground">Tendencia de Progreso</h3>
          </div>
          <div className="h-[300px] w-full mt-4">
              {monthlyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "rgba(15, 23, 42, 0.9)",
                            backdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "16px"
                        }}
                    />
                    <Line type="monotone" dataKey="promedio" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full opacity-30 italic text-sm">Esperando registros mensuales...</div>
              )}
          </div>
        </motion.div>

        {/* Pie Charts - Responsive Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 gap-4 sm:gap-6">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">Estado de Miembros</h3>
                <div className="h-[220px]">
                    {statusDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={statusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                            {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : (
                    <div className="flex items-center justify-center h-full opacity-20 italic">Sin datos</div>
                    )}
                </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">Distribución de Roles</h3>
                <div className="h-[220px]">
                    {roleDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={roleDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                            {roleDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    ) : (
                    <div className="flex items-center justify-center h-full opacity-20 italic">Sin datos</div>
                    )}
                </div>
            </motion.div>
        </div>
      </div>
    </div>
  );
}
