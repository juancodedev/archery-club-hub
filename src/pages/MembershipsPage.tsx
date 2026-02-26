import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wallet, Search, Filter, CheckCircle2, XCircle, AlertCircle, CalendarDays } from "lucide-react";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function MembershipsPage() {
    const { member } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const clubId = member?.club_id;

    const { data: membersData, isLoading } = useQuery({
        queryKey: ["club-memberships-status", clubId],
        queryFn: async () => {
            if (!clubId) return [];
            
            // 1. Fetch all members of the club
            const { data: members, error: membersError } = await supabase
                .from("members")
                .select("*")
                .eq("club_id", clubId)
                .eq("status", "activo")
                .order("full_name");

            if (membersError) throw membersError;

            // 2. Fetch all membership payments for the last 6 months
            const now = new Date();
            const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
            
            const { data: payments, error: paymentsError } = await supabase
                .from("financial_entries")
                .select("*")
                .eq("club_id", clubId)
                .gte("entry_date", startMonth.toISOString().split('T')[0])
                .or('category.ilike.membresía,category.ilike.membresia,category.ilike.cuota mensual');

            if (paymentsError) throw paymentsError;

            return members.map(m => {
                const billingDay = m.billing_day || new Date(m.enrollment_date).getDate();
                const graceDays = m.grace_days ?? 7;
                
                // Calculate status for each of the last 6 months
                const monthsStatus = Array.from({ length: 6 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    const month = d.getMonth() + 1;
                    const year = d.getFullYear();
                    
                    const paid = payments?.some(p => 
                        p.member_id === m.id && 
                        p.payment_month === month && 
                        p.payment_year === year
                    );

                    let status = paid ? "paid" : "pending";
                    
                    // If it's the current month and hasn't been paid, check if it's overdue
                    if (!paid && i === 0) {
                        if (now.getDate() > (billingDay + graceDays)) {
                            status = "overdue";
                        }
                    } else if (!paid && i > 0) {
                        // Past months not paid are always overdue
                        status = "overdue";
                    }

                    return { month, year, status, label: d.toLocaleString('es-ES', { month: 'short' }) };
                }).reverse();

                const isOverdue = monthsStatus.some(ms => ms.status === 'overdue');

                return {
                    ...m,
                    monthsStatus,
                    overallStatus: isOverdue ? "atrasado" : "al día"
                };
            });
        },
        enabled: !!clubId
    });

    const filteredMembers = useMemo(() => {
        return membersData?.filter(m => {
            const matchesSearch = m.full_name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "all" || 
                                 (statusFilter === "overdue" && m.overallStatus === "atrasado") ||
                                 (statusFilter === "ok" && m.overallStatus === "al día");
            return matchesSearch && matchesStatus;
        });
    }, [membersData, searchTerm, statusFilter]);

    return (
        <div className="space-y-6 pb-10">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                    <Wallet className="h-8 w-8 text-primary" />
                    Estado de Membresías
                </h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">Seguimiento global de cuotas mensuales del club.</p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar arquero..." 
                        className="pl-10 glass border-primary/10 h-11 rounded-xl"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48 h-11 glass border-primary/10 rounded-xl">
                        <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="overdue">Atrasados</SelectItem>
                        <SelectItem value="ok">Al día</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-24 w-full glass animate-pulse rounded-2xl" />
                    ))
                ) : filteredMembers?.length === 0 ? (
                    <div className="text-center py-20 glass rounded-2xl border-dashed border-2">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">No se encontraron registros.</p>
                    </div>
                ) : (
                    filteredMembers?.map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="glass rounded-2xl p-4 sm:p-5 border-l-4 border-l-transparent transition-all hover:border-l-primary"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-foreground text-lg">{m.full_name}</h3>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={m.overallStatus === "al día" ? "secondary" : "destructive"} className="text-[10px] h-5">
                                            {m.overallStatus.toUpperCase()}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <CalendarDays className="h-3 w-3" /> Cobro: día {m.billing_day || new Date(m.enrollment_date).getDate()}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                                    {m.monthsStatus.map((ms: any, idx: number) => (
                                        <div 
                                            key={idx} 
                                            className={cn(
                                                "min-w-[50px] p-2 rounded-xl border text-center transition-all",
                                                ms.status === "paid" ? "bg-emerald-500/10 border-emerald-500/30" : 
                                                ms.status === "overdue" ? "bg-rose-500/10 border-rose-500/30" : 
                                                "bg-muted/50 border-border/50"
                                            )}
                                        >
                                            <p className="text-[8px] uppercase font-bold text-muted-foreground">{ms.label}</p>
                                            <div className="mt-1 flex justify-center">
                                                {ms.status === "paid" ? (
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                                ) : ms.status === "overdue" ? (
                                                    <XCircle className="h-3.5 w-3.5 text-rose-500" />
                                                ) : (
                                                    <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
