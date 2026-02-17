import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Users, Search, Pencil, Trash2, ShieldCheck, MoreHorizontal, History } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddMemberDialog from "@/components/admin/AddMemberDialog";
import InviteMemberDialog from "@/components/admin/InviteMemberDialog";
import EditMemberDialog from "@/components/admin/EditMemberDialog";
import ManageRolesDialog from "@/components/admin/ManageRolesDialog";
import DeleteMemberDialog from "@/components/admin/DeleteMemberDialog";
import MemberScoreHistoryDialog from "@/components/admin/MemberScoreHistoryDialog";

export default function AdminPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<any[]>([]);

  // Edit/Role/Delete dialogs
  const [editMember, setEditMember] = useState<any>(null);
  const [rolesMember, setRolesMember] = useState<any>(null);
  const [deleteMember, setDeleteMember] = useState<any>(null);
  const [historyMember, setHistoryMember] = useState<any>(null);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.club_id) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const { data: members, isLoading } = useQuery({
    queryKey: ["club-members", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return [];
      const { data } = await supabase
        .from("members")
        .select("*, member_roles(role)")
        .eq("club_id", selectedClubId)
        .order("full_name");
      return data || [];
    },
    enabled: !!selectedClubId,
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
    <div className="space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              Gestión de Miembros
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Administra los miembros y colaboradores de tu club</p>
          </div>

          <div className="flex gap-2">
            {selectedClubId && <InviteMemberDialog clubId={selectedClubId} />}
            {selectedClubId && <AddMemberDialog clubId={selectedClubId} />}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:max-w-xs">
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
              <SelectContent>
                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-10" placeholder="Buscar miembros..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Members table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-lg p-3 sm:p-4 h-16 animate-pulse" />)}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden border border-border/50">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="font-bold text-foreground">Nombre</TableHead>
                  <TableHead className="font-bold text-foreground">Identificación</TableHead>
                  <TableHead className="font-bold text-foreground">Correo</TableHead>
                  <TableHead className="font-bold text-foreground">Teléfono</TableHead>
                  <TableHead className="font-bold text-foreground">Rol</TableHead>
                  <TableHead className="font-bold text-foreground">Estado</TableHead>
                  <TableHead className="font-bold text-foreground">Ingreso</TableHead>
                  <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map((m) => {
                  const roles = (m.member_roles as any[])?.map((r: any) => r.role) || [];
                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 border-border/30 transition-colors">
                      <TableCell className="font-medium text-foreground whitespace-nowrap">
                        {m.full_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {m.identification || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {m.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {m.phone || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {roles.map((role: string) => (
                            <Badge key={role} variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.status === "activo" ? "default" : "destructive"} className="capitalize">
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {m.enrollment_date ? new Date(m.enrollment_date).toLocaleDateString("es-CL") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col xs:flex-row justify-end gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs w-full xs:w-auto"
                            onClick={() => toggleStatus.mutate({ id: m.id, status: m.status as string })}
                          >
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
                              <DropdownMenuItem onClick={() => setHistoryMember(m)}>
                                <History className="h-4 w-4 mr-2" />Ver historial de puntajes
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteMember(m)}>
                                <Trash2 className="h-4 w-4 mr-2" />Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filtered?.length === 0 && (
            <div className="p-8 text-center bg-muted/10">
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
      {rolesMember && selectedClubId && (
        <ManageRolesDialog
          memberId={rolesMember.id}
          memberName={rolesMember.full_name}
          clubId={selectedClubId}
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
      <MemberScoreHistoryDialog
        memberId={historyMember?.id ?? null}
        memberName={historyMember?.full_name ?? ""}
        open={!!historyMember}
        onOpenChange={(open) => !open && setHistoryMember(null)}
      />
    </div>
  );
}
