import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Users, User as UserIcon } from "lucide-react";

export interface TrainingEnrollment {
  id: string;
  member_id: string;
  attended: boolean;
  members?: { full_name?: string };
}

interface TrainingEnrollmentPanelProps {
  sessionId: string;
  enrollments: TrainingEnrollment[];
  isAdmin: boolean;
}

export default function TrainingEnrollmentPanel({
  enrollments,
  isAdmin,
}: TrainingEnrollmentPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleAttendance = useMutation({
    mutationFn: async ({
      enrollmentId,
      currentStatus,
    }: {
      enrollmentId: string;
      currentStatus: boolean;
    }) => {
      const { error } = await supabase
        .from("training_enrollments")
        .update({ attended: !currentStatus })
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Asistencia actualizada" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!isAdmin || enrollments.length === 0) return null;

  return (
    <div className="pt-4 border-t border-border/50">
      <p className="text-[9px] uppercase font-black tracking-[0.2em] text-muted-foreground mb-3 px-1 flex items-center gap-2">
        <Users className="h-3 w-3" /> Miembros Inscritos
      </p>
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 text-left">
        {enrollments.map((e) => (
          <button
            key={e.id}
            disabled={toggleAttendance.isPending}
            onClick={() =>
              toggleAttendance.mutate({
                enrollmentId: e.id,
                currentStatus: e.attended,
              })
            }
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-2xl border transition-all relative group",
              e.attended
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-muted/30 border-transparent hover:bg-muted/50"
            )}
          >
            <div
              className={cn(
                "h-1.5 w-1.5 rounded-full absolute top-2 right-2",
                e.attended
                  ? "bg-emerald-500 animate-pulse"
                  : "bg-muted-foreground/20"
              )}
            />
            <div
              className={cn(
                "h-8 w-8 rounded-full mb-1.5 flex items-center justify-center border transition-colors",
                e.attended
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-500"
                  : "bg-background/50 border-border text-muted-foreground"
              )}
            >
              <UserIcon className="h-4 w-4" />
            </div>
            <span
              className={cn(
                "text-[10px] font-bold truncate w-full text-center px-1",
                e.attended ? "text-emerald-600" : "text-muted-foreground"
              )}
            >
              {e.members?.full_name?.split(" ")[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
