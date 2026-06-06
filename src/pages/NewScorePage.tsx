import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Calendar as CalendarIcon, Trophy, Target, Info, User as UserIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DivisionSelect from "@/components/scores/DivisionSelect";
import TournamentTypeSelect from "@/components/scores/TournamentTypeSelect";
import { calculateTotalScore, validateArrowValue } from "@/lib/scoringUtils";
import { cn } from "@/lib/utils";
import type { TournamentType, MemberBasic } from "@/types/archery";
import { TRAINING_PRESETS } from "@/lib/archeryConstants";
import { isReadOnlyMode } from "@/lib/permissions";


function createEmptyEnds(arrowsPerEnd: number, endsCount: number) {
  return Array.from({ length: endsCount }, () => Array(arrowsPerEnd).fill(""));
}

export default function NewScorePage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin ?? false;

  const navigate = useNavigate();
  const { toast } = useToast();
  const [eventName, setEventName] = useState("");
  const [scoreDate, setScoreDate] = useState(new Date().toISOString().split("T")[0]);
  const [divisionId, setDivisionId] = useState("");
  const [tournamentTypeId, setTournamentTypeId] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  // IFAA states
  const [ifaaRound, setIfaaRound] = useState<string | null>(null);
  const [ifaaClass, setIfaaClass] = useState<string>("");
  const [activeEndIdx, setActiveEndIdx] = useState<number>(0);
  const [activeArrowIdx, setActiveArrowIdx] = useState<number>(0);

  // Training session state
  const [trainingSessionId, setTrainingSessionId] = useState<string>(sessionId || "none");
  const [availableSessions, setAvailableSessions] = useState<{ id: string; name: string; event_date: string }[]>([]);

  // Tournament type configuration
  const [arrowsPerEnd, setArrowsPerEnd] = useState(5);
  const [endsCount, setEndsCount] = useState(6);
  const [isIndoor, setIsIndoor] = useState(false);

  const [ends, setEnds] = useState<string[][]>(createEmptyEnds(5, 6));

  // For SuperAdmin/Admin
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const { data: clubs } = useClubs();
  const [members, setMembers] = useState<MemberBasic[]>([]);


  useEffect(() => {
    if (!isSuperAdmin && member?.club_id) {
      setSelectedClubId(member.club_id);
      fetchMembers(member.club_id);
    }

    if (member?.id && !isSuperAdmin) {
      setSelectedMemberId(member.id);
    }
  }, [member, isSuperAdmin]);

  // Load score for edit if editId param is present
  const editId = searchParams.get("editId");
  useEffect(() => {
    if (editId) {
      fetchScoreForEdit(editId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  const fetchScoreForEdit = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("scores")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) {
        setEventName(data.event_name || "");
        setScoreDate(data.score_date);
        setDivisionId(data.division_id || "");
        setTournamentTypeId(data.tournament_type_id || "");
        setDetail(data.detail || "");
        setTrainingSessionId(data.training_session_id || "none");
        setSelectedClubId(data.club_id);
        
        // Fetch members for that club first to populate list
        await fetchMembers(data.club_id);
        setSelectedMemberId(data.member_id);

        if (data.tournament_type_id) {
          const { data: tType } = await supabase
            .from("tournament_types")
            .select("*")
            .eq("id", data.tournament_type_id)
            .single();
          if (tType) {
            setIfaaRound(tType.ifaa_round || null);
            setArrowsPerEnd(tType.arrows_per_end);
            setEndsCount(tType.ends_per_round);
            setIsIndoor(tType.is_indoor);
          }
        }

        if (data.ifaa_class) {
          setIfaaClass(data.ifaa_class);
        }

        if (data.ends) {
          const parsedEnds = data.ends as string[][];
          setEnds(parsedEnds);
          if (parsedEnds.length > 0) {
            setEndsCount(parsedEnds.length);
            setArrowsPerEnd(parsedEnds[0].length);
          }
        }
      }
    } catch (err) {
      toast({
        title: "Error al cargar puntaje",
        description: getSafeErrorMessage(err),
        variant: "destructive"
      });
    }
  };

  // Fetch available sessions for today or recent
  useEffect(() => {
    if (selectedClubId) {
      fetchSessions(selectedClubId);
    }
  }, [selectedClubId]);

  // Fetch session data if sessionId exists
  useEffect(() => {
    if (trainingSessionId && trainingSessionId !== "none" && !editId) {
      fetchSessionDetails(trainingSessionId);
    }
  }, [trainingSessionId, editId]);

  const fetchSessions = async (clubId: string) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("club_id", clubId)
      .gte("event_date", today) // Only today onwards, or we could allow past sessions
      .order("event_date", { ascending: false });
    if (data) setAvailableSessions(data);
  };

  const fetchSessionDetails = async (id: string) => {
    const { data, error } = await supabase
      .from("training_sessions")
      .select("*")
      .eq("id", id)
      .single();

    if (data && !error) {
      setEventName(data.name);
      if (data.division) {
        // Find division id if possible or just store name
        // For now we use the name to pre-fill event name
      }

      if (data.training_type === 'estandar' && data.rounds_config) {
        const rounds = data.rounds_config as { ends: number; arrows: number }[];
        // Calculate total ends and arrows per end
        // Simplification: use the first round's arrows and sum ends
        if (rounds.length > 0) {
          const totalEnds = rounds.reduce((sum, r) => sum + (Number(r.ends) || 0), 0);
          const arrows = Number(rounds[0].arrows) || 5;
          setEndsCount(totalEnds);
          setArrowsPerEnd(arrows);
          setEnds(createEmptyEnds(arrows, totalEnds));
        }
      }
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = TRAINING_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setEventName(preset.name);
      if (preset.rounds && preset.rounds.length > 0) {
        const totalEnds = preset.rounds.reduce((sum, r) => sum + (Number(r.ends) || 0), 0);
        const arrows = Number(preset.rounds[0].arrows) || 5;
        setEndsCount(totalEnds);
        setArrowsPerEnd(arrows);
        setEnds(createEmptyEnds(arrows, totalEnds));
        toast({
          title: "Preset aplicado",
          description: `Configurado para ${preset.name}`
        });
      }
    }
  };

  const fetchMembers = async (clubId: string) => {
    if (!clubId || clubId === "null" || clubId === "00000000-0000-0000-0000-000000000000") return;
    const { data } = await supabase
      .from("members")
      .select("id, full_name")
      .eq("club_id", clubId)
      .order("full_name");
    if (data) setMembers(data);
  };

  // Handle tournament type change
  const handleTournamentTypeChange = (type: TournamentType | null) => {
    if (type) {
      const ifaa = type.ifaa_round || null;
      setIfaaRound(ifaa);
      if (!ifaa) {
        setIfaaClass("");
      }

      // Automatically override layout configuration based on IFAA round rules
      let arrows = type.arrows_per_end;
      const endsVal = type.ends_per_round;

      if (ifaa === 'field' || ifaa === 'hunter' || ifaa === 'field_expert' || ifaa === 'indoor_standard' || ifaa === 'flint_indoor') {
        arrows = 4;
      } else if (ifaa === 'animal_2d' || ifaa === 'animal_3d') {
        arrows = 3;
      } else if (ifaa === '3d_hunting') {
        arrows = 1;
      } else if (ifaa === '3d_standard') {
        arrows = 2;
      }

      setArrowsPerEnd(arrows);
      setEndsCount(endsVal);
      setIsIndoor(type.is_indoor);
      
      // Recreate ends array with new dimensions
      setEnds(createEmptyEnds(arrows, endsVal));
      
      // Reset active cursor selection
      setActiveEndIdx(0);
      setActiveArrowIdx(0);
    } else {
      setIfaaRound(null);
      setIfaaClass("");
      setActiveEndIdx(0);
      setActiveArrowIdx(0);
    }
  };

  const updateArrow = (endIdx: number, arrowIdx: number, value: string) => {
    const v = value.toUpperCase();
    if (!validateArrowValue(v)) return;
    const newEnds = ends.map((end, i) =>
      i === endIdx ? end.map((a, j) => (j === arrowIdx ? v : a)) : end
    );
    setEnds(newEnds);
  };

  // Calculate score using new utilities
  const scoreResult = calculateTotalScore(ends, isIndoor);
  const grandTotal = scoreResult.score;
  const xCount = scoreResult.xCount;

  const endTotal = (end: string[]) => {
    const result = calculateTotalScore([end], isIndoor);
    return result.score;
  };

  const runningTotal = (upTo: number) => {
    const result = calculateTotalScore(ends.slice(0, upTo + 1), isIndoor);
    return result.score;
  };

  // IFAA score input handlers
  const handleIfaaArrowInput = (value: string) => {
    const newEnds = ends.map((end, i) =>
      i === activeEndIdx ? end.map((a, j) => (j === activeArrowIdx ? value : a)) : end
    );
    setEnds(newEnds);

    // Auto-advance logic
    if (activeArrowIdx < arrowsPerEnd - 1) {
      setActiveArrowIdx(activeArrowIdx + 1);
    } else if (activeEndIdx < endsCount - 1) {
      setActiveEndIdx(activeEndIdx + 1);
      setActiveArrowIdx(0);
    }
  };

  const handleAnimalArrowInput = (arrowIdx: number, resultType: "KILL" | "WOUND" | "MISS") => {
    let val = "";
    if (resultType === "KILL") {
      val = arrowIdx === 0 ? "20" : arrowIdx === 1 ? "16" : "12";
    } else if (resultType === "WOUND") {
      val = arrowIdx === 0 ? "18" : arrowIdx === 1 ? "14" : "10";
    } else {
      val = "M";
    }

    const updatedArrows = [...(ends[activeEndIdx] || ["", "", ""])];
    updatedArrows[arrowIdx] = val;

    // If KILL or WOUND, automatically fill the remaining arrows for this target with "" and lock it
    if (resultType === "KILL" || resultType === "WOUND") {
      for (let i = arrowIdx + 1; i < 3; i++) {
        updatedArrows[i] = "";
      }
      const newEnds = ends.map((end, i) => (i === activeEndIdx ? updatedArrows : end));
      setEnds(newEnds);

      // Auto-advance to next target
      if (activeEndIdx < endsCount - 1) {
        setActiveEndIdx(activeEndIdx + 1);
        setActiveArrowIdx(0);
      }
    } else {
      // MISS
      if (arrowIdx === 2) {
        // Last arrow missed -> target done
        const newEnds = ends.map((end, i) => (i === activeEndIdx ? updatedArrows : end));
        setEnds(newEnds);
        if (activeEndIdx < endsCount - 1) {
          setActiveEndIdx(activeEndIdx + 1);
          setActiveArrowIdx(0);
        }
      } else {
        // Wait for next arrow input
        const newEnds = ends.map((end, i) => (i === activeEndIdx ? updatedArrows : end));
        setEnds(newEnds);
        setActiveArrowIdx(arrowIdx + 1);
      }
    }
  };

  const handle3dHuntingInput = (value: string) => {
    const newEnds = ends.map((end, i) => (i === activeEndIdx ? [value] : end));
    setEnds(newEnds);
    if (activeEndIdx < endsCount - 1) {
      setActiveEndIdx(activeEndIdx + 1);
    }
  };

  const handle3dStandardInput = (value: string) => {
    const newEnds = ends.map((end, i) =>
      i === activeEndIdx ? end.map((a, j) => (j === activeArrowIdx ? value : a)) : end
    );
    setEnds(newEnds);
    if (activeArrowIdx === 0) {
      setActiveArrowIdx(1);
    } else {
      setActiveArrowIdx(0);
      if (activeEndIdx < endsCount - 1) {
        setActiveEndIdx(activeEndIdx + 1);
      }
    }
  };

  const resetTarget = (idx: number) => {
    const newEnds = ends.map((end, i) => (i === idx ? Array(arrowsPerEnd).fill("") : end));
    setEnds(newEnds);
    if (idx === activeEndIdx) {
      setActiveArrowIdx(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || selectedMemberId === "null") {
      toast({ title: "Error", description: "Selecciona un arquero", variant: "destructive" });
      return;
    }
    if (!divisionId) {
      toast({ title: "Error", description: "Selecciona una división", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const editId = searchParams.get("editId");
      let error;

      if (editId) {
        const { error: err } = await supabase
          .from("scores")
          .update({
            member_id: selectedMemberId,
            club_id: selectedClubId,
            training_session_id: (trainingSessionId && trainingSessionId !== "none") ? trainingSessionId : null,
            event_name: eventName || "Entrenamiento",
            score_date: scoreDate,
            division_id: divisionId || null,
            tournament_type_id: tournamentTypeId || null,
            detail,
            ends: ends as string[][],
            total_score: grandTotal,
            x_count: xCount,
            ifaa_class: ifaaRound ? ifaaClass || null : null,
          })
          .eq("id", editId);
        error = err;
      } else {
        const { error: err } = await supabase.from("scores").insert({
          member_id: selectedMemberId,
          club_id: selectedClubId,
          training_session_id: (trainingSessionId && trainingSessionId !== "none") ? trainingSessionId : null,
          event_name: eventName || "Entrenamiento",
          score_date: scoreDate,
          division_id: divisionId || null,
          tournament_type_id: tournamentTypeId || null,
          detail,
          ends: ends as string[][],
          total_score: grandTotal,
          x_count: xCount,
          ifaa_class: ifaaRound ? ifaaClass || null : null,
        });
        error = err;
      }

      if (error) throw error;
      toast({
        title: editId ? "¡Puntaje actualizado!" : "¡Puntaje registrado!",
        description: `Total: ${grandTotal} puntos${xCount > 0 ? ` (${xCount}X)` : ''}`
      });
      navigate("/scores");
    } catch (error) {
      toast({ title: "Error", description: getSafeErrorMessage(error), variant: "destructive" });

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
            <Crosshair className="h-7 w-7 text-primary" />
            {searchParams.get("editId") ? "Editar Puntaje" : "Registrar Puntaje"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium italic">
            {searchParams.get("editId") ? "Modifica los datos de tu tarjeta" : '"Ingresa tu tarjeta de rendimiento"'}
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Scorecard selection (for owners/trainers) */}
        {(isSuperAdmin || member?.roles?.includes('administrador') || member?.roles?.includes('presidente')) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-5 border-l-4 border-l-primary">
            <h3 className="font-display font-bold text-foreground flex items-center gap-2 mb-4">
              <UserIcon className="h-4 w-4 text-primary" /> Selección de Arquero
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Club</Label>
                  <Select value={selectedClubId} onValueChange={(val) => {
                    setSelectedClubId(val);
                    setSelectedMemberId("");
                    fetchMembers(val);
                  }}>
                    <SelectTrigger className="glass h-11"><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                    <SelectContent>
                      {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Arquero</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="glass h-11"><SelectValue placeholder="Seleccionar arquero" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Event info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-5 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-3">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">Información del Evento</h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Sesión de Entrenamiento (Opcional)</Label>
              <Select value={trainingSessionId} onValueChange={setTrainingSessionId}>
                <SelectTrigger className="glass h-11 border-primary/20">
                  <SelectValue placeholder="Sin vincular a sesión" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna sesión específica</SelectItem>
                  {availableSessions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({new Date(s.event_date).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label className="text-xs font-bold text-muted-foreground">Evento / Entrenamiento</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Entrenamiento libre..." className="h-11 glass border-primary/10" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Fecha</Label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                <Input type="date" value={scoreDate} onChange={(e) => setScoreDate(e.target.value)} className="h-11 pl-10 glass border-primary/10" />
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Atajos / Presets Estándar</Label>
              <div className="flex flex-wrap gap-2">
                {TRAINING_PRESETS.map(p => (
                  <Button
                    key={p.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="glass border-primary/20 hover:border-primary text-[10px] font-black uppercase tracking-tighter"
                    onClick={() => applyPreset(p.id)}
                  >
                    🎯 {p.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">División / Categoría</Label>
              <DivisionSelect
                value={divisionId}
                onChange={setDivisionId}
                memberId={selectedMemberId}
                placeholder="Recurvo, Compuesto..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Tipo de Torneo</Label>
              <TournamentTypeSelect
                value={tournamentTypeId}
                onChange={setTournamentTypeId}
                onTypeChange={handleTournamentTypeChange}
                placeholder="Indoor 18m, Outdoor 70m..."
              />
            </div>

            {ifaaRound && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Clase IFAA</Label>
                <Select value={ifaaClass} onValueChange={setIfaaClass}>
                  <SelectTrigger className="glass h-11 border-primary/20">
                    <SelectValue placeholder="Seleccionar clase..." />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    <SelectItem value="A">Clase A</SelectItem>
                    <SelectItem value="B">Clase B</SelectItem>
                    <SelectItem value="C">Clase C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 sm:col-span-2 lg:col-span-3">
              <Label className="text-xs font-bold text-muted-foreground">Detalle</Label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Notas adicionales..." className="h-11 glass border-primary/10" />
            </div>
          </div>
        </motion.div>

        {/* Scorecard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-5 sm:p-6 overflow-hidden border-border/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> {ifaaRound ? `Tarjeta IFAA (${ifaaRound.toUpperCase().replace('_', ' ')})` : "Tarjeta de Puntuación"}
            </h3>
            <Badge variant="outline" className="font-mono text-xs border-primary/30">
              {arrowsPerEnd} flechas / {endsCount} rondas
            </Badge>
          </div>

          {ifaaRound ? (
            <div className="space-y-6">
              {/* Quick Target Selector Grid */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Navegar Blancos / Targets</Label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1.5 glass rounded-xl">
                  {ends.map((end, idx) => {
                    const total = endTotal(end);
                    const isCompleted = end.every(a => a !== "");
                    const isActive = idx === activeEndIdx;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveEndIdx(idx);
                          setActiveArrowIdx(0);
                        }}
                        className={cn(
                          "w-11 h-11 rounded-lg flex flex-col items-center justify-center text-xs font-black transition-all relative",
                          isActive
                            ? "bg-primary text-black border-2 border-yellow-500 shadow-md shadow-primary/30 scale-105"
                            : isCompleted
                            ? "bg-green-950/40 border border-green-500/40 text-green-400"
                            : "bg-white/5 border border-border/30 text-muted-foreground hover:bg-white/10"
                        )}
                      >
                        <span className="text-[9px] opacity-75">#{idx + 1}</span>
                        <span className="text-sm tracking-tighter">{total}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Target Card */}
              <div className="glass border border-primary/20 rounded-2xl p-5 space-y-4 bg-gradient-to-b from-primary/5 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-display font-black text-primary">BLANCO #{activeEndIdx + 1}</span>
                    <Badge variant="outline" className="text-xs border-primary/20 font-bold bg-primary/5 text-primary">
                      Total Target: {endTotal(ends[activeEndIdx] || [])} pts
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 text-xs font-bold px-3 py-1 rounded-xl h-8"
                    onClick={() => resetTarget(activeEndIdx)}
                  >
                    🗑️ Limpiar Blanco
                  </Button>
                </div>

                {/* Arrow Slot Displays */}
                <div className="flex gap-3 items-center py-2">
                  {Array.from({ length: arrowsPerEnd }).map((_, aIdx) => {
                    const val = (ends[activeEndIdx] || [])[aIdx];
                    const isActiveSlot = aIdx === activeArrowIdx;

                    return (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => setActiveArrowIdx(aIdx)}
                        className={cn(
                          "w-14 h-14 rounded-full font-black text-xl flex items-center justify-center transition-all border-2",
                          isActiveSlot
                            ? "bg-primary text-black border-yellow-500 shadow-md shadow-primary/30 scale-110"
                            : val !== ""
                            ? "bg-black/35 text-foreground border-primary/40"
                            : "bg-black/20 text-muted-foreground/40 border-dashed border-border/30"
                        )}
                      >
                        {val === "" ? "—" : val}
                      </button>
                    );
                  })}
                </div>

                {/* Polymorphic Input Mechanics */}
                <div className="pt-2">
                  {/* 1. Field / Hunter Layout */}
                  {(ifaaRound === "field" || ifaaRound === "hunter" || ifaaRound === "field_expert" || ifaaRound === "indoor_standard" || ifaaRound === "flint_indoor") && (
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                        Toca el valor de la flecha {activeArrowIdx + 1}:
                      </Label>
                      <div className="grid grid-cols-4 gap-3">
                        {["5", "4", "3", "M"].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleIfaaArrowInput(val)}
                            className={cn(
                              "h-16 rounded-2xl text-2xl font-black transition-all active:scale-95 shadow-lg border-2",
                              val === "M"
                                ? "bg-red-950/40 border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-950/60"
                                : "bg-black/40 border-primary/40 text-foreground hover:border-primary hover:bg-black/60"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Animal 2D / 3D Layout (Sequential Decision Flow) */}
                  {(ifaaRound === "animal_2d" || ifaaRound === "animal_3d") && (
                    <div className="space-y-4">
                      {/* Arrow 1 Decision Block */}
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-muted-foreground block">Flecha 1:</Label>
                        {((ends[activeEndIdx] || [])[0] === "" || (ends[activeEndIdx] || [])[0] === undefined) ? (
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => handleAnimalArrowInput(0, "KILL")}
                              className="h-14 rounded-xl font-bold bg-yellow-950/40 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-950/60 transition-all text-sm uppercase tracking-tighter"
                            >
                              🎯 KILL (+20)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAnimalArrowInput(0, "WOUND")}
                              className="h-14 rounded-xl font-bold bg-green-950/40 border border-green-500/40 text-green-400 hover:bg-green-950/60 transition-all text-sm uppercase tracking-tighter"
                            >
                              WOUND (+18)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAnimalArrowInput(0, "MISS")}
                              className="h-14 rounded-xl font-bold bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-950/60 transition-all text-sm uppercase tracking-tighter"
                            >
                              ❌ MISS
                            </button>
                          </div>
                        ) : (
                          <div className="glass p-3 rounded-xl flex items-center justify-between text-sm text-foreground/80">
                            <span>Flecha 1 registrada: <strong>{ends[activeEndIdx][0] === "M" ? "MISS" : `HIT (+${ends[activeEndIdx][0]})`}</strong></span>
                            {ends[activeEndIdx][0] === "M" ? "⬇️ Siguiente" : "🔒 Blanco Completado"}
                          </div>
                        )}
                      </div>

                      {/* Arrow 2 Decision Block (Conditional) */}
                      {(ends[activeEndIdx] || [])[0] === "M" && (
                        <div className="space-y-2 pt-2 border-t border-border/20">
                          <Label className="text-xs font-bold text-muted-foreground block">Flecha 2:</Label>
                          {((ends[activeEndIdx] || [])[1] === "" || (ends[activeEndIdx] || [])[1] === undefined) ? (
                            <div className="grid grid-cols-3 gap-3">
                              <button
                                type="button"
                                onClick={() => handleAnimalArrowInput(1, "KILL")}
                                className="h-14 rounded-xl font-bold bg-yellow-950/40 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-950/60 transition-all text-sm uppercase tracking-tighter"
                              >
                                🎯 KILL (+16)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnimalArrowInput(1, "WOUND")}
                                className="h-14 rounded-xl font-bold bg-green-950/40 border border-green-500/40 text-green-400 hover:bg-green-950/60 transition-all text-sm uppercase tracking-tighter"
                              >
                                WOUND (+14)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnimalArrowInput(1, "MISS")}
                                className="h-14 rounded-xl font-bold bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-950/60 transition-all text-sm uppercase tracking-tighter"
                              >
                                ❌ MISS
                              </button>
                            </div>
                          ) : (
                            <div className="glass p-3 rounded-xl flex items-center justify-between text-sm text-foreground/80">
                              <span>Flecha 2 registrada: <strong>{ends[activeEndIdx][1] === "M" ? "MISS" : `HIT (+${ends[activeEndIdx][1]})`}</strong></span>
                              {ends[activeEndIdx][1] === "M" ? "⬇️ Siguiente" : "🔒 Blanco Completado"}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Arrow 3 Decision Block (Conditional) */}
                      {(ends[activeEndIdx] || [])[0] === "M" && (ends[activeEndIdx] || [])[1] === "M" && (
                        <div className="space-y-2 pt-2 border-t border-border/20">
                          <Label className="text-xs font-bold text-muted-foreground block">Flecha 3:</Label>
                          {((ends[activeEndIdx] || [])[2] === "" || (ends[activeEndIdx] || [])[2] === undefined) ? (
                            <div className="grid grid-cols-3 gap-3">
                              <button
                                type="button"
                                onClick={() => handleAnimalArrowInput(2, "KILL")}
                                className="h-14 rounded-xl font-bold bg-yellow-950/40 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-950/60 transition-all text-sm uppercase tracking-tighter"
                              >
                                🎯 KILL (+12)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnimalArrowInput(2, "WOUND")}
                                className="h-14 rounded-xl font-bold bg-green-950/40 border border-green-500/40 text-green-400 hover:bg-green-950/60 transition-all text-sm uppercase tracking-tighter"
                              >
                                WOUND (+10)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAnimalArrowInput(2, "MISS")}
                                className="h-14 rounded-xl font-bold bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-950/60 transition-all text-sm uppercase tracking-tighter"
                              >
                                ❌ MISS
                              </button>
                            </div>
                          ) : (
                            <div className="glass p-3 rounded-xl flex items-center justify-between text-sm text-foreground/80">
                              <span>Flecha 3 registrada: <strong>{ends[activeEndIdx][2] === "M" ? "MISS" : `HIT (+${ends[activeEndIdx][2]})`}</strong></span>
                              <span>🔒 Blanco Completado</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. 3D Hunting Layout */}
                  {ifaaRound === "3d_hunting" && (
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                        Resultado del Blanco (1 flecha):
                      </Label>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "KILL", score: "20" },
                          { label: "VITAL", score: "16" },
                          { label: "WOUND", score: "10" },
                          { label: "MISS", score: "M" },
                        ].map(item => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handle3dHuntingInput(item.score)}
                            className={cn(
                              "h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg border-2",
                              item.score === "M"
                                ? "bg-red-950/40 border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-950/60"
                                : "bg-black/40 border-primary/40 text-foreground hover:border-primary hover:bg-black/60"
                            )}
                          >
                            <span className="text-base font-black tracking-tight">{item.label}</span>
                            <span className="text-xs font-bold opacity-75">{item.score === "M" ? "0" : `+${item.score}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. 3D Standard Layout */}
                  {ifaaRound === "3d_standard" && (
                    <div className="space-y-3">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1">
                        Toca el resultado para la flecha {activeArrowIdx + 1}:
                      </Label>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "KILL", score: "10" },
                          { label: "VITAL", score: "8" },
                          { label: "WOUND", score: "5" },
                          { label: "MISS", score: "M" },
                        ].map(item => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => handle3dStandardInput(item.score)}
                            className={cn(
                              "h-16 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg border-2",
                              item.score === "M"
                                ? "bg-red-950/40 border-red-500/40 text-red-400 hover:border-red-500 hover:bg-red-950/60"
                                : "bg-black/40 border-primary/40 text-foreground hover:border-primary hover:bg-black/60"
                            )}
                          >
                            <span className="text-base font-black tracking-tight">{item.label}</span>
                            <span className="text-xs font-bold opacity-75">{item.score === "M" ? "0" : `+${item.score}`}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto pb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border uppercase tracking-widest text-[10px] text-muted-foreground font-bold">
                      <th className="py-3 px-2 text-left">Round</th>
                      {Array.from({ length: arrowsPerEnd }, (_, i) => (
                        <th key={i} className="py-3 px-1 text-center">F{i + 1}</th>
                      ))}
                      <th className="py-3 px-2 text-center text-primary">Total</th>
                      <th className="py-3 px-2 text-center text-primary">Acum.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ends.map((end, endIdx) => (
                      <tr key={endIdx} className="border-b border-border/30 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-2 font-bold text-foreground/70">#{endIdx + 1}</td>
                        {end.map((arrow, arrowIdx) => (
                          <td key={arrowIdx} className="py-1.5 px-1">
                            <Input
                              className="w-12 h-10 text-center font-bold text-base p-0 glass focus:ring-primary/50"
                              value={arrow}
                              onChange={(e) => updateArrow(endIdx, arrowIdx, e.target.value)}
                              placeholder="—"
                              maxLength={2}
                            />
                          </td>
                        ))}
                        <td className="py-3 px-2 text-center font-bold text-foreground bg-primary/5">{endTotal(end)}</td>
                        <td className="py-3 px-2 text-center font-black text-primary bg-primary/10">{runningTotal(endIdx)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Grid View */}
              <div className="md:hidden space-y-4">
                {ends.map((end, endIdx) => (
                  <div key={endIdx} className="p-4 rounded-2xl bg-muted/20 border border-border/50 shadow-inner">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-black text-primary text-xs uppercase tracking-tighter">Round {endIdx + 1}</span>
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase">Parcial</span>
                          <span className="text-sm font-bold text-foreground">{endTotal(end)}</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-muted-foreground uppercase">Acumulado</span>
                          <span className="text-sm font-black text-primary">{runningTotal(endIdx)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {end.map((arrow, arrowIdx) => (
                        <div key={arrowIdx} className="flex-1 min-w-[54px]">
                          <Input
                            className="w-full h-12 text-center font-black text-xl p-0 glass border-primary/20 focus:border-primary shadow-sm"
                            value={arrow}
                            onChange={(e) => updateArrow(endIdx, arrowIdx, e.target.value)}
                            placeholder="—"
                            maxLength={2}
                            inputMode="text"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex justify-end">
            <div className="glass rounded-3xl px-8 py-5 text-center border-primary/20 shadow-2xl shadow-primary/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-primary/5 group-hover:bg-primary/10 transition-colors" />
              <div className="relative">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-1">Puntaje Total</p>
                <div className="flex items-center justify-center gap-3">
                  <Trophy className="h-6 w-6 text-yellow-500 animate-pulse" />
                  <p className="text-5xl font-display font-black text-primary tabular-nums tracking-tighter">{grandTotal}</p>
                  {xCount > 0 && (
                    <span className="text-xl font-bold text-yellow-500/80">({xCount}X)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pt-4">
          <Button type="button" variant="ghost" onClick={() => navigate("/scores")} className="h-12 w-full sm:w-auto font-bold rounded-xl">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || isReadOnlyMode(member)} className="h-12 w-full sm:w-80 font-bold rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-all">
            {loading ? "Sincronizando..." : isReadOnlyMode(member) ? "Modo Lectura (Suscripción Vencida)" : searchParams.get("editId") ? "Guardar Cambios" : "Guardar Puntaje en la Nube"}
          </Button>
        </div>
      </form>
    </div>
  );
}
