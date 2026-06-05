import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Key, Link as LinkIcon, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    RefreshCcw,
    Calendar,
    CheckCircle2,
    Send,
    Plus
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ClubConfigDialogProps {
    clubId: string;
    clubName: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ClubConfigDialog({ clubId, clubName, isOpen, onOpenChange }: ClubConfigDialogProps) {
    const { data: clubData } = useQuery({
        queryKey: ["club-config", clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("clubs")
                .select("*")
                .eq("id", clubId)
                .single();
            if (error) throw error;
            return data;
        },
        enabled: isOpen,
    });

    const { data: invitations, isLoading: loadingInvs } = useQuery({
        queryKey: ["club-invitations", clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("member_invitations")
                .select("*")
                .eq("club_id", clubId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: isOpen,
    });

    const queryClient = useQueryClient();

    // Local states for club settings
    const [inscriptionFee, setInscriptionFee] = useState<number>(0);
    const [monthlyFee, setMonthlyFee] = useState<number>(0);

    // Initialize local states when data is loaded
    useEffect(() => {
        if (clubData) {
            setInscriptionFee(clubData.inscription_fee || 0);
            setMonthlyFee(clubData.monthly_fee || 0);
        }
    }, [clubData]);

    // States for new generic invitation
    const [newTitle, setNewTitle] = useState("");
    const [newMaxUses, setNewMaxUses] = useState(10);
    const [newDuration, setNewDuration] = useState(48); // hours

    const { data: memberRegistrations } = useQuery({
        queryKey: ["club-invitation-stats", clubId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("members")
                .select("id, full_name, invitation_id, created_at")
                .eq("club_id", clubId)
                .not("invitation_id", "is", null);
            if (error) throw error;
            return data;
        },
        enabled: isOpen,
    });

    const updateClubMutation = useMutation({
        mutationFn: async (updates: Record<string, unknown>) => {
            const { error } = await supabase
                .from("clubs")
                .update(updates)
                .eq("id", clubId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["club-config", clubId] });
            toast.success("Configuración actualizada con éxito");
        },
        onError: (error: Error) => {
            toast.error("Error al actualizar: " + error.message);
        }
    });

    const createInvitationMutation = useMutation({
        mutationFn: async (variables: { type: 'generic' | 'individual', email?: string }) => {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + newDuration);

            const { data, error } = await supabase
                .from("member_invitations")
                .insert({
                    club_id: clubId,
                    invitation_type: variables.type,
                    email: variables.email || null,
                    title: variables.type === 'generic' ? newTitle : null,
                    max_uses: variables.type === 'generic' ? newMaxUses : 1,
                    expires_at: expiresAt.toISOString(),
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["club-invitations", clubId] });
            toast.success("Invitación creada con éxito");
            setNewTitle("");
        }
    });

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
    };

    const getInvitationStatus = (inv: { expires_at: string; used_at?: string | null; invitation_type: string }) => {
        const isExpired = new Date(inv.expires_at) < new Date();
        if (inv.used_at && inv.invitation_type === 'individual') return 'used';
        if (isExpired) return 'expired';
        return 'active';
    };

    const getRegistrationsForInv = (invId: string) => {
        return memberRegistrations?.filter(m => m.invitation_id === invId) || [];
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] glass">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <LinkIcon className="h-5 w-5 text-indigo-400" />
                        Configuración de {clubName}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="invitations" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="invitations" className="gap-2">
                            <LinkIcon className="h-4 w-4" /> Invitaciones
                        </TabsTrigger>
                        <TabsTrigger value="fees" className="gap-2">
                            <DollarSign className="h-4 w-4" /> Montos
                        </TabsTrigger>
                        <TabsTrigger value="security" className="gap-2">
                            <Key className="h-4 w-4" /> Seguridad
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="invitations" className="mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground mr-4">
                                Gestiona links genéricos o individuales.
                            </div>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button size="sm" className="gap-2">
                                        <Plus className="h-4 w-4" /> Nuevo Link Genérico
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 glass space-y-4">
                                    <div className="space-y-2">
                                        <Label>Título o Referencia</Label>
                                        <Input
                                            placeholder="Ej: Invitación Redes Sociales"
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Cupos Máx.</Label>
                                            <Input
                                                type="number"
                                                value={newMaxUses}
                                                onChange={(e) => setNewMaxUses(parseInt(e.target.value))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Duración (hrs)</Label>
                                            <Input
                                                type="number"
                                                value={newDuration}
                                                onChange={(e) => setNewDuration(parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        className="w-full"
                                        disabled={!newTitle || createInvitationMutation.isPending}
                                        onClick={() => createInvitationMutation.mutate({ type: 'generic' })}
                                    >
                                        Crear Link
                                    </Button>
                                </PopoverContent>
                            </Popover>
                        </div>

                        <ScrollArea className="h-[350px] pr-4">
                            {loadingInvs ? (
                                <div className="text-center py-8">Cargando invitaciones...</div>
                            ) : invitations?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No hay invitaciones registradas.</div>
                            ) : (
                                <div className="space-y-3">
                                    {invitations?.map((inv) => {
                                        const status = getInvitationStatus(inv as { expires_at: string; used_at?: string | null; invitation_type: string });
                                        const regs = getRegistrationsForInv(inv.id);
                                        const isExpired = new Date(inv.expires_at) < new Date();

                                        return (
                                            <div key={inv.id} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="font-medium text-sm flex items-center gap-2">
                                                            {inv.invitation_type === 'generic' ? (
                                                                <>
                                                                    <LinkIcon className="h-3 w-3 text-indigo-400" />
                                                                    {inv.title || "Link Genérico"}
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Send className="h-3 w-3 text-emerald-400" />
                                                                    {inv.email || "Invitación directa"}
                                                                </>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            Expira: {new Date(inv.expires_at).toLocaleString('es-CL')}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant={status === 'used' ? "default" : status === 'expired' ? "destructive" : "outline"} className="capitalize">
                                                            {status === 'used' ? "Usada" : status === 'expired' ? "Caducada" : "Abierta"}
                                                        </Badge>

                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7"
                                                                disabled={isExpired}
                                                                onClick={() => copyToClipboard(`${window.location.origin}/join?token=${inv.token}`, "Enlace")}
                                                            >
                                                                <Copy className="h-3.5 w-3.5" />
                                                            </Button>

                                                            {inv.invitation_type === 'individual' && status === 'active' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-7 w-7 text-indigo-400"
                                                                    onClick={() => toast.info("Funcionalidad de re-envío simulada. Link copiado.")}
                                                                >
                                                                    <RefreshCcw className="h-3.5 w-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {inv.invitation_type === 'generic' && (
                                                    <div className="flex items-center justify-between pt-2 border-t border-border/20">
                                                        <div className="text-[10px] font-semibold text-muted-foreground">
                                                            USOS: {regs.length} / {inv.max_uses || '-'}
                                                        </div>
                                                        {regs.length > 0 && (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="link" className="h-auto p-0 text-[10px]">Ver inscritos</Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-64 glass">
                                                                    <div className="text-xs font-bold mb-2 border-b border-border/50 pb-1">Inscritos con este link</div>
                                                                    <div className="space-y-1 max-h-40 overflow-y-auto">
                                                                        {regs.map(r => (
                                                                            <div key={r.id} className="flex justify-between items-center text-[10px]">
                                                                                <span className="font-medium">{r.full_name}</span>
                                                                                <span className="text-muted-foreground">{new Date(r.created_at ?? '').toLocaleDateString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="fees" className="mt-4 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Cuota de Inscripción</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        value={inscriptionFee}
                                        onChange={(e) => setInscriptionFee(parseFloat(e.target.value))}
                                        className="pl-8 bg-muted/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Cuota Mensual</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        type="number"
                                        value={monthlyFee}
                                        onChange={(e) => setMonthlyFee(parseFloat(e.target.value))}
                                        className="pl-8 bg-muted/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            className="w-full gap-2"
                            disabled={updateClubMutation.isPending}
                            onClick={() => updateClubMutation.mutate({
                                inscription_fee: inscriptionFee,
                                monthly_fee: monthlyFee
                            })}
                        >
                            {updateClubMutation.isPending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </TabsContent>

                    <TabsContent value="security" className="mt-4 space-y-4 text-left">
                        <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                            La plataforma ya no almacena contraseñas predeterminadas de club.
                            Los reseteos generan claves temporales seguras del lado del servidor.
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
