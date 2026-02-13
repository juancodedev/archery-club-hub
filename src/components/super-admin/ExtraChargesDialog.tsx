import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Props {
    clubId: string;
    clubName: string;
}

export default function ExtraChargesDialog({ clubId, clubName }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const { error } = await supabase
                .from("extra_charges")
                .insert({
                    club_id: clubId,
                    name,
                    description,
                    amount: parseFloat(amount)
                });

            if (error) throw error;

            toast.success("Cargo extra añadido correctamente");
            setOpen(false);
            setName(""); setDescription(""); setAmount("");
        } catch (error: any) {
            toast.error("Error al añadir cargo: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <DollarSign className="h-4 w-4" /> Cargo Extra
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Añadir Cargo Extra</DialogTitle>
                    <DialogDescription>
                        Este monto se sumará a la próxima facturación de <strong>{clubName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Concepto</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej: Servicio de personalización" />
                    </div>
                    <div className="space-y-2">
                        <Label>Descripción</Label>
                        <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalle adicional del cargo..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Monto ($)</Label>
                        <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Registrando..." : "Añadir Cargo"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
