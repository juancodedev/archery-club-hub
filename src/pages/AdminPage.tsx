import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Search, Pencil, Trash2, ShieldCheck, MoreHorizontal, History, Trophy, Wallet, CalendarDays, XCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
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
import MemberDivisionsDialog from "@/components/admin/MemberDivisionsDialog";
import MemberPaymentHistoryDialog from "@/components/admin/MemberPaymentHistoryDialog";
import { calculateFinancialStatus } from "@/lib/membershipUtils";

interface AdminMember {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  club_id: string;
  identification: string | null;
  enrollment_date: string | null;
  member_roles: { role: string }[];
  financialStatus?: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  observations: string | null;
  medical_history?: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  shirt_size: string | null;
  windbreaker_size: string | null;
  display_name: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  guardian_email?: string | null;
  billing_day?: number | null;
  grace_days?: number | null;
  user_id?: string | null;
}

export default function AdminPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);

  // Edit/Role/Delete dialogs
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [rolesMember, setRolesMember] = useState<(AdminMember & { roles: string[] }) | null>(null);
  const [deleteMember, setDeleteMember] = useState<AdminMember | null>(null);
  const [historyMember, setHistoryMember] = useState<AdminMember | null>(null);
  const [paymentsMember, setPaymentsMember] = useState<AdminMember | null>(null);
  const [divisionsMember, setDivisionsMember] = useState<AdminMember | null>(null);

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
      const { data, error } = await supabase
        .from("members")
        .select("*, member_roles(role)")
        .eq("club_id", selectedClubId)
        .order("full_name");

      if (error) throw error;

      const { data: allPayments } = await supabase
        .from("financial_entries")
        .select("*")
        .eq("club_id", selectedClubId);

      return data.map(m => {
        const memberPayments = allPayments?.filter(p => p.member_id === m.id) || [];
        const financialStatus = calculateFinancialStatus(m, memberPayments);
        return { ...m, financialStatus };
      });
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
    m.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              Gestión de Miembros
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Administra los arqueros y el personal de tu club</p>
          </div>

          <div className="flex flex-col xs:flex-row gap-2">
            {selectedClubId && <InviteMemberDialog clubId={selectedClubId} />}
            {selectedClubId && <AddMemberDialog clubId={selectedClubId} />}
          </div>
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:max-w-xs">
            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
              <SelectTrigger className="glass h-11"><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
              <SelectContent>
                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10 h-11 sm:h-10 glass border-primary/10" placeholder="Buscar por nombre o email..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Members View */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <div key={i} className="glass rounded-2xl p-6 h-32 animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View (lg+) */}
          <div className="hidden lg:block glass rounded-2xl overflow-hidden border border-border/50">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="font-bold text-foreground">Nombre</TableHead>
                    <TableHead className="font-bold text-foreground">Identificación</TableHead>
                    <TableHead className="font-bold text-foreground">Correo</TableHead>
                    <TableHead className="font-bold text-foreground">Rol</TableHead>
                    <TableHead className="font-bold text-foreground">Estado</TableHead>
                    <TableHead className="font-bold text-foreground">Ingreso</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered?.map((m) => {
                    const roles = m.member_roles?.map((r: { role: string }) => r.role) || [];
                    return (
                      <TableRow key={m.id} className="hover:bg-muted/20 border-border/30 transition-colors">
                        <TableCell className="font-bold text-foreground whitespace-nowrap">
                          {m.full_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {m.identification || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {m.email || "Sin email"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roles.map((role: string) => (
                              <Badge key={role} variant="outline" className="capitalize text-[9px] px-1.5 py-0 h-4 border-primary/20">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={m.status === "activo" ? "default" : "destructive"} className="capitalize w-fit text-[9px] h-4">
                              {m.status}
                            </Badge>
                            {m.status === "activo" && (
                              <Badge variant={m.financialStatus === "vigente" ? "secondary" : "destructive"} className="capitalize w-fit text-[9px] h-4 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                {m.financialStatus}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {m.enrollment_date ? new Date(m.enrollment_date).toLocaleDateString("es-CL") : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 transition-colors">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="glass">
                                <DropdownMenuItem onClick={() => setEditMember(m)}>
                                  <Pencil className="h-4 w-4 mr-2" />Editar datos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setRolesMember({ ...m, roles })}>
                                  <ShieldCheck className="h-4 w-4 mr-2" />Gestionar roles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setHistoryMember(m)}>
                                  <History className="h-4 w-4 mr-2" />Historial puntajes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setPaymentsMember(m)}>
                                  <Wallet className="h-4 w-4 mr-2" />Historial pagos
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDivisionsMember(m)}>
                                  <Trophy className="h-4 w-4 mr-2" />Divisiones
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: m.id, status: m.status as string })}>
                                  {m.status === "activo" ? <XCircle className="h-4 w-4 mr-2 text-destructive" /> : <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />}
                                  {m.status === "activo" ? "Desactivar Miembro" : "Activar Miembro"}
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
          </div>

          {/* Mobile & Tablet Card View (<lg) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:hidden">
            {filtered?.map((m) => {
              const roles = m.member_roles?.map((r: { role: string }) => r.role) || [];
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl p-5 border-l-4 border-l-transparent transition-all active:scale-[0.98] shadow-lg shadow-black/5"
                  style={{ borderLeftColor: m.status === 'activo' ? 'var(--primary)' : 'var(--destructive)' }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-foreground text-lg leading-tight">{m.full_name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{m.email || "Sin correo"}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 bg-muted/20 rounded-xl">
                          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass min-w-[180px]">
                        <DropdownMenuItem onClick={() => setEditMember(m)}>
                          <Pencil className="h-4 w-4 mr-2" />Editar Perfil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRolesMember({ ...m, roles })}>
                          <ShieldCheck className="h-4 w-4 mr-2" />Roles
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setHistoryMember(m)}>
                          <History className="h-4 w-4 mr-2" />Puntajes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPaymentsMember(m)}>
                          <Wallet className="h-4 w-4 mr-2" />Pagos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDivisionsMember(m)}>
                          <Trophy className="h-4 w-4 mr-2" />Divisiones
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleStatus.mutate({ id: m.id, status: m.status as string })}>
                          {m.status === "activo" ? <XCircle className="h-4 w-4 mr-2 text-destructive" /> : <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />}
                          {m.status === "activo" ? "Desactivar" : "Activar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive font-bold" onClick={() => setDeleteMember(m)}>
                          <Trash2 className="h-4 w-4 mr-2" />Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 bg-muted/20 p-3 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Finanzas</p>
                      <Badge variant={m.financialStatus === "vigente" ? "secondary" : "destructive"} className="text-[10px] h-5 w-fit border-none bg-emerald-500/10 text-emerald-500">
                        {m.financialStatus.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Ingreso</p>
                      <p className="text-xs font-bold flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-primary" />
                        {m.enrollment_date ? new Date(m.enrollment_date).toLocaleDateString("es-CL") : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {roles.map((role: string) => (
                      <Badge key={role} variant="outline" className="capitalize text-[9px] px-2 py-0 h-4 border-primary/20 bg-background/50">
                        {role}
                      </Badge>
                    ))}
                    {m.status === 'inactivo' && (
                      <Badge variant="destructive" className="text-[9px] px-2 py-0 h-4 uppercase">Cuenta Inactiva</Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filtered?.length === 0 && (
            <div className="p-12 text-center glass rounded-2xl border-dashed border-2 border-border/50">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-muted-foreground font-medium">No se encontraron miembros registrados.</p>
              <Button variant="link" onClick={() => setSearch("")} className="mt-2 text-primary">Limpiar búsqueda</Button>
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
      {paymentsMember && selectedClubId && (
        <MemberPaymentHistoryDialog
          memberId={paymentsMember.id}
          memberName={paymentsMember.full_name}
          clubId={selectedClubId}
          open={!!paymentsMember}
          onOpenChange={(open) => !open && setPaymentsMember(null)}
        />
      )}
      <MemberDivisionsDialog
        member={divisionsMember}
        open={!!divisionsMember}
        onOpenChange={(open) => !open && setDivisionsMember(null)}
      />
    </div>
  );
}
