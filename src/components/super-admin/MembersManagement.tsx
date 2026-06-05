import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Shield, Building2, Mail, MoreHorizontal, Pencil, Key, Filter, Trash2, ShieldCheck } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ui/confirm-dialog";
// Ensure the correct path to AddMemberDialog is used
import AddMemberDialog from "@/components/admin/AddMemberDialog"; // Update the path if necessary
import EditMemberDialog from "@/components/admin/EditMemberDialog";
import ManageRolesDialog from "@/components/admin/ManageRolesDialog";

interface Member {
    id: string;
    full_name: string;
    email: string;
    status: string;
    club_id: string;
    user_id?: string | null;
    identification: string | null;
    phone: string | null;
    address: string | null;
    date_of_birth: string | null;
    observations: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    shirt_size: string | null;
    windbreaker_size: string | null;
    display_name: string | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_email?: string | null;
    clubs: { name: string };
    member_roles: { role: string }[];
}

export default function MembersManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClubId, setSelectedClubId] = useState<string>("all");
    const { data: clubs } = useClubs();
    const queryClient = useQueryClient();

    // Dialog states
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [rolesMember, setRolesMember] = useState<(Member & { roles: string[] }) | null>(null);
    const [passwordResetTarget, setPasswordResetTarget] = useState<Member | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    const { data: members, isLoading } = useQuery({
        queryKey: ["all-members", selectedClubId],
        queryFn: async () => {
            let query = supabase
                .from("members")
                .select(`
                    *,
                    clubs(name),
                    member_roles(role)
                `);

            if (selectedClubId !== "all") {
                query = query.eq("club_id", selectedClubId);
            }

            const { data, error } = await query.order("created_at", { ascending: false });

            if (error) throw error;
            return data as Member[];
        }
    });

    const resetPassword = useMutation({
        mutationFn: async (member: Member) => {
            const email = member.email?.trim();
            if (!email) throw new Error("Este miembro no tiene correo electrónico configurado.");
            if (email.toLowerCase().endsWith("@sin-email.clubarchery.local")) {
                throw new Error("Este miembro usa un correo interno temporal. Debe registrar un correo real para recuperar su contraseña.");
            }

            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) throw error;
            return data;
        },
        onSuccess: (_data, member) => {
            toast.success(`Enlace de recuperación enviado a ${member.email}.`);
        },
        onError: (error: Error) => {
            toast.error(getSafeErrorMessage(error));
        }
    });

    const deleteMember = useMutation({
        mutationFn: async (memberId: string) => {
            const { data, error } = await supabase.functions.invoke('delete-member', {
                body: { member_id: memberId },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["all-members"] });
            toast.success("Miembro eliminado");
        },
        onError: (error: Error) => {
            toast.error(getSafeErrorMessage(error));
        }
    });

    const filteredMembers = members?.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.clubs?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 flex-col sm:flex-row gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre o email..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-64">
                        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                            <SelectTrigger className="gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <SelectValue placeholder="Filtrar por club" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los clubes</SelectItem>
                                {clubs?.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <AddMemberDialog clubId={selectedClubId === "all" ? "" : selectedClubId} />
            </div>

            <div className="rounded-md border border-border/50 bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead>Roles</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">Cargando miembros...</TableCell>
                            </TableRow>
                        ) : filteredMembers?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron miembros.</TableCell>
                            </TableRow>
                        ) : (
                            filteredMembers?.map((m) => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">{m.full_name}</span>
                                            <span className="text-xs text-muted-foreground">{m.email || "Sin email"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm">{m.clubs?.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {m.member_roles?.map((r, i) => (
                                                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                                                    {r.role}
                                                </Badge>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={m.status === "activo" ? "default" : "destructive"} className="capitalize">
                                            {m.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingMember(m)}>
                                                    <Pencil className="h-4 w-4 mr-2" />Editar perfil completo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setRolesMember({ ...m, roles: m.member_roles.map(r => r.role) })}>
                                                    <ShieldCheck className="h-4 w-4 mr-2" />Gestionar roles
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setPasswordResetTarget(m)}>
                                                    <Key className="h-4 w-4 mr-2" />Enviar recuperación por correo
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => setDeleteTarget({ id: m.id, name: m.full_name })}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />Eliminar miembro
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Comprehensive Dialogs */}
            <EditMemberDialog
                member={editingMember}
                open={!!editingMember}
                onOpenChange={(open) => !open && setEditingMember(null)}
            />

            {rolesMember && (
                <ManageRolesDialog
                    memberId={rolesMember.id}
                    memberName={rolesMember.full_name}
                    clubId={rolesMember.club_id}
                    currentRoles={rolesMember.roles}
                    open={!!rolesMember}
                    onOpenChange={(open) => !open && setRolesMember(null)}
                />
            )}
            <ConfirmDialog
                open={!!passwordResetTarget}
                onOpenChange={(open) => !open && setPasswordResetTarget(null)}
                title="Enviar recuperación de contraseña"
                description={`¿Enviar correo de recuperación de contraseña a ${passwordResetTarget?.full_name}?`}
                confirmLabel="Enviar"
                onConfirm={() => {
                    if (passwordResetTarget) {
                        resetPassword.mutate(passwordResetTarget);
                        setPasswordResetTarget(null);
                    }
                }}
            />
            <ConfirmDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
                title="Eliminar miembro"
                description={`¿Estás seguro de eliminar a ${deleteTarget?.name}? Esta acción no se puede deshacer.`}
                confirmLabel="Eliminar"
                variant="destructive"
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteMember.mutate(deleteTarget.id);
                        setDeleteTarget(null);
                    }
                }}
            />
        </div>
    );
}
