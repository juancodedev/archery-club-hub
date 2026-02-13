import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const ALL_ROLES = ["arquero", "socio", "entrenador", "presidente", "administrador"] as const;
const ROLE_LABELS: Record<string, string> = {
  arquero: "Arquero",
  socio: "Socio",
  entrenador: "Entrenador",
  presidente: "Presidente",
  administrador: "Administrador",
};

interface Props {
  memberId: string | null;
  memberName: string;
  clubId: string;
  currentRoles: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ManageRolesDialog({ memberId, memberName, clubId, currentRoles, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set(currentRoles));
  }, [currentRoles, open]);

  const toggle = (role: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role); else next.add(role);
      return next;
    });
  };

  const saveRoles = useMutation({
    mutationFn: async () => {
      if (!memberId) return;
      const toAdd = [...selected].filter((r) => !currentRoles.includes(r));
      const toRemove = currentRoles.filter((r) => !selected.has(r));

      for (const role of toRemove) {
        const { error } = await supabase
          .from("member_roles")
          .delete()
          .eq("member_id", memberId)
          .eq("club_id", clubId)
          .eq("role", role as any);
        if (error) throw error;
      }
      for (const role of toAdd) {
        const { error } = await supabase
          .from("member_roles")
          .insert({ member_id: memberId, club_id: clubId, role: role as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      toast({ title: "Roles actualizados" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Roles de {memberName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {ALL_ROLES.map((role) => (
            <div key={role} className="flex items-center gap-3">
              <Checkbox
                id={`role-${role}`}
                checked={selected.has(role)}
                onCheckedChange={() => toggle(role)}
              />
              <Label htmlFor={`role-${role}`} className="cursor-pointer">{ROLE_LABELS[role]}</Label>
            </div>
          ))}
        </div>
        <Button
          className="w-full mt-4"
          onClick={() => saveRoles.mutate()}
          disabled={saveRoles.isPending || selected.size === 0}
        >
          {saveRoles.isPending ? "Guardando..." : "Guardar roles"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
