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

import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

interface Props {
  clubId: string;
}

export default function AddMemberDialog({ clubId: initialClubId }: Props) {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identification, setIdentification] = useState("");
  const [role, setRole] = useState<string>("arquero");
  const [selectedClubId, setSelectedClubId] = useState(initialClubId);
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin && open) {
      fetchClubs();
    }
  }, [isSuperAdmin, open]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const addMember = useMutation({
    mutationFn: async () => {
      const targetClubId = isSuperAdmin ? selectedClubId : initialClubId;
      if (!targetClubId || targetClubId === "null") throw new Error("Debe seleccionar un club");

      const { data: newMember, error } = await supabase
        .from("members")
        .insert({ club_id: targetClubId, full_name: name, email, phone, identification, status: "activo" as any })
        .select()
        .single();
      if (error) throw error;

      const { error: roleError } = await supabase
        .from("member_roles")
        .insert({ member_id: newMember.id, club_id: targetClubId, role: role as any });
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
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>Club de destino</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                <SelectContent>
                  {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
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
