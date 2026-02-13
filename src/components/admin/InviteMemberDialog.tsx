import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
    clubId: string;
}

export default function InviteMemberDialog({ clubId }: Props) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [invitationLink, setInvitationLink] = useState("");
    const [copied, setCopied] = useState(false);

    const generateInvite = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("member_invitations")
                .insert({ club_id: clubId, email: email || null })
                .select("token")
                .single();

            if (error) throw error;

            const link = `${window.location.origin}/join?token=${data.token}`;
            setInvitationLink(link);
            toast({ title: "Invitación generada", description: "Copia el link para enviarlo." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
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
                <Button variant="outline" className="gap-2">
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
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Correo Electrónico (Opcional)</label>
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
