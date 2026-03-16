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
import { Calendar, Users, DollarSign, Save } from "lucide-react";
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

    useEffect(() => {
        setEndDate(club.subscription_end_date || "");
        setPrice(String(club.monthly_price || 0));
        setLimit(String(club.student_limit_override || ""));
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
