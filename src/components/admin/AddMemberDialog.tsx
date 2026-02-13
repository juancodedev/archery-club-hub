import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  clubId: string;
}

export default function AddMemberDialog({ clubId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identification, setIdentification] = useState("");
  const [role, setRole] = useState<string>("arquero");

  const addMember = useMutation({
    mutationFn: async () => {
      const { data: newMember, error } = await supabase
        .from("members")
        .insert({ club_id: clubId, full_name: name, email, phone, identification, status: "activo" as any })
        .select()
        .single();
      if (error) throw error;

      const { error: roleError } = await supabase
        .from("member_roles")
        .insert({ member_id: newMember.id, club_id: clubId, role: role as any });
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      toast({ title: "Miembro agregado" });
      setOpen(false);
      setName(""); setEmail(""); setPhone(""); setIdentification(""); setRole("arquero");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><UserPlus className="h-4 w-4" />Agregar Miembro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Nuevo Miembro</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label>Nombre completo</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Correo electrónico</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Identificación</Label>
            <Input value={identification} onChange={(e) => setIdentification(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="arquero">Arquero</SelectItem>
                <SelectItem value="socio">Socio</SelectItem>
                <SelectItem value="entrenador">Entrenador</SelectItem>
                <SelectItem value="presidente">Presidente</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={addMember.isPending}>
            {addMember.isPending ? "Agregando..." : "Agregar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
