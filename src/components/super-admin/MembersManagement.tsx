import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Search, UserPlus, Shield, Building2, Mail, MoreHorizontal } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Member {
    id: string;
    full_name: string;
    email: string;
    status: string;
    club_id: string;
    clubs: { name: string };
    member_roles: { role: string }[];
}

export default function MembersManagement() {
    const [searchTerm, setSearchTerm] = useState("");
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);

    const { data: members, isLoading } = useQuery({
        queryKey: ["all-members"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("members")
                .select(`
                    *,
                    clubs(name),
                    member_roles(role)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data as Member[];
        }
    });

    const filteredMembers = members?.filter(m =>
        m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.clubs?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre, email o club..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <SuperAdminAddMemberDialog onSuccess={() => queryClient.invalidateQueries({ queryKey: ["all-members"] })} />
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
                                            <span className="text-xs text-muted-foreground">{m.email}</span>
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
                                        <SuperAdminEditMemberDialog
                                            member={m}
                                            onSuccess={() => queryClient.invalidateQueries({ queryKey: ["all-members"] })}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function SuperAdminAddMemberDialog({ onSuccess }: { onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [clubs, setClubs] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        club_id: "",
        role: "arquero"
    });

    useEffect(() => {
        if (open) {
            fetchClubs();
        }
    }, [open]);

    const fetchClubs = async () => {
        const { data } = await supabase.from("clubs").select("id, name").order("name");
        if (data) setClubs(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.club_id) {
            toast.error("Debe seleccionar un club");
            return;
        }

        try {
            setLoading(true);
            const { data: member, error: memberError } = await supabase
                .from("members")
                .insert({
                    full_name: formData.full_name,
                    email: formData.email,
                    club_id: formData.club_id,
                    status: "activo"
                })
                .select()
                .single();

            if (memberError) throw memberError;

            const { error: roleError } = await supabase
                .from("member_roles")
                .insert({
                    member_id: member.id,
                    club_id: formData.club_id,
                    role: formData.role as any
                });

            if (roleError) throw roleError;

            toast.success("Miembro creado correctamente");
            onSuccess();
            setOpen(false);
            setFormData({ full_name: "", email: "", club_id: "", role: "arquero" });
        } catch (error: any) {
            toast.error("Error al crear miembro: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Crear Miembro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Añadir Miembro Global</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Nombre Completo</Label>
                        <Input
                            placeholder="Juan Pérez"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Correo Electrónico</Label>
                        <Input
                            type="email"
                            placeholder="juan@ejemplo.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Club de Destino</Label>
                        <Select
                            value={formData.club_id}
                            onValueChange={(val) => setFormData({ ...formData, club_id: val })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar club..." />
                            </SelectTrigger>
                            <SelectContent>
                                {clubs.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Rol Inicial</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(val) => setFormData({ ...formData, role: val })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="arquero">Arquero</SelectItem>
                                <SelectItem value="socio">Socio</SelectItem>
                                <SelectItem value="entrenador">Entrenador</SelectItem>
                                <SelectItem value="presidente">Presidente</SelectItem>
                                <SelectItem value="administrador">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creando..." : "Crear Miembro"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SuperAdminEditMemberDialog({ member, onSuccess }: { member: Member, onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(member.status);
    const [selectedRoles, setSelectedRoles] = useState<string[]>(member.member_roles.map(r => r.role));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            // 1. Update status
            const { error: statusError } = await supabase
                .from("members")
                .update({ status: status as any })
                .eq("id", member.id);
            if (statusError) throw statusError;

            // 2. Manage roles (Nuclear approach: delete all and re-add for simplicity in this helper)
            await supabase.from("member_roles").delete().eq("member_id", member.id);

            const roleInserts = selectedRoles.map(role => ({
                member_id: member.id,
                club_id: member.club_id,
                role: role as any
            }));

            if (roleInserts.length > 0) {
                const { error: roleError } = await supabase.from("member_roles").insert(roleInserts);
                if (roleError) throw roleError;
            }

            toast.success("Miembro actualizado correctamente");
            onSuccess();
            setOpen(false);
        } catch (error: any) {
            toast.error("Error al actualizar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const rolesList = ["administrador", "presidente", "entrenador", "arquero", "socio"];

    const toggleRole = (role: string) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role));
        } else {
            setSelectedRoles([...selectedRoles, role]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Miembro {member.full_name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="activo">Activo</SelectItem>
                                <SelectItem value="inactivo">Inactivo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label>Roles en el Club</Label>
                        <div className="flex flex-wrap gap-2">
                            {rolesList.map(role => (
                                <Badge
                                    key={role}
                                    variant={selectedRoles.includes(role) ? "default" : "outline"}
                                    className="cursor-pointer capitalize px-3 py-1"
                                    onClick={() => toggleRole(role)}
                                >
                                    {role}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}

