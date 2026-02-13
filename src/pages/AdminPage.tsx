import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Users, Search, Pencil, Trash2, ShieldCheck, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import AddMemberDialog from "@/components/admin/AddMemberDialog";
import EditMemberDialog from "@/components/admin/EditMemberDialog";
import ManageRolesDialog from "@/components/admin/ManageRolesDialog";
import DeleteMemberDialog from "@/components/admin/DeleteMemberDialog";

export default function AdminPage() {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  // Edit/Role/Delete dialogs
  const [editMember, setEditMember] = useState<any>(null);
  const [rolesMember, setRolesMember] = useState<any>(null);
  const [deleteMember, setDeleteMember] = useState<any>(null);

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
        {member && <AddMemberDialog clubId={member.club_id} />}
      </motion.div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar miembros..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Members list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-lg p-4 h-16 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground">
            <div className="col-span-3">Nombre</div>
            <div className="col-span-3">Correo</div>
            <div className="col-span-2">Rol</div>
            <div className="col-span-1">Estado</div>
            <div className="col-span-3 text-right">Acciones</div>
          </div>

          {filtered?.map((m, i) => {
            const roles = (m.member_roles as any[])?.map((r: any) => r.role) || [];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="glass rounded-lg p-4 sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center space-y-2 sm:space-y-0"
              >
                <div className="col-span-3">
                  <p className="font-medium text-foreground">{m.full_name}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm text-muted-foreground truncate">{m.email}</p>
                </div>
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-1">
                    {roles.map((role: string) => (
                      <span key={role} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary capitalize">
                        {role}
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
                <div className="col-span-3 flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => toggleStatus.mutate({ id: m.id, status: m.status as string })}>
                    {m.status === "activo" ? "Desactivar" : "Activar"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditMember(m)}>
                        <Pencil className="h-4 w-4 mr-2" />Editar datos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setRolesMember({ ...m, roles })}>
                        <ShieldCheck className="h-4 w-4 mr-2" />Gestionar roles
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteMember(m)}>
                        <Trash2 className="h-4 w-4 mr-2" />Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            );
          })}

          {filtered?.length === 0 && (
            <div className="glass rounded-xl p-8 text-center">
              <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-muted-foreground">No se encontraron miembros</p>
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <EditMemberDialog
        member={editMember}
        open={!!editMember}
        onOpenChange={(open) => !open && setEditMember(null)}
      />
      {rolesMember && member && (
        <ManageRolesDialog
          memberId={rolesMember.id}
          memberName={rolesMember.full_name}
          clubId={member.club_id}
          currentRoles={rolesMember.roles}
          open={!!rolesMember}
          onOpenChange={(open) => !open && setRolesMember(null)}
        />
      )}
      <DeleteMemberDialog
        memberId={deleteMember?.id ?? null}
        memberName={deleteMember?.full_name ?? ""}
        open={!!deleteMember}
        onOpenChange={(open) => !open && setDeleteMember(null)}
      />
    </div>
  );
}
