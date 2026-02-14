import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History, Target, ChevronDown, ChevronUp, Search, Filter, Building2, User as UserIcon, Calendar as CalendarIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ScoresPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const isAdmin = member?.roles?.includes("administrador") || member?.roles?.includes("presidente") || member?.roles?.includes("entrenador");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modality, setModality] = useState("all");

  const [clubs, setClubs] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.club_id) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  useEffect(() => {
    if (selectedClubId && (isAdmin || isSuperAdmin)) {
      fetchMembers(selectedClubId);
    }
  }, [selectedClubId, isAdmin, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const fetchMembers = async (clubId: string) => {
    const { data } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("club_id", clubId)
      .order("full_name");
    if (data) setMembersList(data);
  };

  const { data: scores, isLoading } = useQuery({
    queryKey: ["all-scores", selectedClubId, selectedMemberId, startDate, endDate, modality],
    queryFn: async () => {
      let query = supabase.from("scores").select(`
        *,
        members(full_name),
        clubs(name)
      `);

      if (isSuperAdmin) {
        if (selectedClubId && selectedClubId !== "all") {
          query = query.eq("club_id", selectedClubId);
        }
      } else {
        query = query.eq("club_id", member?.club_id);
      }

      if (selectedMemberId !== "all") {
        query = query.eq("member_id", selectedMemberId);
      } else if (!isAdmin && !isSuperAdmin) {
        query = query.eq("member_id", member?.id);
      }

      if (startDate) query = query.gte("score_date", startDate);
      if (endDate) query = query.lte("score_date", endDate);
      if (modality !== "all") query = query.ilike("division", `%${modality}%`);

      const { data, error } = await query.order("score_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!member,
  });

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Historial de Puntajes
          </h1>
          <p className="text-muted-foreground">Dashboard de rendimiento y registros</p>
        </div>
        <Link to="/scores/new">
          <Button className="gap-2">
            <Target className="h-4 w-4" />
            Nuevo Registro
          </Button>
        </Link>
      </motion.div>

      {/* FILTERS PANEL */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
          <Filter className="h-4 w-4 text-primary" /> Filtros del Dashboard
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label className="text-xs">Club</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos los clubes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Clubes</SelectItem>
                  {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {(isAdmin || isSuperAdmin) && (
            <div className="space-y-2">
              <Label className="text-xs">Arquero</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Todos los arqueros" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Arqueros</SelectItem>
                  {membersList.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
          </div>
        </div>

        <div className="flex flex-wrap gap-4 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Modalidad:</Label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="recurvo">Recurvo</SelectItem>
                <SelectItem value="compuesto">Compuesto</SelectItem>
                <SelectItem value="raso">Raso / Barebow</SelectItem>
                <SelectItem value="tradicional">Tradicional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={() => {
            setStartDate(""); setEndDate(""); setSelectedMemberId("all"); setModality("all");
          }} className="text-xs h-8">
            Limpiar Filtros
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-lg p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : scores && scores.length > 0 ? (
        <div className="space-y-3">
          {scores.map((score, i) => (
            <motion.div
              key={score.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-xl overflow-hidden border border-white/5 hover:border-primary/20 transition-all shadow-sm"
            >
              <button
                onClick={() => setExpandedId(expandedId === score.id ? null : score.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {score.total_score >= 300 ? "🎯" : score.total_score.toString().charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      {score.event_name || "Sesión de Entrenamiento"}
                      {isSuperAdmin && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground uppercase tracking-wider">
                          {score.clubs?.name}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-1 font-medium text-primary/80">
                        <UserIcon className="h-3 w-3" /> {score.members?.full_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" /> {new Date(score.score_date).toLocaleDateString("es-CL")}
                      </span>
                      {score.division && <span className="bg-white/5 px-2 py-0.5 rounded capitalize">{score.division}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-display font-bold text-primary tabular-nums">{score.total_score}</p>
                    <p className="text-[10px] uppercase text-muted-foreground tracking-widest -mt-1 font-medium">puntos</p>
                  </div>
                  {expandedId === score.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedId === score.id && (
                <div className="bg-black/20 border-t border-white/5 p-4 sm:p-6 overflow-x-auto">
                  <div className="max-w-xl mx-auto space-y-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 uppercase tracking-tighter text-muted-foreground text-[10px]">
                          <th className="py-2 px-2 text-left">End</th>
                          {Array.from({ length: 5 }, (_, i) => (
                            <th key={i} className="py-2 px-1 text-center">F{i + 1}</th>
                          ))}
                          <th className="py-2 px-2 text-center text-primary">T</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(score.ends as string[][])?.map((end: string[], endIdx: number) => {
                          const arrowVal = (v: string) => v === "X" ? 10 : v === "M" || v === "" ? 0 : Number(v);
                          const total = end.reduce((s, a) => s + arrowVal(a), 0);
                          return (
                            <tr key={endIdx} className="hover:bg-white/5 transition-colors">
                              <td className="py-2.5 px-2 text-muted-foreground font-medium text-xs">#{endIdx + 1}</td>
                              {end.map((arrow, j) => (
                                <td key={j} className="py-2.5 px-1 text-center font-mono">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-sm text-xs ${arrow === "X" || arrow === "10" ? "bg-yellow-500/20 text-yellow-500 font-bold" :
                                    ["9", "8"].includes(arrow) ? "bg-red-500/20 text-red-400" :
                                      ["7", "6"].includes(arrow) ? "bg-blue-500/20 text-blue-400" :
                                        arrow === "M" ? "text-muted-foreground/50" : "text-foreground/70"
                                    }`}>
                                    {arrow || "—"}
                                  </span>
                                </td>
                              ))}
                              <td className="py-2.5 px-2 text-center font-bold text-foreground bg-primary/5">{total}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {score.detail && (
                      <div className="bg-white/5 rounded-lg p-3 text-xs text-muted-foreground border border-white/5 italic">
                        "{score.detail}"
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-12 text-center space-y-4">
          <Target className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <div className="space-y-1">
            <p className="text-lg font-medium text-foreground">No se encontraron registros</p>
            <p className="text-sm text-muted-foreground">Intenta ajustar los filtros o registra un nuevo puntaje.</p>
          </div>
          <Link to="/scores/new">
            <Button variant="outline" size="sm" className="mt-2">Registrar primer puntaje</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
