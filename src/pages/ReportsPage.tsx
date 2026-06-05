import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { BarChart3, TrendingUp, Users, Target, Calendar, Filter, ChevronDown, ChevronUp, CheckCircle2, XCircle, PieChart as PieChartIcon } from "lucide-react";
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
  Cell
} from "recharts";

const COLORS = [
  "hsl(160, 84%, 29%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 70%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
];

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ScoreReport {
  id: string;
  member_id: string;
  total_score: number;
  score_date: string;
  members: { full_name: string };
}

interface AttendanceReport {
  id: string;
  attended: boolean;
  member_id: string;
  members: { full_name: string };
  training_sessions: { name: string; event_date: string; division: string };
}

interface MemberReport {
  id: string;
  full_name: string;
  status: string;
  member_roles: { role: string }[];
}

export default function ReportsPage() {
  const { member } = useAuth();
  const isSuperAdmin = !!member?.is_super_admin;

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const { data: clubs } = useClubs();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("performance");

  useEffect(() => {
    if (!isSuperAdmin && member?.club_id && !selectedClubId) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin, selectedClubId]);

  // --- Performance Data (Scores) ---
  const { data: scores } = useQuery<ScoreReport[]>({
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

      const { data, error } = await query.order("score_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as ScoreReport[];
    },
    enabled: !!selectedClubId && activeTab === "performance",
  });

  // --- Attendance Data ---
  const { data: attendanceRaw } = useQuery<AttendanceReport[]>({
    queryKey: ["club-attendance-report", selectedClubId, startDate, endDate, selectedMemberId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return [];
      let query = supabase
        .from("training_enrollments")
        .select(`
          id, 
          attended, 
          member_id,
          members!inner(full_name), 
          training_sessions!inner(name, event_date, division)
        `)
        .eq("club_id", selectedClubId);

      if (startDate) query = query.gte("training_sessions.event_date", startDate);
      if (endDate) query = query.lte("training_sessions.event_date", endDate);
      if (selectedMemberId && selectedMemberId !== "all") query = query.eq("member_id", selectedMemberId);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AttendanceReport[];
    },
    enabled: !!selectedClubId && activeTab === "attendance",
  });

  const { data: membersList } = useQuery<MemberReport[]>({
    queryKey: ["club-members-report", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, full_name, status, member_roles(role)")
        .eq("club_id", selectedClubId);
      if (error) throw error;
      return (data || []) as unknown as MemberReport[];
    },
    enabled: !!selectedClubId,
  });

  // --- Performance Calculations ---
  const memberAvgs = useMemo(() => {
    if (!scores?.length) return [];
    const map: Record<string, { name: string; total: number; count: number }> = {};
    scores.forEach((s) => {
      const name = s.members?.full_name || "Sin nombre";
      if (!map[s.member_id]) map[s.member_id] = { name, total: 0, count: 0 };
      map[s.member_id].total += s.total_score;
      map[s.member_id].count += 1;
    });
    return Object.values(map)
      .map((m) => ({ name: m.name.split(" ")[0], promedio: Math.round(m.total / m.count), sesiones: m.count }))
      .sort((a, b) => b.promedio - a.promedio)
      .slice(0, 10);
  }, [scores]);

  const monthlyTrend = useMemo(() => {
    if (!scores?.length) return [];
    const map: Record<string, { total: number; count: number }> = {};
    scores.forEach((s) => {
      const month = s.score_date.substring(0, 7);
      if (!map[month]) map[month] = { total: 0, count: 0 };
      map[month].total += s.total_score;
      map[month].count += 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ mes: month, promedio: Math.round(v.total / v.count) }));
  }, [scores]);

  // --- Attendance Calculations ---
  const attendanceStats = useMemo(() => {
    if (!attendanceRaw?.length) return { overall: 0, count: 0, sessions: 0, byMember: [], byDivision: [], trend: [] };

    let attendedCount = 0;
    const memberMap: Record<string, { name: string; attended: number; total: number }> = {};
    const divMap: Record<string, { attended: number; total: number }> = {};
    const trendMap: Record<string, { attended: number; total: number }> = {};

    attendanceRaw.forEach((row) => {
      if (row.attended) attendedCount++;

      // Member Map
      const mId = row.member_id;
      const mName = row.members?.full_name || "Sin nombre";
      if (!memberMap[mId]) memberMap[mId] = { name: mName, attended: 0, total: 0 };
      memberMap[mId].total++;
      if (row.attended) memberMap[mId].attended++;

      // Division Map
      const div = row.training_sessions?.division || "Sin división";
      if (!divMap[div]) divMap[div] = { attended: 0, total: 0 };
      divMap[div].total++;
      if (row.attended) divMap[div].attended++;

      // Trend Map (Monthly)
      const date = row.training_sessions?.event_date || "";
      const month = date.substring(0, 7);
      if (month) {
        if (!trendMap[month]) trendMap[month] = { attended: 0, total: 0 };
        trendMap[month].total++;
        if (row.attended) trendMap[month].attended++;
      }
    });

    const byMember = Object.values(memberMap)
      .map(m => ({ name: m.name.split(" ")[0], tasa: Math.round((m.attended / m.total) * 100), total: m.total }))
      .sort((a, b) => b.tasa - a.tasa)
      .slice(0, 10);

    const byDivision = Object.entries(divMap).map(([name, v]) => ({
      name,
      value: Math.round((v.attended / v.total) * 100)
    }));

    const trend = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ mes: month, tasa: Math.round((v.attended / v.total) * 100) }));

    return {
      overall: Math.round((attendedCount / attendanceRaw.length) * 100),
      count: attendedCount,
      total: attendanceRaw.length,
      byMember,
      byDivision,
      trend
    };
  }, [attendanceRaw]);

  // Distribution
  const statusDist = useMemo(() => {
    if (!membersList?.length) return [];
    const active = membersList.filter((m) => m.status === "activo").length;
    const inactive = membersList.filter((m) => m.status !== "activo").length;
    return [
      { name: "Activos", value: active },
      { name: "Inactivos", value: inactive },
    ].filter((d) => d.value > 0);
  }, [membersList]);

  const roleDist = useMemo(() => {
    if (!membersList?.length) return [];
    const map: Record<string, number> = {};
    membersList.forEach((m) => {
      (m.member_roles)?.forEach((r) => {
        map[r.role] = (map[r.role] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [membersList]);

  const totalMembers = membersList?.length || 0;
  const totalScores = scores?.length || 0;
  const avgScore = totalScores > 0 ? Math.round(scores!.reduce((s, sc) => s + sc.total_score, 0) / totalScores) : 0;
  const bestScore = totalScores > 0 ? Math.max(...scores!.map((s) => s.total_score)) : 0;

  return (
    <div className="space-y-6 pb-20 max-w-6xl mx-auto">
      <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center justify-center sm:justify-start gap-2">
            <BarChart3 className="h-7 w-7 text-primary" />
            Reportes
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic opacity-80">"Análisis de rendimiento estratégico"</p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex justify-center sm:justify-start">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="glass border-white/5 p-1 h-12">
            <TabsTrigger value="performance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 h-10 px-6 rounded-lg transition-all">
              <Target className="h-4 w-4" /> Rendimiento
            </TabsTrigger>
            <TabsTrigger value="attendance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 h-10 px-6 rounded-lg transition-all">
              <Calendar className="h-4 w-4" /> Asistencias
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters Panel */}
      <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl border-white/5 overflow-hidden shadow-xl">
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
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "performance" ? (
          <div
            key="perf"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: Users, label: "Miembros", value: totalMembers, color: "text-primary" },
                { icon: Target, label: "Registros", value: totalScores, color: "text-amber-500" },
                { icon: TrendingUp, label: "Promedio", value: avgScore, color: "text-emerald-500" },
                { icon: BarChart3, label: "Record", value: bestScore, color: "text-indigo-400" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 border-white/5 relative overflow-hidden shadow-lg">
                  <Icon className={cn("h-5 w-5 mb-2", color)} />
                  <div>
                    <p className="text-2xl sm:text-3xl font-display font-black text-foreground tabular-nums">{value}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Bar: member performance */}
              <div className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 className="h-5 w-5 text-primary" />
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
                          contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px" }}
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        />
                        <Bar dataKey="promedio" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-30 italic text-sm">Sin datos para graficar</div>
                  )}
                </div>
              </div>

              {/* Line: progress trend */}
              <div className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <h3 className="font-display font-bold text-foreground">Tendencia de Progreso</h3>
                </div>
                <div className="h-[300px] w-full mt-4">
                  {monthlyTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px" }} />
                        <Line type="monotone" dataKey="promedio" stroke="hsl(var(--accent))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--accent))", strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-30 italic text-sm">Sin registros mensuales...</div>
                  )}
                </div>
              </div>

              {/* Status & Role Distribution */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:col-span-2 gap-4">
                <div className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">Estado de Miembros</h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                          {statusDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 text-center">Distribución de Roles</h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={roleDist} cx="50%" cy="50%" innerRadius={60} outerRadius={80} dataKey="value" stroke="none">
                          {roleDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            key="attendance"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {/* Attendance Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { icon: CheckCircle2, label: "Tasa General", value: `${attendanceStats.overall}%`, color: "text-emerald-500" },
                { icon: XCircle, label: "Total Faltas", value: attendanceStats.total - attendanceStats.count, color: "text-rose-500" },
                { icon: Calendar, label: "Total Sesiones", value: attendanceRaw?.length || 0, color: "text-primary" },
                { icon: Users, label: "Presentes", value: attendanceStats.count, color: "text-amber-500" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass rounded-2xl p-4 sm:p-5 flex flex-col justify-between h-28 sm:h-32 border-white/5 relative overflow-hidden shadow-lg">
                  <Icon className={cn("h-5 w-5 mb-2", color)} />
                  <div>
                    <p className="text-2xl sm:text-3xl font-display font-black text-foreground tabular-nums">{value}</p>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Member Attendance Bar */}
              <div className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <Users className="h-5 w-5 text-amber-500" />
                  <h3 className="font-display font-bold text-foreground">Ranking de Asistencia (%)</h3>
                </div>
                <div className="h-[300px] w-full mt-4">
                  {attendanceStats.byMember.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceStats.byMember} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px" }}
                        />
                        <Bar dataKey="tasa" fill="hsl(var(--amber-500))" radius={[0, 4, 4, 0]} barSize={20}>
                          {attendanceStats.byMember.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.tasa > 80 ? 'hsl(142, 70%, 45%)' : entry.tasa > 50 ? 'hsl(38, 92%, 50%)' : 'hsl(346, 84%, 61%)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-30 italic text-sm">Sin datos de asistencia</div>
                  )}
                </div>
              </div>

              {/* Attendance Trend Line */}
              <div className="glass rounded-3xl p-5 border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-display font-bold text-foreground">Evolución de Asistencia (%)</h3>
                </div>
                <div className="h-[300px] w-full mt-4">
                  {attendanceStats.trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={attendanceStats.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="mes" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px" }} />
                        <Line type="monotone" dataKey="tasa" stroke="hsl(142, 70%, 45%)" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-30 italic text-sm">Iniciando seguimiento...</div>
                  )}
                </div>
              </div>

              {/* Attendance by Division */}
              <div className="lg:col-span-2 glass rounded-3xl p-5 border-white/5 shadow-xl">
                <div className="flex items-center gap-2 mb-6">
                  <PieChartIcon className="h-5 w-5 text-indigo-400" />
                  <h3 className="font-display font-bold text-foreground font-display">Asistencia por División (%)</h3>
                </div>
                <div className="h-[250px] w-full">
                  {attendanceStats.byDivision.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceStats.byDivision}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--indigo-400))" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full opacity-30 italic text-sm">No hay datos por división</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
