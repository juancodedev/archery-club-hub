import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  memberId: string | null;
  memberName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteMemberDialog({ memberId, memberName, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMember = useMutation({
    mutationFn: async () => {
      if (!memberId) return;
      // Delete roles first, then member
      await supabase.from("member_roles").delete().eq("member_id", memberId);
      const { error } = await supabase.from("members").delete().eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      toast({ title: "Miembro eliminado" });
      onOpenChange(false);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar miembro?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente a <strong>{memberName}</strong> y todos sus datos asociados. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMember.mutate()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMember.isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
