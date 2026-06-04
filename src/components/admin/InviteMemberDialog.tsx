import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { Link, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContextCore";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
    clubId: string;
    disabled?: boolean;
}

export default function InviteMemberDialog({ clubId: initialClubId, disabled }: Props) {
    const { member } = useAuth();
    const isSuperAdmin = !!member?.is_super_admin;
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [invitationLink, setInvitationLink] = useState("");
    const [copied, setCopied] = useState(false);
    const [selectedClubId, setSelectedClubId] = useState(initialClubId || "");
    const { data: clubs } = useClubs();

    const generateInvite = async () => {
        const targetClubId = isSuperAdmin ? selectedClubId : initialClubId;
        if (!targetClubId || targetClubId === "null") {
            toast({ title: "Error", description: "Debe seleccionar un club", variant: "destructive" });
            return;
        }

        try {
            setLoading(true);
            const isVirtual = member?.id?.startsWith('00000000');
            const creatorId = (member?.id && !isVirtual) ? member.id : null;

            const { data, error } = await supabase
                .from("member_invitations")
                .insert({
                    club_id: targetClubId,
                    email: email || null,
                    created_by: creatorId
                })
                .select("token")
                .single();

            if (error) throw error;

            const link = `${window.location.origin}/join?token=${data.token}`;
            setInvitationLink(link);
            toast({ title: "Invitación generada", description: "Copia el link para enviarlo." });
        } catch (error: unknown) {
            toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(invitationLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copiado", description: "Link copiado al portapapeles." });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={disabled}>
                    <Link className="h-4 w-4" />
                    Invitar vía Link
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-display">Invitar Miembro</DialogTitle>
                    <DialogDescription>
                        Genera un link de invitación único para que un nuevo miembro se registre solo.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 pt-4">
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
                        <Label>Correo Electrónico (Opcional)</Label>
                        <Input
                            type="email"
                            placeholder="ejemplo@correo.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={!!invitationLink}
                        />
                        <p className="text-xs text-muted-foreground">Si incluyes el correo, el link será exclusivo para esa persona.</p>
                    </div>

                    {!invitationLink ? (
                        <Button className="w-full" onClick={generateInvite} disabled={loading}>
                            {loading ? "Generando..." : "Generar Link de Invitación"}
                        </Button>
                    ) : (
                        <div className="space-y-3 animate-in fade-in zoom-in duration-300">
                            <div className="flex gap-2">
                                <Input value={invitationLink} readOnly className="font-mono text-xs bg-muted" />
                                <Button size="icon" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full text-xs"
                                onClick={() => { setInvitationLink(""); setEmail(""); }}
                            >
                                Generar otra invitación
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
