import { motion } from "framer-motion";
import { Check, Info, Zap, HelpCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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

export default function BillingPage() {
    const [isAnnualPro, setIsAnnualPro] = useState(false);
    const [isAnnualBusiness, setIsAnnualBusiness] = useState(false);

    const plans = [
        {
            name: "Pro",
            description: "Diseñado para clubes rápidos que construyen juntos en tiempo real.",
            monthlyPrice: 25,
            annualPrice: 20,
            features: [
                "100 créditos mensuales",
                "5 créditos diarios (hasta 150/mes)",
                "Nube basada en uso + IA",
                "Acumulación de créditos",
            ],
            buttonText: "Actualizar",
            isAnnual: isAnnualPro,
            setIsAnnual: setIsAnnualPro,
            accent: "bg-primary text-white hover:bg-primary/90 shadow-lg glow-primary",
            border: "border-primary/20",
        },
        {
            name: "Business",
            description: "Controles avanzados y funciones de potencia para departamentos en crecimiento.",
            monthlyPrice: 50,
            annualPrice: 40,
            features: [
                "100 créditos mensuales",
                "Publicación interna",
                "SSO",
                "Espacio de trabajo en equipo",
            ],
            buttonText: "Actualizar",
            isAnnual: isAnnualBusiness,
            setIsAnnual: setIsAnnualBusiness,
            accent: "variant-outline border-border hover:bg-muted font-medium",
            border: "border-border/50",
        },
        {
            name: "Enterprise",
            description: "Construido para grandes organizaciones que necesitan flexibilidad, escala y gobernanza.",
            isCustom: true,
            features: [
                "Soporte dedicado",
                "Servicios de incorporación",
                "Sistemas de diseño",
                "SCIM",
            ],
            buttonText: "Reservar una demo",
            accent: "variant-outline border-border hover:bg-muted font-medium",
            border: "border-border/50",
        },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-10 pb-20">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Planes y créditos</h1>
                    <p className="text-muted-foreground mt-1.5 text-sm">Administra tu plan de suscripción y saldo de créditos.</p>
                </div>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground gap-2 transition-colors">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Docs</span>
                </Button>
            </motion.div>

            {/* Usage Overview Section */}
            <div className="grid gap-6 md:grid-cols-12">
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="md:col-span-12 lg:col-span-5 glass rounded-2xl p-7 flex flex-col justify-between group cursor-default h-full"
                >
                    <div className="flex items-start gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#ff6b00] via-[#ff3d00] to-[#ff0055] flex items-center justify-center text-white shadow-2xl shadow-orange-500/20 group-hover:scale-105 transition-transform duration-500">
                            <Zap className="h-7 w-7 fill-white/20" />
                        </div>
                        <div>
                            <h3 className="text-xl font-display font-bold text-foreground">Estás en el Plan Gratuito</h3>
                            <p className="text-muted-foreground text-sm mt-0.5 font-medium group-hover:text-primary/70 transition-colors">Actualiza en cualquier momento</p>
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
                            <h3 className="font-display font-bold text-foreground">Créditos restantes</h3>
                            <span className="text-sm font-bold bg-muted px-2.5 py-1 rounded-full text-foreground/80">0 de 10</span>
                        </div>
                        <div className="relative h-2.5 w-full bg-muted/30 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "0%" }}
                                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                            />
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive">
                                <span className="text-lg">✕</span>
                            </div>
                            <span>Créditos no acumulables</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
                            <div className="h-3 w-3 rounded-full bg-destructive/60 animate-pulse ml-2" />
                            <span>Sin créditos disponibles</span>
                        </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border/10 flex items-center gap-2 text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        Reinicio diario a las 00:00 UTC
                    </div>
                </motion.div>
            </div>

            {/* Pricing Grid */}
            <div className="grid gap-6 lg:grid-cols-3 pt-6">
                {plans.map((plan, index) => (
                    <motion.div
                        key={plan.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={cn(
                            "flex flex-col relative rounded-[2rem] p-8 border bg-card/20 backdrop-blur-md hover:bg-card/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 group",
                            plan.border,
                            index === 0 && "lg:scale-[1.02] z-10 border-primary/30"
                        )}
                    >
                        {index === 0 && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                Recomendado
                            </div>
                        )}

                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-display font-bold text-foreground transition-colors group-hover:text-primary">{plan.name}</h3>
                            </div>
                            <p className="text-muted-foreground text-sm mt-4 leading-relaxed font-medium">
                                {plan.description}
                            </p>

                            <div className="mt-10 mb-8 h-20 flex flex-col justify-center">
                                {plan.isCustom ? (
                                    <h4 className="text-4xl font-display font-bold text-foreground">Custom</h4>
                                ) : (
                                    <div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-display font-bold text-foreground tracking-tighter">
                                                ${plan.isAnnual ? plan.annualPrice : plan.monthlyPrice}
                                            </span>
                                            <span className="text-muted-foreground text-sm font-semibold">/ mes</span>
                                        </div>
                                        <p className="text-muted-foreground text-[11px] mt-2 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                            <UsersIcon className="h-3 w-3" />
                                            Usuarios ilimitados
                                        </p>
                                    </div>
                                )}
                            </div>

                            {!plan.isCustom && plan.setIsAnnual && (
                                <div className="flex items-center justify-between bg-muted/40 p-4 rounded-2xl mb-8 border border-border/10">
                                    <span className="text-xs font-bold text-foreground/70 uppercase tracking-widest">Facturación Anual</span>
                                    <div className="flex items-center gap-3">
                                        {plan.isAnnual && (
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-2 py-0.5 rounded-full">
                                                SAVE 20%
                                            </span>
                                        )}
                                        <Switch
                                            checked={plan.isAnnual}
                                            onCheckedChange={plan.setIsAnnual}
                                            className="data-[state=checked]:bg-primary scale-90"
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                variant={plan.accent.includes("variant-outline") ? "outline" : "default"}
                                className={cn(
                                    "w-full h-12 rounded-2xl mb-8 font-bold text-sm tracking-wide transition-all duration-300 active:scale-95 px-0",
                                    !plan.accent.includes("variant-outline") && plan.accent
                                )}
                            >
                                {plan.buttonText}
                            </Button>

                            {!plan.isCustom && (
                                <div className="mb-10">
                                    <Select defaultValue="100">
                                        <SelectTrigger className="w-full h-12 rounded-2xl bg-muted/20 border-border/30 text-sm font-semibold hover:bg-muted/30 transition-colors focus:ring-primary/20">
                                            <SelectValue placeholder="Créditos" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/50">
                                            <SelectItem value="100">100 créditos / mes</SelectItem>
                                            <SelectItem value="500">500 créditos / mes</SelectItem>
                                            <SelectItem value="1000">1000 créditos / mes</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-4 pt-4 border-t border-border/10">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                                    Funciones incluidas:
                                </p>
                                {plan.features.map((feature) => (
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
                            <a href="#" className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-primary transition-colors uppercase tracking-widest">
                                Ver todas las funciones
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
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
