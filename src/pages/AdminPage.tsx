import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Users, UserPlus, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // New member form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<string>("arquero");

  const { data: members, isLoading } = useQuery({
    queryKey: ["club-members", member?.club_id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("members")
        .select("*, member_roles(role)")
        .eq("club_id", member.club_id)
        .order("full_name");
      return data || [];
    },
    enabled: !!member,
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "activo" ? "inactivo" : "activo";
      const { error } = await supabase.from("members").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      toast({ title: "Estado actualizado" });
    },
  });

  const addMember = useMutation({
    mutationFn: async () => {
      if (!member) throw new Error("No member");
      // Insert member without user_id (they'll link when they register)
      const { data: newMember, error } = await supabase
        .from("members")
        .insert({
          club_id: member.club_id,
          full_name: newName,
          email: newEmail,
          phone: newPhone,
          status: "activo" as any,
        })
        .select()
        .single();
      if (error) throw error;

      // Add role
      const { error: roleError } = await supabase
        .from("member_roles")
        .insert({ member_id: newMember.id, club_id: member.club_id, role: newRole as any });
      if (roleError) throw roleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      toast({ title: "Miembro agregado" });
      setDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setNewRole("arquero");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const filtered = members?.filter((m) =>
    m.full_name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Administración del Club
          </h1>
          <p className="text-muted-foreground">Gestiona los miembros de tu club</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Agregar Miembro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Nuevo Miembro</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMember.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Nombre completo</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Correo electrónico</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newRole} onValueChange={setNewRole}>
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
      </motion.div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Buscar miembros..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-lg p-4 h-16 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Nombre</div>
            <div className="col-span-3">Correo</div>
            <div className="col-span-2">Rol</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-2 text-right">Acciones</div>
          </div>

          {filtered?.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass rounded-lg p-4 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-2 sm:space-y-0"
            >
              <div className="col-span-4">
                <p className="font-medium text-foreground">{m.full_name}</p>
              </div>
              <div className="col-span-3">
                <p className="text-sm text-muted-foreground truncate">{m.email}</p>
              </div>
              <div className="col-span-2">
                <div className="flex flex-wrap gap-1">
                  {(m.member_roles as any[])?.map((r: any) => (
                    <span key={r.role} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
                      {r.role}
                    </span>
                  ))}
                </div>
              </div>
              <div className="col-span-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  m.status === "activo" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}>
                  {m.status}
                </span>
              </div>
              <div className="col-span-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleStatus.mutate({ id: m.id, status: m.status as string })}
                >
                  {m.status === "activo" ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </motion.div>
          ))}

          {filtered?.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No se encontraron miembros</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
