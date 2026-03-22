import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, Save, History, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { getSafeErrorMessage } from "@/lib/errorUtils";

interface PlanOverrideDialogProps {
    club: {
        id: string;
        name: string;
        subscription_end_date: string | null;
        monthly_price: number;
        student_limit_override?: number | null;
        grace_period_days?: number;
        block_type?: 'total' | 'partial';
    };
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function PlanOverrideDialog({ club, isOpen, onOpenChange }: PlanOverrideDialogProps) {
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [endDate, setEndDate] = useState(club.subscription_end_date || "");
    const [price, setPrice] = useState(String(club.monthly_price || 0));
    const [limit, setLimit] = useState(String(club.student_limit_override || ""));
    const [graceDays, setGraceDays] = useState(String(club.grace_period_days || 0));
    const [blockType, setBlockType] = useState(club.block_type || 'total');

    useEffect(() => {
        setEndDate(club.subscription_end_date || "");
        setPrice(String(club.monthly_price || 0));
        setLimit(String(club.student_limit_override || ""));
        setGraceDays(String(club.grace_period_days || 0));
        setBlockType(club.block_type || 'total');
    }, [club]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const { error } = await supabase
                .from("clubs")
                .update({
                    subscription_end_date: endDate || null,
                    monthly_price: parseFloat(price) || 0,
                    student_limit_override: limit ? parseInt(limit) : null,
                    grace_period_days: parseInt(graceDays) || 0,
                    block_type: blockType,
                })
                .eq("id", club.id);

            if (error) throw error;

            toast.success("Excepciones de plan actualizadas correctamente");
            queryClient.invalidateQueries({ queryKey: ["clubs"] });
            onOpenChange(false);
        } catch (error) {
            toast.error("Error al actualizar excepciones: " + getSafeErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px] glass">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Save className="h-5 w-5 text-indigo-400" />
                        Excepciones de Plan - {club.name}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="end_date" className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" /> Vencimiento de Suscripción
                        </Label>
                        <Input
                            id="end_date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-muted/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="monthly_price" className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Precio Mensual Personalizado
                        </Label>
                        <Input
                            id="monthly_price"
                            type="number"
                            step="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="bg-muted/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="student_limit" className="flex items-center gap-2">
                            <Users className="h-4 w-4" /> Límite de Alumnos (Excepción)
                        </Label>
                        <Input
                            id="student_limit"
                            type="number"
                            placeholder="Usar límite de plan"
                            value={limit}
                            onChange={(e) => setLimit(e.target.value)}
                            className="bg-muted/20"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Si se establece, este valor prevalece sobre el límite del plan contratado.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="grace_days" className="flex items-center gap-2">
                            <History className="h-4 w-4" /> Periodo Gracia
                        </Label>
                        <Input
                            id="grace_days"
                            type="number"
                            value={graceDays}
                            onChange={(e) => setGraceDays(e.target.value)}
                            className="bg-muted/20"
                        />
                        <p className="text-[10px] text-muted-foreground">Días extra tras vencimiento.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="block_type" className="flex items-center gap-2">
                            <ShieldAlert className="h-4 w-4" /> Tipo de Bloqueo
                        </Label>
                        <select
                            id="block_type"
                            value={blockType}
                            onChange={(e) => setBlockType(e.target.value as 'total' | 'partial')}
                            className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <option value="total">Total</option>
                            <option value="partial">Parcial (Lectura)</option>
                        </select>
                        <p className="text-[10px] text-muted-foreground">Efecto al bloquear.</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading} className="gap-2">
                        <Save className="h-4 w-4" />
                        {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
