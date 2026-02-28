import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
    DollarSign,
    TrendingUp,
    TrendingDown,
    Plus,
    FileText,
    Calendar as CalendarIcon,
    Filter,
    Download,
    Receipt,
    Eye,
    Trash2,
    User,
    Pencil,
    History as HistoryIcon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import FinanceForm from "@/components/admin/FinanceForm";

interface Club { id: string; name: string; allow_superadmin_finances: boolean; }
interface FinancialEntry {
    id: string;
    type: "income" | "expense";
    amount: number;
    entry_date: string;
    category: string;
    description: string | null;
    receipt_url: string | null;
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
    const [categoryFilter, setCategoryFilter] = useState<string>("all");

    useEffect(() => {
        if (isSuperAdmin) {
            fetchClubs();
        } else if (member?.club_id) {
            setSelectedClubId(member.club_id);
        }
    }, [member, isSuperAdmin]);

    const fetchClubs = async () => {
        const { data } = await supabase
            .from("clubs")
            .select("id, name, allow_superadmin_finances")
            .eq("allow_superadmin_finances", true)
            .order("name");

        if (data) {
            setClubs(data);
        }
    };

    const clubId = selectedClubId;

    const { data: entries, isLoading } = useQuery({
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
            return data;
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

    const openForm = (type: "income" | "expense", entry?: FinancialEntry) => {
        setSelectedType(type);
        setEditingEntry(entry || null);
        setIsFormOpen(true);
    };

    const handleViewReceipt = async (receiptUrl: string | null) => {
        if (!receiptUrl) return;

        try {
            if (receiptUrl.startsWith('http')) {
                window.open(receiptUrl, "_blank");
                return;
            }

            const { data, error } = await supabase.storage
                .from("receipts")
                .createSignedUrl(receiptUrl, 300);

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, "_blank");
            }
        } catch (error: unknown) {
            console.error(error);
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
                        disabled={!clubId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20 h-11 text-xs"
                    >
                        <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Ingreso</span>
                    </Button>
                    <Button
                        onClick={() => openForm("expense")}
                        variant="destructive"
                        className="gap-2 shadow-lg shadow-destructive/20 h-11 text-xs"
                    >
                        <Plus className="h-4 w-4" /> <span className="hidden xs:inline">Gasto</span>
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

                {/* Desktop Table View (lg+) */}
                <div className="hidden lg:block overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[120px] font-bold">Fecha</TableHead>
                                <TableHead className="font-bold">Categoría / Miembro</TableHead>
                                <TableHead className="font-bold">Descripción</TableHead>
                                <TableHead className="font-bold text-right">Monto</TableHead>
                                <TableHead className="w-[150px] text-center font-bold">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground animate-pulse font-medium italic">Sincronizando con el banco central de Quiver...</TableCell>
                                </TableRow>
                            ) : entries?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-medium italic">No hay transacciones registradas.</TableCell>
                                </TableRow>
                            ) : entries?.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors border-border/30">
                                    <TableCell className="font-bold text-xs">
                                        {new Date(entry.entry_date).toLocaleDateString("es-CL")}
                                    </TableCell>
                                    <TableCell>
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
                                    </TableCell>
                                    <TableCell className="max-w-[250px] truncate text-xs text-muted-foreground">
                                        {entry.description || "-"}
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-black tabular-nums",
                                        entry.type === "income" ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {entry.type === "income" ? "+" : "-"} {formatCurrency(entry.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            {entry.receipt_url && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => handleViewReceipt(entry.receipt_url)}>
                                                    <Receipt className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => openForm(entry.type, entry)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("¿Eliminar?")) deleteMutation.mutate(entry.id); }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile/Tablet Card View (<lg) */}
                <div className="lg:hidden p-4 space-y-4 bg-muted/10">
                    {isLoading ? (
                        <div className="text-center py-20 animate-pulse italic text-muted-foreground">Cargando transacciones...</div>
                    ) : entries?.length === 0 ? (
                        <div className="text-center py-20 text-muted-foreground italic">No hay registros.</div>
                    ) : entries?.map((entry) => (
                        <motion.div
                            key={entry.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
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
                                    {entry.receipt_url && (
                                        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-primary text-[10px] font-bold rounded-lg border-primary/20" onClick={() => handleViewReceipt(entry.receipt_url)}>
                                            <Receipt className="h-3.5 w-3.5" /> RECIBO
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground text-[10px] font-bold" onClick={() => openForm(entry.type, entry)}>
                                        <Pencil className="h-3.5 w-3.5" /> EDITAR
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-1.5 text-destructive text-[10px] font-bold hover:bg-destructive/5"
                                        onClick={() => { if (confirm("¿Eliminar?")) deleteMutation.mutate(entry.id); }}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
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
                            initialData={editingEntry}
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
        </div>
    );
}

function History({ className }: { className?: string }) {
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
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </svg>
    );
}
