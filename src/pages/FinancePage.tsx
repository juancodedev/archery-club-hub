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
    Pencil,
    User,
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

export default function FinancePage() {
    const { member } = useAuth();
    const isSuperAdmin = member?.is_super_admin;
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedType, setSelectedType] = useState<"income" | "expense" | null>(null);
    const [selectedClubId, setSelectedClubId] = useState<string>(member?.club_id || "");
    const [clubs, setClubs] = useState<any[]>([]);
    const [editingEntry, setEditingEntry] = useState<any>(null);
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
            // If the current club is not in the allowed list, reset it
            if (data.length > 0 && !data.find(c => c.id === selectedClubId)) {
                // We don't automatically select the first one to avoid confusion
                // but we could if we want. For now, we just clear it if it's invalid.
            }
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
        onError: (error: any) => {
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

    const openForm = (type: "income" | "expense", entry?: any) => {
        setSelectedType(type);
        setEditingEntry(entry || null);
        setIsFormOpen(true);
    };

    const handleViewReceipt = async (receiptUrl: string | null) => {
        if (!receiptUrl) return;

        try {
            // Check if it's already a full URL (legacy) or a path
            if (receiptUrl.startsWith('http')) {
                window.open(receiptUrl, "_blank");
                return;
            }

            // Generate signed URL for private bucket
            const { data, error } = await supabase.storage
                .from("receipts")
                .createSignedUrl(receiptUrl, 300); // 5 minutes

            if (error) throw error;
            if (data?.signedUrl) {
                window.open(data.signedUrl, "_blank");
            }
        } catch (error: any) {
            toast({
                title: "Error al abrir comprobante",
                description: "No se pudo generar el enlace seguro.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground flex items-center gap-3">
                        <DollarSign className="h-8 w-8 text-primary" />
                        Gestión Financiera
                    </h1>
                    <p className="text-muted-foreground mt-1">Control de ingresos, gastos y reporte de balance</p>

                    {isSuperAdmin && (
                        <div className="mt-4 w-full max-w-xs">
                            <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                                <SelectTrigger className="glass border-primary/20">
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
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => openForm("income")}
                        disabled={!clubId}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-600/20"
                    >
                        <Plus className="h-4 w-4" /> Registrar Ingreso
                    </Button>
                    <Button
                        onClick={() => openForm("expense")}
                        variant="destructive"
                        className="gap-2 shadow-lg shadow-destructive/20"
                    >
                        <Plus className="h-4 w-4" /> Registrar Gasto
                    </Button>
                </div>
            </motion.div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card className="glass overflow-hidden border-emerald-500/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ingresos</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totals.income)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Acumulado histórico</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Card className="glass overflow-hidden border-destructive/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gastos</CardTitle>
                            <TrendingDown className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.expense)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Acumulado histórico</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="glass overflow-hidden border-primary/20">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Balance General</CardTitle>
                            <DollarSign className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className={cn(
                                "text-2xl font-bold",
                                balance >= 0 ? "text-primary" : "text-destructive"
                            )}>
                                {formatCurrency(balance)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Saldo disponible</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Transactions Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="glass rounded-2xl overflow-hidden border-border/50"
            >
                <div className="p-6 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="font-display font-bold text-lg flex items-center gap-2">
                        <HistoryIcon className="h-5 w-5 text-primary" />
                        Historial de Transacciones
                    </h3>
                    <div className="flex items-center gap-2">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="h-9 w-40 glass border-primary/20">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue placeholder="Filtrar por..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todo</SelectItem>
                                <SelectItem value="Membresía">Membresía</SelectItem>
                                <SelectItem value="Otros">Otros Pagos</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" className="gap-2 h-9">
                            <Download className="h-4 w-4" /> Exportar
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[120px]">Fecha</TableHead>
                                <TableHead>Categoría / Miembro</TableHead>
                                <TableHead className="hidden md:table-cell">Descripción</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="w-[100px] text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Cargando transacciones...</TableCell>
                                </TableRow>
                            ) : entries?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No hay transacciones registradas todavía.</TableCell>
                                </TableRow>
                            ) : entries?.map((entry) => (
                                <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="font-medium">
                                        {new Date(entry.entry_date).toLocaleDateString("es-CL")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <Badge variant="outline" className="capitalize w-fit">
                                                {entry.category}
                                            </Badge>
                                            {entry.members && (
                                                <span className="text-xs font-medium text-foreground mt-1 flex items-center gap-1">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    {entry.members.full_name}
                                                </span>
                                            )}
                                            {(entry.payment_month && entry.payment_year) && (
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                                    {new Date(2000, entry.payment_month - 1).toLocaleString('es-ES', { month: 'short' })} {entry.payment_year}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell max-w-[200px] truncate">
                                        {entry.description || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {entry.type === "income" ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                                                    Ingreso
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none">
                                                    Gasto
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className={cn(
                                        "text-right font-bold",
                                        entry.type === "income" ? "text-emerald-600" : "text-rose-600"
                                    )}>
                                        {entry.type === "income" ? "+" : "-"} {formatCurrency(entry.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            {entry.receipt_url && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-primary"
                                                    onClick={() => handleViewReceipt(entry.receipt_url)}
                                                >
                                                    <Receipt className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                onClick={() => openForm(entry.type, entry)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => {
                                                    if (confirm("¿Estás seguro de eliminar este registro?")) {
                                                        deleteMutation.mutate(entry.id);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </motion.div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-[500px] glass p-0 border-none overflow-hidden">
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
