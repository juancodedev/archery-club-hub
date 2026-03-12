import { useState } from "react";
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
import { Copy, Key, Link as LinkIcon, DollarSign, Users } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface ClubConfigDialogProps {
    clubId: string;
    clubName: string;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function ClubConfigDialog({ clubId, clubName, isOpen, onOpenChange }: ClubConfigDialogProps) {
    const { data: clubData, isLoading: loadingClub } = useQuery({
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

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado al portapapeles`);
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
                        <div className="text-sm text-muted-foreground mb-2">
                            Historial de invitaciones enviadas y su estado.
                        </div>
                        <ScrollArea className="h-[300px] pr-4">
                            {loadingInvs ? (
                                <div className="text-center py-8">Cargando invitaciones...</div>
                            ) : invitations?.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No hay invitaciones registradas.</div>
                            ) : (
                                <div className="space-y-3">
                                    {invitations?.map((inv) => (
                                        <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50">
                                            <div>
                                                <div className="font-medium text-sm">{inv.email || "Sin email"}</div>
                                                <div className="text-[10px] text-muted-foreground">
                                                    {new Date(inv.created_at).toLocaleString('es-CL')}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant={inv.used_at ? "default" : "outline"}>
                                                    {inv.used_at ? "Usada" : "Pendiente"}
                                                </Badge>
                                                {!inv.used_at && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => copyToClipboard(`${window.location.origin}/join?token=${inv.token}`, "Enlace")}
                                                    >
                                                        <Copy className="h-3.5 w-3.5" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
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
                                        readOnly
                                        value={formatCurrency(clubData?.inscription_fee || 0)}
                                        className="pl-8 bg-muted/20"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Cuota Mensual</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        readOnly
                                        value={formatCurrency(clubData?.monthly_fee || 0)}
                                        className="pl-8 bg-muted/20"
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="mt-4 space-y-4 text-left">
                        <div className="space-y-2">
                            <Label>Contraseña Predeterminada</Label>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    type="text"
                                    value={clubData?.default_member_password || "No establecida"}
                                    className="bg-muted/20"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    disabled={!clubData?.default_member_password}
                                    onClick={() => copyToClipboard(clubData?.default_member_password || "", "Contraseña")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-muted-foreground">Contraseña asignada automáticamente a nuevos miembros.</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
