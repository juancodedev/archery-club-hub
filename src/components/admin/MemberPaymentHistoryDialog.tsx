import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { CalendarDays, DollarSign, Wallet } from "lucide-react";

interface MemberPaymentHistoryDialogProps {
    memberId: string | null;
    memberName: string;
    clubId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function MemberPaymentHistoryDialog({
    memberId,
    memberName,
    clubId,
    open,
    onOpenChange
}: MemberPaymentHistoryDialogProps) {
    const { data: payments, isLoading } = useQuery({
        queryKey: ["member-payments", memberId],
        queryFn: async () => {
            if (!memberId) return [];
            const { data, error } = await supabase
                .from("financial_entries")
                .select("*")
                .eq("member_id", memberId)
                .eq("club_id", clubId)
                .order("entry_date", { ascending: false });

            if (error) throw error;
            return data;
        },
        enabled: !!memberId && open,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] glass">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Historial de Pagos - {memberName}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="text-center py-10 text-muted-foreground animate-pulse">
                            Cargando historial de pagos...
                        </div>
                    ) : !payments || payments.length === 0 ? (
                        <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border">
                            <DollarSign className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
                            <p className="text-muted-foreground font-medium">No hay registros de pagos para este miembro.</p>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border/50 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Categoría / Periodo</TableHead>
                                        <TableHead className="text-right">Monto</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((p) => (
                                        <TableRow key={p.id}>
                                            <TableCell className="text-xs">
                                                {new Date(p.entry_date).toLocaleDateString("es-CL")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Badge variant="outline" className="w-fit text-[10px] capitalize">
                                                        {p.category}
                                                    </Badge>
                                                    {p.payment_month && p.payment_year && (
                                                        <span className="text-[10px] font-bold text-foreground mt-1 flex items-center gap-1">
                                                            <CalendarDays className="h-3 w-3 text-primary" />
                                                            {new Date(2000, p.payment_month - 1).toLocaleString('es-ES', { month: 'long' })} {p.payment_year}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">
                                                {formatCurrency(p.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
