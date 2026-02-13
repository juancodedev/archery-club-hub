import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { History, Target, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ScoresPage() {
  const { member } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: scores, isLoading } = useQuery({
    queryKey: ["all-scores", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("scores")
        .select("*")
        .eq("member_id", member.id)
        .order("score_date", { ascending: false });
      return data || [];
    },
    enabled: !!member,
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Historial de Puntajes
          </h1>
          <p className="text-muted-foreground">Todos tus registros de entrenamiento</p>
        </div>
        <Link to="/scores/new">
          <Button className="gap-2">
            <Target className="h-4 w-4" />
            Nuevo
          </Button>
        </Link>
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
              className="glass rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(expandedId === score.id ? null : score.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{score.event_name || "Entrenamiento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(score.score_date).toLocaleDateString("es-CL")}
                    {score.division && ` • ${score.division}`}
                    {score.target_type && ` • ${score.target_type}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-xl font-display font-bold text-primary">{score.total_score}</p>
                    <p className="text-xs text-muted-foreground">pts</p>
                  </div>
                  {expandedId === score.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expandedId === score.id && (
                <div className="border-t border-border p-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-1 px-2 text-left text-muted-foreground text-xs">End</th>
                        {Array.from({ length: 5 }, (_, i) => (
                          <th key={i} className="py-1 px-1 text-center text-muted-foreground text-xs">F{i + 1}</th>
                        ))}
                        <th className="py-1 px-2 text-center text-muted-foreground text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(score.ends as string[][])?.map((end: string[], endIdx: number) => {
                        const arrowVal = (v: string) => v === "X" ? 10 : v === "M" || v === "" ? 0 : Number(v);
                        const total = end.reduce((s, a) => s + arrowVal(a), 0);
                        return (
                          <tr key={endIdx} className="border-b border-border/30">
                            <td className="py-1 px-2 text-foreground font-medium">End {endIdx + 1}</td>
                            {end.map((arrow, j) => (
                              <td key={j} className="py-1 px-1 text-center text-foreground">{arrow || "—"}</td>
                            ))}
                            <td className="py-1 px-2 text-center font-semibold text-foreground">{total}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {score.detail && (
                    <p className="mt-2 text-xs text-muted-foreground">{score.detail}</p>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl p-8 text-center">
          <Target className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-muted-foreground">Sin puntajes registrados</p>
          <Link to="/scores/new">
            <Button variant="outline" size="sm" className="mt-3">Registrar puntaje</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
