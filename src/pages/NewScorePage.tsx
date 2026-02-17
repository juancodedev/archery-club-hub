import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Crosshair } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DivisionSelect from "@/components/scores/DivisionSelect";
import TournamentTypeSelect from "@/components/scores/TournamentTypeSelect";
import { calculateTotalScore, validateArrowValue } from "@/lib/scoringUtils";

function createEmptyEnds(arrowsPerEnd: number, endsCount: number) {
  return Array.from({ length: endsCount }, () => Array(arrowsPerEnd).fill(""));
}

export default function NewScorePage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';

  const navigate = useNavigate();
  const { toast } = useToast();
  const [eventName, setEventName] = useState("");
  const [scoreDate, setScoreDate] = useState(new Date().toISOString().split("T")[0]);
  const [divisionId, setDivisionId] = useState("");
  const [tournamentTypeId, setTournamentTypeId] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);

  // Tournament type configuration
  const [arrowsPerEnd, setArrowsPerEnd] = useState(5);
  const [endsCount, setEndsCount] = useState(6);
  const [isIndoor, setIsIndoor] = useState(false);

  const [ends, setEnds] = useState<string[][]>(createEmptyEnds(5, 6));

  // For SuperAdmin/Admin
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [clubs, setClubs] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.club_id) {
      setSelectedClubId(member.club_id);
      fetchMembers(member.club_id);
    }

    if (member?.id && !isSuperAdmin) {
      setSelectedMemberId(member.id);
    }
  }, [member, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
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
  const handleTournamentTypeChange = (type: any) => {
    if (type) {
      setArrowsPerEnd(type.arrows_per_end);
      setEndsCount(type.ends_per_round);
      setIsIndoor(type.is_indoor);
      // Recreate ends array with new dimensions
      setEnds(createEmptyEnds(type.arrows_per_end, type.ends_per_round));
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
      const { error } = await supabase.from("scores").insert({
        member_id: selectedMemberId,
        club_id: selectedClubId,
        event_name: eventName || "Entrenamiento",
        score_date: scoreDate,
        division_id: divisionId || null,
        tournament_type_id: tournamentTypeId || null,
        detail,
        ends: ends as any,
        total_score: grandTotal,
        x_count: xCount,
      });

      if (error) throw error;
      toast({
        title: "¡Puntaje registrado!",
        description: `Total: ${grandTotal} puntos${xCount > 0 ? ` (${xCount}X)` : ''}`
      });
      navigate("/scores");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Crosshair className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Registrar Puntaje
          </h1>
          <p className="text-sm text-muted-foreground">Ingresa la tarjeta de puntuación</p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {/* Scorecard selection (for owners/trainers) */}
        {(isSuperAdmin || member?.roles?.includes('administrador') || member?.roles?.includes('presidente')) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 sm:p-5">
            <h3 className="font-display font-semibold text-foreground mb-4">Selección de Arquero</h3>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {isSuperAdmin && (
                <div className="space-y-2">
                  <Label>Club</Label>
                  <Select value={selectedClubId} onValueChange={(val) => {
                    setSelectedClubId(val);
                    setSelectedMemberId("");
                    fetchMembers(val);
                  }}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                    <SelectContent>
                      {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Arquero</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar arquero" /></SelectTrigger>
                  <SelectContent>
                    {members.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>
        )}

        {/* Event info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-4 sm:p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Información del Evento</h3>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label>Evento / Entrenamiento</Label>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Entrenamiento libre" />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input type="date" value={scoreDate} onChange={(e) => setScoreDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <DivisionSelect
                value={divisionId}
                onChange={setDivisionId}
                memberId={selectedMemberId}
                placeholder="Recurvo, Compuesto..."
              />
            </div>
            <div className="space-y-2">
              <TournamentTypeSelect
                value={tournamentTypeId}
                onChange={setTournamentTypeId}
                onTypeChange={handleTournamentTypeChange}
                placeholder="Indoor 18m, Outdoor 70m..."
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <Label>Detalle</Label>
              <Input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Notas adicionales..." />
            </div>
          </div>
        </motion.div>

        {/* Scorecard */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-4 sm:p-5 overflow-x-auto">
          <h3 className="font-display font-semibold text-foreground mb-4">Tarjeta de Puntuación</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 px-2 text-left text-muted-foreground font-medium">End</th>
                {Array.from({ length: arrowsPerEnd }, (_, i) => (
                  <th key={i} className="py-2 px-1 text-center text-muted-foreground font-medium">F{i + 1}</th>
                ))}
                <th className="py-2 px-2 text-center text-muted-foreground font-medium">Total</th>
                <th className="py-2 px-2 text-center text-muted-foreground font-medium">Acum.</th>
              </tr>
            </thead>
            <tbody>
              {ends.map((end, endIdx) => (
                <tr key={endIdx} className="border-b border-border/50">
                  <td className="py-2 px-2 font-medium text-foreground">End {endIdx + 1}</td>
                  {end.map((arrow, arrowIdx) => (
                    <td key={arrowIdx} className="py-1 px-1">
                      <Input
                        className="w-12 h-9 text-center text-sm p-0"
                        value={arrow}
                        onChange={(e) => updateArrow(endIdx, arrowIdx, e.target.value)}
                        placeholder="—"
                        maxLength={2}
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center font-semibold text-foreground">{endTotal(end)}</td>
                  <td className="py-2 px-2 text-center font-bold text-primary">{runningTotal(endIdx)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <div className="glass rounded-lg px-6 py-3 text-center">
              <p className="text-xs text-muted-foreground">Total General</p>
              <p className="text-3xl font-display font-bold text-primary">{grandTotal}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => navigate("/scores")} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? "Guardando..." : "Guardar Puntaje"}
          </Button>
        </div>
      </form>
    </div>
  );
}
