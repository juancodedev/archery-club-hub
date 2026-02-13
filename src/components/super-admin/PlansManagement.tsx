import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price: number;
    features: string[];
}

export default function PlansManagement() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("plans").select("*").order("price", { ascending: true });
        if (error) {
            toast.error("Error al cargar planes");
        } else {
            setPlans((data as any[]).map(p => ({
                ...p,
                features: Array.isArray(p.features) ? p.features as string[] : []
            })));
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPlan?.name || editingPlan.price === undefined) return;

        const planData = {
            name: editingPlan.name,
            description: editingPlan.description,
            price: editingPlan.price,
            features: editingPlan.features || [],
        };

        let error;
        if (editingPlan.id) {
            ({ error } = await supabase.from("plans").update(planData).eq("id", editingPlan.id));
        } else {
            ({ error } = await supabase.from("plans").insert([planData]));
        }

        if (error) {
            toast.error("Error al guardar el plan");
        } else {
            toast.success("Plan guardado correctamente");
            setIsDialogOpen(false);
            setEditingPlan(null);
            fetchPlans();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este plan?")) return;
        const { error } = await supabase.from("plans").delete().eq("id", id);
        if (error) {
            toast.error("Error al eliminar el plan");
        } else {
            toast.success("Plan eliminado");
            fetchPlans();
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Configuración de Planes</h3>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingPlan({ name: "", price: 0, features: [] })} className="gap-2">
                            <Plus className="h-4 w-4" /> Nuevo Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingPlan?.id ? "Editar Plan" : "Crear Nuevo Plan"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input
                                    value={editingPlan?.name || ""}
                                    onChange={e => setEditingPlan(prev => ({ ...prev, name: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descripción</Label>
                                <Textarea
                                    value={editingPlan?.description || ""}
                                    onChange={e => setEditingPlan(prev => ({ ...prev, description: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Precio Mensual</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editingPlan?.price || 0}
                                    onChange={e => setEditingPlan(prev => ({ ...prev, price: parseFloat(e.target.value) }))}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Características (una por línea)</Label>
                                <Textarea
                                    placeholder="Característica 1&#10;Característica 2"
                                    value={editingPlan?.features?.join("\n") || ""}
                                    onChange={e => setEditingPlan(prev => ({ ...prev, features: e.target.value.split("\n").filter(f => f.trim() !== "") }))}
                                />
                            </div>
                            <Button type="submit" className="w-full">Guardar Plan</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="glass rounded-xl overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Precio</TableHead>
                            <TableHead>Características</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {plans.map(plan => (
                            <TableRow key={plan.id}>
                                <TableCell className="font-medium">{plan.name}</TableCell>
                                <TableCell>${plan.price}/mes</TableCell>
                                <TableCell>
                                    <div className="text-xs text-muted-foreground">
                                        {plan.features.length} características
                                    </div>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingPlan(plan); setIsDialogOpen(true); }}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(plan.id)} className="text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
