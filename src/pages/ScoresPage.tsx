import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History, Target, ChevronDown, ChevronUp, Search, Filter, Building2, User as UserIcon, Calendar as CalendarIcon, Info } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Rendimiento
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">"Tus flechas no mienten"</p>
        </div>
        <Link to="/scores/new" className="w-full sm:w-auto">
          <Button className="gap-2 w-full sm:w-auto h-11 sm:h-10 font-bold shadow-lg shadow-primary/20">
            <Target className="h-4 w-4" />
            Registrar Puntaje
          </Button>
        </Link>
      </motion.div>

      {/* FILTERS PANEL */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="glass rounded-2xl border-white/5 overflow-hidden"
      >
        <button 
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="w-full p-4 flex items-center justify-between text-sm font-bold bg-white/5 hover:bg-white/10 transition-colors"
        >
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" /> Filtros Avanzados
            </div>
            {isFiltersOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {isFiltersOpen && (
            <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }}
                className="p-5 space-y-6 border-t border-white/5"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {isSuperAdmin && (
                    <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Club</Label>
                    <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                        <SelectTrigger className="glass h-10"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="glass">
                        <SelectItem value="all">Todos los Clubes</SelectItem>
                        {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>
                )}

                {(isAdmin || isSuperAdmin) && (
                    <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Arquero</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger className="glass h-10"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent className="glass">
                        <SelectItem value="all">Todos los Arqueros</SelectItem>
                        {membersList.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    </div>
                )}

                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Desde</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="glass h-10" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Hasta</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="glass h-10" />
                </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap uppercase tracking-tighter">Modalidad:</Label>
                    <Select value={modality} onValueChange={setModality}>
                    <SelectTrigger className="glass h-9 w-full sm:w-48"><SelectValue /></SelectTrigger>
                    <SelectContent className="glass">
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
                }} className="text-[10px] h-8 font-black uppercase tracking-widest text-primary/70 hover:text-primary">
                    Limpiar Búsqueda
                </Button>
                </div>
            </motion.div>
        )}
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-6 animate-pulse h-20" />
          ))}
        </div>
      ) : scores && scores.length > 0 ? (
        <div className="space-y-4">
          {scores.map((score, i) => (
            <motion.div
              key={score.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass rounded-2xl overflow-hidden border border-white/5 hover:border-primary/20 transition-all shadow-lg active:scale-[0.99]"
            >
              <button
                onClick={() => setExpandedId(expandedId === score.id ? null : score.id)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-white/5 transition-colors relative"
              >
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black border border-primary/20 shadow-inner">
                    {score.total_score >= 300 ? "🎯" : score.total_score.toString().charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight flex flex-wrap items-center gap-2">
                      {score.event_name || "Sesión de Entrenamiento"}
                      {isSuperAdmin && (
                        <Badge variant="outline" className="text-[8px] bg-white/5 px-1.5 h-4 uppercase border-white/10">
                          {score.clubs?.name}
                        </Badge>
                      )}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 font-medium">
                      <span className="flex items-center gap-1.5 text-primary/80">
                        <UserIcon className="h-3 w-3" /> {score.members?.full_name}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="h-3 w-3" /> {new Date(score.score_date).toLocaleDateString("es-CL")}
                      </span>
                      {score.division && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 capitalize font-black">{score.division}</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-3xl font-display font-black text-primary tabular-nums tracking-tighter">{score.total_score}</p>
                    <p className="text-[9px] uppercase text-muted-foreground font-black tracking-[0.2em] -mt-1">Puntos</p>
                  </div>
                  {expandedId === score.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedId === score.id && (
                <div className="bg-black/40 border-t border-white/5 p-4 sm:p-6 animate-in slide-in-from-top duration-300">
                  <div className="max-w-xl mx-auto space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Desglose de rondas</span>
                    </div>

                    <div className="overflow-x-auto pb-2 scrollbar-hide">
                        <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 uppercase tracking-tighter text-muted-foreground text-[10px] font-black">
                            <th className="py-2 px-2 text-left">ROUND</th>
                            {Array.from({ length: 5 }, (_, i) => (
                                <th key={i} className="py-2 px-1 text-center">F{i + 1}</th>
                            ))}
                            <th className="py-2 px-2 text-center text-primary font-black">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {(score.ends as string[][])?.map((end: string[], endIdx: number) => {
                            const arrowVal = (v: string) => v === "X" ? 10 : v === "M" || v === "" ? 0 : Number(v);
                            const total = end.reduce((s, a) => s + arrowVal(a), 0);
                            return (
                                <tr key={endIdx} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 px-2 text-muted-foreground font-black text-[10px]">#{endIdx + 1}</td>
                                {end.map((arrow, j) => (
                                    <td key={j} className="py-2 px-1 text-center">
                                    <span className={cn(
                                        "inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black shadow-sm",
                                        arrow === "X" || arrow === "10" ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/30" :
                                        ["9", "8"].includes(arrow) ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                                        ["7", "6"].includes(arrow) ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                                        arrow === "M" ? "bg-muted/50 text-muted-foreground/50 border border-transparent" : "bg-white/5 text-foreground/70 border border-white/5"
                                    )}>
                                        {arrow || "—"}
                                    </span>
                                    </td>
                                ))}
                                <td className="py-2 px-2 text-center font-black text-foreground bg-primary/10 rounded-lg">{total}</td>
                                </tr>
                            );
                            })}
                        </tbody>
                        </table>
                    </div>

                    {score.detail && (
                      <div className="bg-primary/5 rounded-2xl p-4 text-xs text-muted-foreground border border-primary/10 relative">
                        <Info className="h-4 w-4 text-primary/30 absolute top-3 right-3" />
                        <p className="font-bold uppercase text-[9px] mb-2 tracking-widest text-primary/60">Observaciones</p>
                        <p className="italic leading-relaxed">"{score.detail}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-3xl p-16 text-center space-y-6 border-dashed border-2 border-white/5">
          <Target className="h-16 w-16 mx-auto text-muted-foreground/20 animate-bounce" />
          <div className="space-y-2">
            <p className="text-xl font-bold text-foreground">Sin registros detectados</p>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">No hay puntajes que coincidan con los filtros actuales en el servidor.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => { setStartDate(""); setEndDate(""); setSelectedMemberId("all"); setModality("all"); }} className="rounded-xl px-6">Ver Todo</Button>
            <Link to="/scores/new">
                <Button size="sm" className="rounded-xl px-6">Nuevo Registro</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
