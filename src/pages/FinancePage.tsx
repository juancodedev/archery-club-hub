import { useState, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    Filter,
    Download,
    Receipt,
    Trash2,
    User,
    Pencil,
    History as HistoryIcon,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import FinanceForm from "@/components/admin/FinanceForm";
import { logger } from "@/lib/logger";
import { isReadOnlyMode } from "@/lib/permissions";
import ConfirmDialog from "@/components/ui/confirm-dialog";

interface Club { id: string; name: string; allow_superadmin_finances: boolean; financial_support_expires_at?: string | null; }
interface FinancialEntry {
    id: string;
    type: "income" | "expense";
    amount: number;
    entry_date: string;
    category: string;
    description: string | null;
    receipt_url: string | null;
    receipt_urls: string[] | null;
    members?: { full_name: string } | null;
}

export default function FinancePage() {
    const { member } = useAuth();
    const isSuperAdmin = member?.is_super_admin;
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<"income" | "expense" | null>(null);
    const [selectedClubId, setSelectedClubId] = useState<string>(member?.club_id || "");
    const [clubs, setClubs] = useState<Club[]>([]);
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    useEffect(() => {
        if (isSuperAdmin) {
            fetchClubs();
        } else if (member?.club_id) {
            setSelectedClubId(member.club_id);
        }
    }, [member, isSuperAdmin, selectedClubId]);

    const fetchClubs = async () => {
        const { data } = await supabase
            .from("clubs")
            .select("id, name, allow_superadmin_finances, financial_support_expires_at")
            .eq("allow_superadmin_finances", true)
            .or(`financial_support_expires_at.is.null,financial_support_expires_at.gt.${new Date().toISOString()}`)
            .order("name");

        if (data) {
            setClubs(data as unknown as Club[]);
        }
    };

    const clubId = selectedClubId;

    const { data: entries, isLoading } = useQuery<FinancialEntry[]>({
        queryKey: ["financial-entries", clubId, categoryFilter],
        queryFn: async () => {
            if (!clubId) return [];
            let query = supabase
                .from("financial_entries")
                .select("*, members(full_name)")
                .eq("club_id", clubId);

            if (categoryFilter !== "all") {
                if (categoryFilter === "Otros") {
                    query = query.neq("category", "Membresía");
                } else {
                    query = query.eq("category", categoryFilter);
                }
            }

            const { data, error } = await query.order("entry_date", { ascending: false });

            if (error) throw error;
            return data as unknown as FinancialEntry[];
        },
        enabled: !!clubId,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("financial_entries")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
            toast({ title: "Registro eliminado correctamente" });
        },
        onError: (error: Error) => {
            toast({
                title: "Error al eliminar",
                description: error.message,
                variant: "destructive"
            });
        }
    });

    const totals = entries?.reduce((acc, entry) => {
        if (entry.type === "income") acc.income += Number(entry.amount);
        else acc.expense += Number(entry.amount);
        return acc;
    }, { income: 0, expense: 0 }) || { income: 0, expense: 0 };

    const balance = totals.income - totals.expense;

    const financeDesktopRef = useRef<HTMLDivElement>(null);
    const financeMobileRef = useRef<HTMLDivElement>(null);

    const desktopFinanceVirtualizer = useVirtualizer({
        count: entries?.length ?? 0,
        getScrollElement: () => financeDesktopRef.current,
        estimateSize: () => 64,
        getItemKey: (index) => entries?.[index]?.id ?? index,
    });

    const mobileFinanceVirtualizer = useVirtualizer({
        count: entries?.length ?? 0,
        getScrollElement: () => financeMobileRef.current,
        estimateSize: () => 200,
        getItemKey: (index) => entries?.[index]?.id ?? index,
    });

    const openForm = (type: "income" | "expense", entry?: FinancialEntry) => {
        setSelectedType(type);
        setEditingEntry(entry || null);
        setIsFormOpen(true);
    };

    const handleViewReceipt = async (receiptUrl: string | null, receiptUrls?: string[] | null) => {
        const urlsToOpen = receiptUrls && receiptUrls.length > 0 ? receiptUrls : (receiptUrl ? [receiptUrl] : []);

        if (urlsToOpen.length === 0) return;

        try {
            for (const url of urlsToOpen) {
                if (url.startsWith('http')) {
                    window.open(url, "_blank");
                    continue;
                }

                const { data, error } = await supabase.storage
                    .from("receipts")
                    .createSignedUrl(url, 300);

                if (error) throw error;
                if (data?.signedUrl) {
                    window.open(data.signedUrl, "_blank");
                }
            }
        } catch (error: unknown) {
            logger.error(error);
            toast({
                title: "Error al abrir comprobante",
                description: "No se pudo generar el enlace seguro.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <DollarSign className="h-7 w-7 text-primary" />
                        Finanzas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Reporte de ingresos, gastos y balance del club</p>

                    {isSuperAdmin && (
                        <div className="mt-4 w-full max-w-xs">
                            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                                <SelectTrigger className="glass h-11">
                                    <SelectValue placeholder="Seleccionar club" />
                                </SelectTrigger>
                                <SelectContent>
                                    {clubs.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-3">
                    <Button
                        onClick={() => openForm("income")}
                        disabled={!clubId || isReadOnlyMode(member)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20 h-11 text-xs"
                    >
                        <Plus className="h-4 w-4" /> <span className="hidden xs:inline">{isReadOnlyMode(member) ? "Bloqueado" : "Ingreso"}</span>
                    </Button>
                    <Button
                        onClick={() => openForm("expense")}
                        variant="destructive"
                        disabled={!clubId || isReadOnlyMode(member)}
                        className="gap-2 shadow-lg shadow-destructive/20 h-11 text-xs"
                    >
                        <Plus className="h-4 w-4" /> <span className="hidden xs:inline">{isReadOnlyMode(member) ? "Bloqueado" : "Gasto"}</span>
                    </Button>
                </div>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                    <Card className="glass overflow-hidden border-emerald-500/20 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Ingresos</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums">{formatCurrency(totals.income)}</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="glass overflow-hidden border-destructive/20 shadow-lg">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Gastos</CardTitle>
                            <TrendingDown className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-xl sm:text-2xl font-black text-destructive tabular-nums">{formatCurrency(totals.expense)}</div>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="glass overflow-hidden border-primary/20 shadow-lg relative group">
                        <div className={cn(
                            "absolute inset-0 opacity-5 transition-opacity group-hover:opacity-10",
                            balance >= 0 ? "bg-primary" : "bg-destructive"
                        )} />
                        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
                            <CardTitle className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Balance</CardTitle>
                            <DollarSign className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent className="relative">
                            <div className={cn(
                                "text-xl sm:text-2xl font-black tabular-nums",
                                balance >= 0 ? "text-primary" : "text-destructive"
                            )}>
                                {formatCurrency(balance)}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Transactions Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-3xl overflow-hidden border-border/50 shadow-2xl"
            >
                <div className="p-5 sm:p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-display font-bold text-lg flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5 text-primary" />
                        Transacciones
                    </h3>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-10 w-full sm:w-40 glass border-primary/20 rounded-xl">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filtrar" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="Membresía">Membresía</SelectItem>
                                <SelectItem value="Otros">Otros Pagos</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="gap-2 h-10 w-full sm:w-auto rounded-xl border-primary/10">
                            <Download className="h-4 w-4" /> Exportar
                        </Button>
                    </div>
                </div>

                {/* Desktop Grid View (lg+) — CSS Grid instead of table for virtual scroll compat */}
                <div className="hidden lg:block">
                    <div ref={financeDesktopRef} style={{ height: 'calc(100vh - 350px)', minHeight: '400px', overflowY: 'auto' }}>
                        {/* Header */}
                        <div className="bg-muted/30 sticky top-0 z-10 grid items-center text-sm font-bold text-foreground border-b border-border/50"
                            style={{ gridTemplateColumns: '1.5fr 2fr 2.5fr 1.5fr 1.5fr', padding: '12px 16px' }}>
                            <div>Fecha</div>
                            <div>Categoría / Miembro</div>
                            <div>Descripción</div>
                            <div className="text-right">Monto</div>
                            <div className="text-center">Acciones</div>
                        </div>
                        {isLoading ? (
                            <div className="text-center py-20 text-muted-foreground animate-pulse font-medium italic">Sincronizando con el banco central de Quiver...</div>
                        ) : entries?.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground font-medium italic">No hay transacciones registradas.</div>
                        ) : (
                            <div style={{ position: 'relative', height: `${desktopFinanceVirtualizer.getTotalSize()}px` }}>
                                {desktopFinanceVirtualizer.getVirtualItems().map((virtualItem) => {
                                    const entry = entries![virtualItem.index];
                                    return (
                                        <div
                                            key={entry.id}
                                            className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                height: `${virtualItem.size}px`,
                                                transform: `translateY(${virtualItem.start}px)`,
                                                display: 'grid',
                                                gridTemplateColumns: '1.5fr 2fr 2.5fr 1.5fr 1.5fr',
                                                alignItems: 'center',
                                                padding: '12px 16px',
                                                fontSize: '0.875rem',
                                            }}
                                        >
                                            <div className="font-bold text-xs truncate pr-2">{new Date(entry.entry_date).toLocaleDateString("es-CL")}</div>
                                            <div className="truncate pr-2">
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="capitalize w-fit text-[10px] font-bold border-primary/30">
                                                        {entry.category}
                                                    </Badge>
                                                    {entry.members && (
                                                        <span className="text-[10px] font-medium text-foreground mt-0.5 flex items-center gap-1">
                                                            <User className="h-3 w-3 text-primary/60" />
                                                            {entry.members.full_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground pr-2">{entry.description || "-"}</div>
                                            <div className={cn("text-right font-black tabular-nums truncate pr-2", entry.type === "income" ? "text-emerald-600" : "text-rose-600")}>
                                                {entry.type === "income" ? "+" : "-"} {formatCurrency(entry.amount)}
                                            </div>
                                            <div className="flex items-center justify-center gap-1">
                                                {(entry.receipt_urls?.length ?? 0) > 0 ? (
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-primary relative" onClick={() => handleViewReceipt(null, entry.receipt_urls)}>
                                                        <Receipt className="h-4 w-4" />
                                                        {entry.receipt_urls!.length > 1 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{entry.receipt_urls!.length}</span>}
                                                    </Button>
                                                ) : entry.receipt_url && (
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-primary" onClick={() => handleViewReceipt(entry.receipt_url)}>
                                                            <Receipt className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary" onClick={() => openForm(entry.type as "expense" | "income", entry)} disabled={isReadOnlyMode(member)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => setDeleteTargetId(entry.id)} disabled={isReadOnlyMode(member)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile/Tablet Card View (<lg) */}
                <div ref={financeMobileRef} style={{ height: 'calc(100vh - 350px)', minHeight: '400px', overflowY: 'auto' }} className="lg:hidden p-4 bg-muted/10">
                    {isLoading ? (
                        <div className="text-center py-20 animate-pulse italic text-muted-foreground">Cargando transacciones...</div>
                    ) : entries?.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground italic">No hay registros.</div>
                    ) : (
                        <div style={{ position: 'relative', height: `${mobileFinanceVirtualizer.getTotalSize()}px` }}>
                            {mobileFinanceVirtualizer.getVirtualItems().map((virtualItem) => {
                                const entry = entries![virtualItem.index];
                                return (
                                    <div
                                        key={entry.id}
                                        className="absolute top-0 left-0 w-full"
                                        style={{
                                            height: `${virtualItem.size}px`,
                                            transform: `translateY(${virtualItem.start}px)`,
                                            paddingBottom: '16px',
                                        }}
                                    >
                                        <div
                                            className="p-5 rounded-2xl bg-card border border-border/50 space-y-4 shadow-sm active:scale-[0.98] transition-transform"
                                        >
                            <div className="flex justify-between items-start">
                                <div className="space-y-1.5">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest">{new Date(entry.entry_date).toLocaleDateString("es-CL")}</p>
                                    <Badge variant="outline" className="text-[9px] font-bold capitalize bg-primary/5 border-primary/20 h-5 px-2">
                                        {entry.category}
                                    </Badge>
                                </div>
                                <div className={cn(
                                    "text-xl font-black tabular-nums",
                                    entry.type === "income" ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {entry.type === "income" ? "+" : "-"} {formatCurrency(entry.amount)}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                {entry.members && (
                                    <div className="flex items-center gap-2 text-[10px] font-bold py-1.5 px-3 bg-muted rounded-xl w-fit border border-border/30">
                                        <User className="h-3 w-3 text-primary" />
                                        {entry.members.full_name.toUpperCase()}
                                    </div>
                                )}
                                {entry.description && (
                                    <p className="text-xs text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3">"{entry.description}"</p>
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/30">
                                <div className="flex gap-1">
                                    {(entry.receipt_urls?.length ?? 0) > 0 ? (
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-primary text-[10px] font-bold rounded-lg border-primary/20 relative" onClick={() => handleViewReceipt(null, entry.receipt_urls)}>
                                            <Receipt className="h-3.5 w-3.5" />
                                            RECIBO ({entry.receipt_urls!.length})
                                        </Button>
                                    ) : entry.receipt_url && (
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-primary text-[10px] font-bold rounded-lg border-primary/20" onClick={() => handleViewReceipt(entry.receipt_url)}>
                                            <Receipt className="h-3.5 w-3.5" /> RECIBO
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground text-[10px] font-bold" onClick={() => openForm(entry.type as "expense" | "income", entry)} disabled={isReadOnlyMode(member)}>
                                        <Pencil className="h-3.5 w-3.5" /> EDITAR
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1.5 text-destructive text-[10px] font-bold hover:bg-destructive/5"
                                        disabled={isReadOnlyMode(member)}
                                        onClick={() => setDeleteTargetId(entry.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
            </div>
        )}
    </div>
    </motion.div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[500px] glass p-0 border-none overflow-hidden rounded-[2rem]">
                    <DialogHeader className="sr-only">
                        <DialogTitle>
                            {selectedType === "income" ? "Registrar Ingreso" : "Registrar Gasto"}
                        </DialogTitle>
                    </DialogHeader>
                    {clubId && (
                        <FinanceForm
                            type={selectedType || "income"}
                            initialData={editingEntry ?? undefined}
                            onSuccess={() => {
                                setIsFormOpen(false);
                                setEditingEntry(null);
                                queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
                            }}
                            onCancel={() => {
                                setIsFormOpen(false);
                                setEditingEntry(null);
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
            <ConfirmDialog
                open={!!deleteTargetId}
                onOpenChange={(open) => !open && setDeleteTargetId(null)}
                title="Eliminar registro"
                description="¿Estás seguro de que deseas eliminar este registro financiero? Esta acción no se puede deshacer."
                confirmLabel="Eliminar"
                variant="destructive"
                onConfirm={() => {
                    if (deleteTargetId) {
                        deleteMutation.mutate(deleteTargetId);
                        setDeleteTargetId(null);
                    }
                }}
            />
        </div>
    );
}


