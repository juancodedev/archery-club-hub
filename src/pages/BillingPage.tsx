import { motion } from "framer-motion";
import { Check, Info, Zap, HelpCircle, ExternalLink, CreditCard, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Plan {
    id: string;
    name: string;
    description: string | null;
    price: number;
    price_annual: number | null;
    student_limit: number;
    features: string[];
    monthlyPrice?: number;
    annualPrice?: number;
    accent?: string;
    border?: string;
    buttonText?: string;
    isAnnual?: boolean;
}

interface ClubDetails {
    id: string;
    plans?: { name: string; student_limit: number } | null;
    subscription_status?: string;
}

export default function BillingPage() {
    const [isAnnualPro, setIsAnnualPro] = useState(false);
    const [isAnnualBusiness, setIsAnnualBusiness] = useState(false);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const [compareIsAnnual, setCompareIsAnnual] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
    const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);
    const [contactMessage, setContactMessage] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const { member } = useAuth();
    const [hasSavedCard, setHasSavedCard] = useState(false);
    const [clubDetails, setClubDetails] = useState<ClubDetails | null>(null);
    const [studentCount, setStudentCount] = useState(0);

    const fetchClubAndStudents = useCallback(async () => {
        // Fetch club and its plan
        const { data: clubData } = await supabase
            .from("clubs")
            .select("*, plans(*)")
            .eq("id", member?.club_id)
            .single();

        if (clubData) setClubDetails(clubData);

        // Fetch member count
        const { count } = await supabase
            .from("members")
            .select("*", { count: 'exact', head: true })
            .eq("club_id", member?.club_id)
            .eq("status", "activo");

        if (count !== null) setStudentCount(count);

        const { data: plansData } = await supabase
            .from("plans")
            .select("*")
            .eq("is_active", true)
            .order("price", { ascending: true });

        if (plansData) {
            const styledPlans = plansData.map((p, idx) => ({
                ...p,
                monthlyPrice: p.price,
                annualPrice: p.price_annual || (p.price * 0.8), // Fallback to 20% discount
                accent: idx === 1 ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30" : "bg-card/20",
                border: idx === 1 ? "border-primary/50" : "border-border/30",
                buttonText: "Actualizar",
                features: p.features || [],
                isAnnual: p.name === "Pro" ? isAnnualPro : isAnnualBusiness, // This mapping is a bit loose but works for now
            }));
            setAvailablePlans(styledPlans);
        }
    }, [member?.club_id, isAnnualPro, isAnnualBusiness]);

    useEffect(() => {
        if (member?.club_id) {
            fetchClubAndStudents();
        }
    }, [member?.club_id, fetchClubAndStudents]);


    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!member) return;
        setIsProcessing(true);
        const { error } = await supabase.from("contact_requests").insert({
            club_id: member.club_id,
            member_id: member.id,
            type: "upgrade",
            message: `Solicitud de cambio a plan ${selectedPlan?.name}. Mensaje: ${contactMessage}`,
        });

        if (error) {
            toast.error("Error al enviar solicitud");
        } else {
            toast.success("Solicitud enviada correctamente");
            setIsContactDialogOpen(false);
            setContactMessage("");
        }
        setIsProcessing(false);
    };

    const handlePaymentSubmit = async () => {
        setIsProcessing(true);
        // Simulate Mercado Pago transaction
        await new Promise(r => setTimeout(r, 2000));

        const { error } = await supabase.from("clubs").update({
            plan_id: selectedPlan?.id,
            billing_cycle: selectedPlan?.isAnnual ? "annual" : "monthly",
            subscription_status: "activo"
        }).eq("id", member?.club_id);

        if (error) {
            toast.error("Error al procesar pago");
        } else {
            toast.success(`Plan ${selectedPlan?.name} activado con éxito`);
            setIsPaymentDialogOpen(false);
        }
        setIsProcessing(false);
    };
    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Planes y alumnos</h1>
                    <p className="text-muted-foreground mt-1.5 text-sm">Administra tu plan de suscripción y cupos de alumnos.</p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 transition-colors">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Docs</span>
                </Button>
            </motion.div>

            {/* Usage Overview Section */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-12">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="md:col-span-12 lg:col-span-5 glass rounded-[2.5rem] p-8 flex flex-col justify-between group h-full"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="text-xl font-display font-bold text-foreground">
                                {clubDetails?.plans?.name || (member?.club_id ? "Plan Gratuito" : "Sin Plan")}
                            </h3>
                            <p className="text-muted-foreground text-sm mt-0.5 font-medium group-hover:text-primary/70 transition-colors">
                                {clubDetails?.subscription_status === 'bloqueado' ? "Cuenta Suspendida" : "Actualiza en cualquier momento"}
                            </p>
                        </div>
                    </div>
                    <div className="mt-10 flex items-center gap-3">
                        <Button variant="outline" className="rounded-xl px-7 h-11 bg-background/50 border-border/50 hover:bg-background hover:scale-[1.02] transition-all font-semibold">
                            Gestionar
                        </Button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="md:col-span-12 lg:col-span-7 glass rounded-2xl p-7 flex flex-col justify-between h-full"
                >
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-display font-bold text-foreground">Alumnos registrados</h3>
                            <span className="text-sm font-bold bg-muted px-2.5 py-1 rounded-full text-foreground/80">
                                {studentCount} de {clubDetails?.plans?.student_limit || 10}
                            </span>
                        </div>
                        <div className="relative h-2.5 w-full bg-muted/30 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min((studentCount / (clubDetails?.plans?.student_limit || 10)) * 100, 100)}%` }}
                                className={cn(
                                    "absolute inset-y-0 left-0 rounded-full transition-all duration-1000",
                                    (studentCount / (clubDetails?.plans?.student_limit || 10)) > 0.9 ? "bg-destructive" : "bg-primary"
                                )}
                            />
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <UsersIcon className="h-4 w-4" />
                            </div>
                            <span>{clubDetails?.plans?.student_limit || 10} Alumnos máx.</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                            {studentCount >= (clubDetails?.plans?.student_limit || 10) ? (
                                <>
                                    <div className="h-3 w-3 rounded-full bg-destructive/60 animate-pulse ml-2" />
                                    <span className="text-destructive font-bold">Límite alcanzado</span>
                                </>
                            ) : (
                                <>
                                    <div className="h-3 w-3 rounded-full bg-emerald-500/60 ml-2" />
                                    <span>Cupos disponibles</span>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Pricing Grid */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 pt-4 sm:pt-6">
                {
                    availablePlans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className={cn(
                                "flex flex-col relative rounded-[2rem] p-6 sm:p-7 md:p-8 border bg-card/20 backdrop-blur-md hover:bg-card/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 group",
                                plan.border,
                                index === 1 && "lg:scale-[1.02] z-10"
                            )}
                        >
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-display font-bold text-foreground group-hover:text-primary transition-colors">{plan.name}</h3>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-display font-bold text-foreground">
                                                {plan.price === 0 ? "Gratis" : `$${plan.isAnnual ? plan.annualPrice : plan.monthlyPrice}`}
                                            </span>
                                            {plan.price > 0 && (
                                                <span className="text-sm font-semibold text-muted-foreground">/{plan.isAnnual ? 'año' : 'mes'}</span>
                                            )}
                                        </div>
                                    </div>
                                    {plan.isAnnual && plan.price > 0 && (
                                        <Badge className="bg-emerald-500/10 text-emerald-500 border-none">
                                            -20%
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-muted-foreground text-sm leading-relaxed mb-8 font-medium">
                                    {plan.description}
                                </p>

                                <Button
                                    variant={index === 1 ? "default" : "outline"}
                                    onClick={() => { setSelectedPlan(plan); setIsPaymentDialogOpen(true); }}
                                    className={cn(
                                        "w-full h-12 rounded-2xl mb-8 font-bold text-sm tracking-wide transition-all duration-300 active:scale-95 px-0",
                                        index === 1 && "bg-primary shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                                    )}
                                >
                                    {plan.buttonText}
                                </Button>

                                <div className="space-y-4 pt-4 border-t border-border/10">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                                        Funciones incluidas:
                                    </p>
                                    {(plan.features || []).map((feature: string) => (
                                        <div key={feature} className="flex items-center gap-3.5 group/item">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 transition-transform group-hover/item:scale-110">
                                                <Check className="h-3 w-3 stroke-[3px]" />
                                            </div>
                                            <span className="text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                                                {feature}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-8 pt-6">
                                <div onClick={(e) => { e.preventDefault(); setIsComparisonOpen(true); }} className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer uppercase tracking-widest">
                                    Ver todas las funciones
                                    <ExternalLink className="h-3 w-3" />
                                </div>
                            </div>
                        </motion.div>
                    ))
                }
            </div>

            {/* Comparison Table Dialog */}
            <Dialog open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[2rem] glass">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-display font-bold">Comparativa de Funciones</DialogTitle>
                        <div className="flex items-center gap-4 mt-4">
                            <span className={cn("text-xs font-bold uppercase tracking-wider", !compareIsAnnual ? "text-primary" : "text-muted-foreground")}>Mensual</span>
                            <Switch checked={compareIsAnnual} onCheckedChange={setCompareIsAnnual} />
                            <span className={cn("text-xs font-bold uppercase tracking-wider", compareIsAnnual ? "text-primary" : "text-muted-foreground")}>Anual</span>
                            {compareIsAnnual && (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-none">20% Descuento</Badge>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="rounded-2xl border border-border/50 overflow-hidden bg-card/30">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                                    <TableHead className="w-1/3 py-6">Función</TableHead>
                                    <TableHead className="text-center py-6">Gratuito</TableHead>
                                    <TableHead className="text-center py-6">Pro</TableHead>
                                    <TableHead className="text-center py-6">Business</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[
                                    { name: "Precio", free: "Gratis", pro: `$${compareIsAnnual ? 20 : 25}`, business: `$${compareIsAnnual ? 40 : 50}` },
                                    { name: "Alumnos", free: "10 alumnos", pro: "100 alumnos", business: "500 alumnos" },
                                    { name: "Gestión de Clases", free: "Básica", pro: "Avanzada", business: "Ilimitada" },
                                    { name: "Reportes", free: "Básicos", pro: "Estadísticas IA", business: "Personalizados" },
                                    { name: "Soporte", free: "Comunidad", pro: "24h Email", business: "Dedicado/Slack" },
                                    { name: "SSO & Seguridad", free: "—", pro: "—", business: "✓" },
                                ].map((feature) => (
                                    <TableRow key={feature.name} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                                        <TableCell className="font-semibold py-4">{feature.name}</TableCell>
                                        <TableCell className="text-center py-4 text-muted-foreground">{feature.free}</TableCell>
                                        <TableCell className="text-center py-4 font-bold text-primary">{feature.pro}</TableCell>
                                        <TableCell className="text-center py-4 font-bold text-primary">{feature.business}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="grid grid-cols-4 gap-4 mt-8">
                        <div />
                        <Button variant="outline" disabled className="text-xs uppercase font-bold tracking-widest rounded-xl">Plan Actual</Button>
                        <Button className="text-xs uppercase font-bold tracking-widest rounded-xl bg-primary shadow-lg shadow-primary/20">Actualizar Pro</Button>
                        <Button className="text-xs uppercase font-bold tracking-widest rounded-xl bg-foreground text-background">Actualizar Business</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] glass">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-bold">Actualizar a {selectedPlan?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="p-4 bg-muted/40 rounded-2xl border border-border/50">
                            <p className="text-sm font-medium mb-1">Monto a pagar</p>
                            <p className="text-3xl font-display font-bold text-primary">
                                ${selectedPlan?.isAnnual ? selectedPlan.annualPrice * 12 : selectedPlan?.monthlyPrice}
                                <span className="text-sm text-muted-foreground font-semibold"> / {selectedPlan?.isAnnual ? 'año' : 'mes'}</span>
                            </p>
                        </div>

                        {!hasSavedCard ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">No tienes una tarjeta guardada. Por favor, ingresa los datos de tu tarjeta para proceder con Mercado Pago.</p>
                                <div className="space-y-3">
                                    <Input placeholder="Número de tarjeta" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <Input placeholder="MM/YY" />
                                        <Input placeholder="CVV" />
                                    </div>
                                    <Input placeholder="Nombre en la tarjeta" />
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/20">
                                <CreditCard className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="text-sm font-bold">Visa terminada en 4242</p>
                                    <p className="text-xs text-muted-foreground">Se cargará automáticamente a tu tarjeta.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button onClick={handlePaymentSubmit} disabled={isProcessing} className="w-full h-12 rounded-2xl font-bold bg-primary shadow-lg shadow-primary/20">
                                {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Confirmar Pago"}
                            </Button>
                            <Button variant="ghost" onClick={() => { setIsPaymentDialogOpen(false); setIsContactDialogOpen(true); }} className="w-full text-muted-foreground text-xs uppercase font-bold tracking-widest hover:text-foreground">
                                O contactar con un administrador
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Contact Dialog */}
            <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-[2rem] glass">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-display font-bold">Contactar Administrador</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleContactSubmit} className="space-y-6 pt-4">
                        <p className="text-sm text-muted-foreground">Si prefieres realizar el pago por transferencia o tienes dudas sobre el plan {selectedPlan?.name}, déjanos un mensaje y te contactaremos a la brevedad.</p>

                        <div className="space-y-2">
                            <Label>Mensaje</Label>
                            <textarea
                                className="w-full min-h-[120px] rounded-2xl bg-muted/20 border border-border/50 p-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Escribe aquí tu consulta o solicitud..."
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" disabled={isProcessing} className="w-full h-12 rounded-2xl font-bold bg-foreground text-background">
                            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "Enviar Solicitud"}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", className)}>
            {children}
        </span>
    )
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
