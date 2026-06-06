import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History, Target, ChevronDown, ChevronUp, Filter, User as UserIcon, Calendar as CalendarIcon, Info, Edit, Trash2, Printer, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MemberBasic } from "@/types/archery";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import ConfirmDialog from "@/components/ui/confirm-dialog";


interface Score {
  id: string;
  member_id: string;
  club_id: string;
  total_score: number;
  event_name: string | null;
  score_date: string;
  division: string | null;
  ends: string[][] | null;
  detail: string | null;
  members: { full_name: string; identification: string | null } | null;
  clubs: { name: string } | null;
  division_id?: string | null;
  tournament_type_id?: string | null;
  ifaa_class?: string | null;
  divisions?: { name: string; abbreviation: string } | null;
  tournament_types?: { name: string; ends_per_round: number; arrows_per_end: number; is_indoor: boolean; ifaa_round: string | null } | null;
}

export default function ScoresPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin ?? false;
  const isAdmin = member?.roles?.includes("administrador") || member?.roles?.includes("presidente") || member?.roles?.includes("entrenador");

  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [modality, setModality] = useState("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const { data: clubs } = useClubs();
  const [membersList, setMembersList] = useState<MemberBasic[]>([]);
  const [activeExportScore, setActiveExportScore] = useState<Score | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDeleteScore = async (scoreId: string) => {
    try {
      const { error } = await supabase.from("scores").delete().eq("id", scoreId);
      if (error) throw error;
      toast.success("Registro eliminado correctamente");
      queryClient.invalidateQueries({ queryKey: ["all-scores"] });
    } catch (err) {
      toast.error("Error al eliminar el registro: " + getSafeErrorMessage(err));
    }
  };

  const canManage = (score: Score) => {
    return isSuperAdmin || isAdmin || score.member_id === member?.id;
  };

  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      generatePDF(html2pdf);
    } catch (err) {
      toast.error("Error al cargar la librería de PDF");
    } finally {
      setDownloadingPDF(false);
    }
  };

  const generatePDF = (html2pdf: any) => {
    const element = document.querySelector(".print-scorecard") as HTMLElement;
    if (!element) {
      toast.error("No se encontró el elemento de la ficha");
      return;
    }

    // Save current scroll position to restore it later
    const currentScrollY = window.scrollY;

    // Temporarily scroll to top so html2canvas matches absolute coordinate layout exactly
    window.scrollTo(0, 0);

    const opt = {
      margin:       0.25,
      filename:     `Ficha_IFAA_${activeExportScore?.members?.full_name?.replace(/\s+/g, "_") || "arquero"}_${activeExportScore?.score_date || "fecha"}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        logging: false
      },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    toast.info("Generando PDF...");

    // Wait a brief tick (150ms) for browser layout to settle at top-scroll before rendering
    setTimeout(() => {
      html2pdf().from(element).set(opt).save().then(() => {
        // Restore scroll position
        window.scrollTo(0, currentScrollY);
        toast.success("¡Ficha PDF generada y descargada!");
      }).catch((err: any) => {
        // Restore scroll position even on error
        window.scrollTo(0, currentScrollY);
        console.error(err);
        toast.error("Error al exportar PDF: " + err.message);
      });
    }, 150);
  };


  useEffect(() => {
    if (!isSuperAdmin && member?.club_id && !selectedClubId) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin, selectedClubId]);

  useEffect(() => {
    if (selectedClubId && (isAdmin || isSuperAdmin)) {
      fetchMembers(selectedClubId);
    }
  }, [selectedClubId, isAdmin, isSuperAdmin]);

  const fetchMembers = async (clubId: string) => {
    const { data } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("club_id", clubId)
      .order("full_name");
    if (data) setMembersList(data as unknown as MemberBasic[]);
  };

  const { data: scores, isLoading } = useQuery<Score[]>({
    queryKey: ["all-scores", selectedClubId, selectedMemberId, startDate, endDate, modality],
    queryFn: async () => {
      let query = supabase.from("scores").select(`
        *,
        members(full_name, identification),
        clubs(name),
        divisions(name, abbreviation),
        tournament_types(name, ends_per_round, arrows_per_end, is_indoor, ifaa_round)
      `);

      if (isSuperAdmin) {
        if (selectedClubId && selectedClubId !== "all") {
          query = query.eq("club_id", selectedClubId);
        }
      } else {
        query = query.eq("club_id", member?.club_id || "");
      }

      if (selectedMemberId !== "all") {
        query = query.eq("member_id", selectedMemberId);
      } else if (!isAdmin && !isSuperAdmin) {
        query = query.eq("member_id", member?.id || "");
      }

      if (startDate) query = query.gte("score_date", startDate);
      if (endDate) query = query.lte("score_date", endDate);

      // Filter by modality if applicable. Since this might involve a join not explicitly typed in standard supabase client, 
      // we use unknown cast to allow the eq check if the column exists in the joined table.
      if (modality !== "all") {
        query = (query as unknown as { eq: (col: string, val: string) => typeof query }).eq("tournament_types.discipline", modality);
      }

      const { data, error } = await query.order("score_date", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Score[];
    },
    enabled: !!member,
  });

  const scoresListRef = useRef<HTMLDivElement>(null);

  const scoresVirtualizer = useVirtualizer({
    count: scores?.length ?? 0,
    getScrollElement: () => scoresListRef.current,
    estimateSize: () => 90,
    getItemKey: (index) => scores?.[index]?.id ?? index,
  });

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Rendimiento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSuperAdmin && selectedClubId !== "all" ? `${clubs?.find(c => c.id === selectedClubId)?.name} • ` : ""}
            Historial de puntajes de los arqueros
          </p>
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
                      {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap uppercase tracking-tighter">Disciplina:</Label>
                <Select value={modality} onValueChange={setModality}>
                  <SelectTrigger className="glass h-9 w-full sm:w-56"><SelectValue /></SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="all">Todas las disciplinas</SelectItem>
                    <SelectItem value="outdoor">🎯 Aire Libre (Outdoor)</SelectItem>
                    <SelectItem value="indoor">🏠 Sala (Indoor)</SelectItem>
                    <SelectItem value="campo">🌲 Tiro de Campo (Field)</SelectItem>
                    <SelectItem value="3d">🐗 3D</SelectItem>
                    <SelectItem value="recurvo">Recurvo</SelectItem>
                    <SelectItem value="compuesto">Compuesto</SelectItem>
                    <SelectItem value="barebow">Barebow</SelectItem>
                    <SelectItem value="longbow">Longbow</SelectItem>
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
        <div ref={scoresListRef} style={{ height: 'calc(100vh - 300px)', minHeight: '400px', overflowY: 'auto' }}>
          <div style={{ position: 'relative', height: `${scoresVirtualizer.getTotalSize()}px` }}>
            {scoresVirtualizer.getVirtualItems().map((virtualItem) => {
              const score = scores![virtualItem.index];
              return (
                <div
                  key={score.id}
                  className="absolute top-0 left-0 w-full"
                  style={{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: '16px',
                  }}
                >
                  <div
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

                    <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 justify-end">
                      <Button
                        onClick={() => setActiveExportScore(score)}
                        className="gap-2 text-xs font-black uppercase tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-9 px-4 shadow-lg shadow-emerald-500/20"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Exportar Tarjeta IFAA
                      </Button>
                      
                      {canManage(score) && (
                        <>
                          <Link to={`/scores/new?editId=${score.id}`}>
                            <Button
                              variant="outline"
                              className="gap-2 text-xs font-black uppercase tracking-widest border-white/10 hover:border-primary/50 text-foreground glass rounded-xl h-9 px-4"
                            >
                              <Edit className="h-3.5 w-3.5 text-primary" />
                              Editar
                            </Button>
                          </Link>
                          
                          <Button
                            onClick={() => setDeleteTargetId(score.id)}
                            variant="destructive"
                            className="gap-2 text-xs font-black uppercase tracking-widest rounded-xl h-9 px-4 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
                  </div>
                </div>
              );
            })}
          </div>
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

      {/* IFAA SCORECARD EXPORT MODAL */}
      {activeExportScore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm no-print overflow-y-auto animate-in fade-in duration-200">
          <div className="glass w-full max-w-4xl rounded-3xl border border-white/10 p-6 sm:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveExportScore(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-white/5 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
                  <Printer className="h-5 w-5 text-primary animate-pulse" /> Vista de Exportación
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Generación oficial de ficha de puntaje IFAA</p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={() => setActiveExportScore(null)}
                  className="flex-1 sm:flex-initial h-10 font-bold rounded-xl border-white/10"
                >
                  Cerrar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial h-10 font-bold rounded-xl border-white/10 text-foreground hover:bg-white/5 gap-2"
                >
                  <Printer className="h-4 w-4 text-primary" />
                  Imprimir Físico
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF}
                  className="flex-1 sm:flex-initial h-10 font-bold rounded-xl bg-primary hover:bg-primary/90 text-black shadow-lg shadow-primary/20 gap-2"
                >
                  {downloadingPDF ? "Cargando motor..." : "Generar y Descargar PDF"}
                </Button>
              </div>
            </div>

            {/* PRINT CONTAINER */}
            <div className="print-scorecard bg-white text-black p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-xl space-y-6 font-sans">
              <style>{`
                @media print {
                  body * {
                    visibility: hidden;
                  }
                  .print-scorecard, .print-scorecard * {
                    visibility: visible;
                  }
                  .print-scorecard {
                    position: absolute;
                    left: 0;
                    top: 0;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 1.5cm !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: white !important;
                    color: black !important;
                  }
                }
              `}</style>

              <div className="border-4 border-black p-4 space-y-4">
                <div className="grid grid-cols-12 gap-4 items-center border-b-2 border-black pb-4">
                  {/* Left Logo */}
                  <div className="col-span-3 flex flex-col items-center justify-center border-r-2 border-black pr-2">
                    <svg className="w-16 h-16 text-yellow-600 font-bold" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="50,5 95,85 5,85" stroke="red" strokeWidth="4" fill="yellow" />
                      <circle cx="50" cy="55" r="18" fill="white" stroke="blue" strokeWidth="2" />
                      <path d="M 50,55 L 50,37 M 50,55 L 65,65 M 50,55 L 35,65" stroke="black" strokeWidth="3" />
                      <text x="50" y="58" fontSize="10" fontWeight="black" textAnchor="middle" fill="blue">IFAA</text>
                    </svg>
                    <span className="text-[7px] text-center font-black uppercase text-red-600 tracking-tighter mt-1">
                      Field Archery Assoc.
                    </span>
                  </div>

                  {/* Center Metadata Banner */}
                  <div className="col-span-6 text-center space-y-2 px-2">
                    <div className="bg-[#4a90e2] text-white py-1.5 px-4 rounded-sm font-sans font-black text-lg tracking-wider uppercase border border-black shadow-sm">
                      {activeExportScore.event_name || "SESIÓN DE ENTRENAMIENTO"}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-left mt-2">
                      <div className="border border-black p-1 rounded-sm">
                        <span className="text-[7px] font-black uppercase block text-gray-500">Name:</span>
                        <span className="text-xs font-bold uppercase">{activeExportScore.members?.full_name}</span>
                      </div>
                      <div className="border border-black p-1 rounded-sm">
                        <span className="text-[7px] font-black uppercase block text-gray-500">Registration No.:</span>
                        <span className="text-xs font-mono font-bold uppercase">
                          {activeExportScore.members?.identification || "N/A"}
                        </span>
                      </div>
                      <div className="border border-black p-1 rounded-sm">
                        <span className="text-[7px] font-black uppercase block text-gray-500">Style:</span>
                        <span className="text-xs font-bold uppercase">
                          {activeExportScore.divisions?.abbreviation || activeExportScore.division || "N/A"}
                        </span>
                      </div>
                      <div className="border border-black p-1 rounded-sm">
                        <span className="text-[7px] font-black uppercase block text-gray-500">Date:</span>
                        <span className="text-xs font-bold uppercase">
                          {new Date(activeExportScore.score_date).toLocaleDateString("es-CL")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Logo */}
                  <div className="col-span-3 flex flex-col items-center justify-center border-l-2 border-black pl-2">
                    <svg className="w-16 h-16 text-blue-800" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="50" cy="50" r="40" stroke="blue" strokeWidth="3" />
                      <path d="M 50,10 A 30,30 0 0,0 20,40 L 80,40 A 30,30 0 0,0 50,10 Z" fill="blue" opacity="0.1" />
                      <path d="M 50,25 C 45,25 35,35 35,45 C 35,55 45,65 50,75 C 55,65 65,55 65,45 C 65,35 55,25 50,25 Z" stroke="blue" strokeWidth="3" />
                      <text x="50" y="47" fontSize="8" fontWeight="bold" textAnchor="middle" fill="blue">WFAA</text>
                    </svg>
                    <span className="text-[7px] text-center font-black uppercase text-blue-900 tracking-tighter mt-1">
                      World Family of Archers
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                  <div className="border border-black p-2 rounded-sm bg-gray-50">
                    <span className="text-[8px] font-black uppercase block text-gray-500">Round:</span>
                    <span className="text-sm font-black italic uppercase text-blue-900">
                      {activeExportScore.tournament_types?.name || "Sin Especificar"}
                    </span>
                  </div>
                  <div className="border border-black p-2 rounded-sm bg-gray-50">
                    <span className="text-[8px] font-black uppercase block text-gray-500">Range name:</span>
                    <span className="text-sm font-black uppercase">
                      {activeExportScore.clubs?.name || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="pt-2">
                  {(() => {
                    const ends = activeExportScore.ends as string[][];
                    if (!ends || ends.length === 0) return null;

                    const arrowVal = (v: string) => {
                      if (v === "X") return 10;
                      if (v === "M" || v === "" || v === "0") return 0;
                      return Number(v) || 0;
                    };

                    let cumulativeScore = 0;
                    const endTotals = ends.map((end: string[]) => {
                      const endSum = end.reduce((s, a) => s + arrowVal(a), 0);
                      cumulativeScore += endSum;
                      return { endSum, cumulativeScore };
                    });

                    const endsCount = ends.length;
                    const maxArrows = ends[0]?.length || 4;

                    if (endsCount > 10) {
                      const half = Math.ceil(endsCount / 2);
                      const renderTable = (startIdx: number, endIdx: number, unitName: string) => (
                        <div className="flex-1 border border-black">
                          <div className="bg-gray-100 text-center font-black uppercase text-[9px] py-1 border-b border-black">
                            {unitName}
                          </div>
                          <table className="w-full text-xs font-sans text-center border-collapse">
                            <thead>
                              <tr className="border-b border-black text-[8px] font-black uppercase">
                                <th className="py-1 px-1 border-r border-black w-8">Target</th>
                                <th className="py-1 px-1 border-r border-black" colSpan={maxArrows}>Arrows</th>
                                <th className="py-1 px-1 w-12">Running</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: endIdx - startIdx }).map((_, localIdx) => {
                                const actualIdx = startIdx + localIdx;
                                if (actualIdx >= endsCount) return null;
                                const end = ends[actualIdx];
                                const { cumulativeScore } = endTotals[actualIdx];

                                return (
                                  <tr key={actualIdx} className="border-b border-black font-bold h-7">
                                    <td className="border-r border-black font-black bg-gray-50 text-[9px]">#{actualIdx + 1}</td>
                                    {Array.from({ length: maxArrows }).map((_, arrowIdx) => {
                                      const arrow = end[arrowIdx] || "";
                                      return (
                                        <td key={arrowIdx} className="border-r border-black w-6 text-center text-xs font-black">
                                          {arrow || "—"}
                                        </td>
                                      );
                                    })}
                                    <td className="text-center font-black bg-yellow-50/50 tabular-nums">{cumulativeScore}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );

                      return (
                        <div className="flex flex-col sm:flex-row gap-4">
                          {renderTable(0, half, "Standard Unit 1")}
                          {renderTable(half, endsCount, "Standard Unit 2")}
                        </div>
                      );
                    } else {
                      return (
                        <div className="border border-black rounded-sm overflow-hidden">
                          <table className="w-full text-xs font-sans text-center border-collapse">
                            <thead>
                              <tr className="bg-gray-100 border-b border-black text-[9px] font-black uppercase">
                                <th className="py-1.5 px-2 border-r border-black w-10">Target</th>
                                {Array.from({ length: maxArrows }).map((_, arrowIdx) => (
                                  <th key={arrowIdx} className="py-1.5 px-1 border-r border-black">Arrow {arrowIdx + 1}</th>
                                ))}
                                <th className="py-1.5 px-2 border-r border-black w-16">End Sum</th>
                                <th className="py-1.5 px-2 w-16">Running</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ends.map((end, endIdx) => {
                                const { endSum, cumulativeScore } = endTotals[endIdx];
                                return (
                                  <tr key={endIdx} className="border-b border-black font-bold h-8">
                                    <td className="border-r border-black font-black bg-gray-50">#{endIdx + 1}</td>
                                    {Array.from({ length: maxArrows }).map((_, arrowIdx) => {
                                      const arrow = end[arrowIdx] || "";
                                      return (
                                        <td key={arrowIdx} className="border-r border-black w-10 text-center text-xs font-black">
                                          {arrow || "—"}
                                        </td>
                                      );
                                    })}
                                    <td className="border-r border-black text-center font-black bg-gray-50/50">{endSum}</td>
                                    <td className="text-center font-black bg-yellow-50/50 tabular-nums">{cumulativeScore}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className="grid grid-cols-12 gap-4 items-center border-t-2 border-black pt-4">
                  <div className="col-span-4 border border-black p-2 text-center rounded-sm bg-gray-50">
                    <span className="text-[9px] font-black uppercase block text-gray-500">Puntaje Total</span>
                    <span className="text-2xl font-black text-blue-900 tabular-nums">{activeExportScore.total_score}</span>
                  </div>
                  <div className="col-span-4 border border-black p-2 text-center rounded-sm">
                    <span className="text-[7px] font-black uppercase block text-gray-400 mb-4">Firma del Arquero</span>
                    <div className="border-b border-gray-400 w-full mx-auto"></div>
                  </div>
                  <div className="col-span-4 border border-black p-2 text-center rounded-sm">
                    <span className="text-[7px] font-black uppercase block text-gray-400 mb-4">Firma del Anotador</span>
                    <div className="border-b border-gray-400 w-full mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!deleteTargetId}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Eliminar registro"
        description="¿Estás seguro de que deseas eliminar este registro de entrenamiento/puntaje? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (deleteTargetId) {
            handleDeleteScore(deleteTargetId);
            setDeleteTargetId(null);
          }
        }}
      />
    </div>
  );
}
