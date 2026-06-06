import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface Plan {
    id: string;
    name: string;
    price: number;
}

interface Props {
    onSuccess: () => void;
}

export default function SuperAdminCreateClubDialog({ onSuccess }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);

    const [clubName, setClubName] = useState("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [email, setEmail] = useState("");
    const [adminName, setAdminName] = useState("");
    const [planId, setPlanId] = useState("");
    const [trialDays, setTrialDays] = useState("30");

    useEffect(() => {
        if (open) fetchPlans();
    }, [open]);

    const fetchPlans = async () => {
        const { data } = await supabase.from("plans").select("id, name, price");
        if (data) setPlans(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            const selectedPlan = plans.find(p => p.id === planId);
            const trialEnds = new Date();
            trialEnds.setDate(trialEnds.getDate() + parseInt(trialDays));

            // 1. Create Club
            const { data: club, error: clubError } = await supabase
                .from("clubs")
                .insert({
                    name: clubName,
                    city,
                    country,
                    contact_email: email,
                    subscription_status: 'activo',
                    plan_id: (planId && planId !== "null") ? planId : null,
                    monthly_price: selectedPlan?.price || 29.99,
                    subscription_end_date: trialEnds.toISOString().split('T')[0]
                })
                .select()
                .single();

            if (clubError) throw clubError;

            // 2. Create the Admin Member for this club
            const { data: member, error: memberError } = await supabase
                .from("members")
                .insert({
                    club_id: club.id,
                    full_name: adminName,
                    email: email,
                    status: 'activo'
                })
                .select()
                .single();

            if (memberError) {
                logger.error("Error creating admin member:", memberError);
                toast.warning("Club creado pero hubo un error al crear el administrador.");
            } else {
                // 3. Assign Administrator Role
                const { error: roleError } = await supabase
                    .from("member_roles")
                    .insert({
                        member_id: member.id,
                        club_id: club.id,
                        role: 'administrador'
                    });
                if (roleError) logger.error("Error assigning admin role:", roleError);
            }

            toast.success("Club y Administrador creados exitosamente");
            setOpen(false);
            onSuccess();

            // Reset form
            setClubName(""); setCity(""); setCountry(""); setEmail(""); setAdminName(""); setPlanId("");
        } catch (error: unknown) {
            toast.error("Error al crear el club: " + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    Nuevo Club
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Registrar Nuevo Club
                    </DialogTitle>
                    <DialogDescription>
                        Crea un nuevo tenant en el sistema con un plan y periodo de prueba.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2 sm:col-span-2">
                            <Label>Nombre del Club</Label>
                            <Input value={clubName} onChange={(e) => setClubName(e.target.value)} required placeholder="Ej: Flecha de Oro" />
                        </div>
                        <div className="space-y-2">
                            <Label>Ciudad</Label>
                            <Input value={city} onChange={(e) => setCity(e.target.value)} required placeholder="Ej: Santiago" />
                        </div>
                        <div className="space-y-2">
                            <Label>País</Label>
                            <Input value={country} onChange={(e) => setCountry(e.target.value)} required placeholder="Ej: Chile" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nombre completo del Administrador</Label>
                            <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} required placeholder="Ej: Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email del Administrador (Contacto)</Label>
                            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@club.com" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Plan SaaS</Label>
                            <Select value={planId} onValueChange={setPlanId}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar plan" /></SelectTrigger>
                                <SelectContent>
                                    {plans.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name} (${p.price})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Días de Prueba</Label>
                            <Input type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} required />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Creando..." : "Crear Club y Activar Prueba"}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
