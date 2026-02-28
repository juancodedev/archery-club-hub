import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    DollarSign,
    Calendar as CalendarIcon,
    Tag,
    FileText,
    Upload,
    X,
    CreditCard,
    Ticket,
    User,
    CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface FinanceFormProps {
    type: "income" | "expense";
    onSuccess: () => void;
    onCancel: () => void;
}

const CATEGORIES = {
    income: ["Membresía", "Otros Pagos", "Torneo", "Venta Equipamiento", "Capacitación", "Otro"],
    expense: ["Mantenimiento", "Alquiler", "Equipamiento", "Premiación", "Servicios", "Insumos", "Otro"]
};

interface InitialData {
    id?: string;
    amount?: number;
    category?: string;
    description?: string;
    entry_date?: string;
    receipt_url?: string | null;
    member_id?: string | null;
    payment_month?: number;
    payment_year?: number;
}

export default function FinanceForm({ type, onSuccess, onCancel, initialData }: FinanceFormProps & { initialData?: InitialData }) {
    const { member } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [amount, setAmount] = useState(initialData?.amount ? String(initialData.amount) : "");
    const [category, setCategory] = useState(initialData?.category || "");
    const [description, setDescription] = useState(initialData?.description || "");
    const [date, setDate] = useState(initialData?.entry_date || new Date().toISOString().split("T")[0]);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(initialData?.receipt_url || null);
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(initialData?.member_id || null);
    const [paymentMonth, setPaymentMonth] = useState<string>(String(initialData?.payment_month || new Date().getMonth() + 1));
    const [paymentYear, setPaymentYear] = useState<string>(String(initialData?.payment_year || new Date().getFullYear()));

    const clubId = member?.club_id;

    // Fetch club to get default fees
    const { data: club } = useQuery({
        queryKey: ["club-fees", clubId],
        queryFn: async () => {
            if (!clubId) return null;
            const { data, error } = await supabase.from("clubs").select("inscription_fee, monthly_fee").eq("id", clubId).single();
            if (error) throw error;
            return data;
        },
        enabled: !!clubId && type === "income",
    });

    // Fetch members for selection
    const { data: members } = useQuery({
        queryKey: ["club-members-brief", clubId],
        queryFn: async () => {
            if (!clubId) return [];
            const { data, error } = await supabase
                .from("members")
                .select("id, full_name, email")
                .eq("club_id", clubId)
                .order("full_name");
            if (error) throw error;
            return data || [];
        },
        enabled: !!clubId,
    });

    const handleCategoryChange = (val: string) => {
        setCategory(val);
        if (type === "income" && club) {
            if (val === "Membresía") setAmount(String(club.monthly_fee || ""));
            if (val === "Inscripción") setAmount(String(club.inscription_fee || ""));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !clubId) return;

        try {
            setUploading(true);
            const fileExt = file.name.split(".").pop();
            const fileName = `${clubId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
            const filePath = fileName;

            const { error: uploadError } = await supabase.storage
                .from("receipts")
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            setReceiptUrl(filePath);
            toast({ title: "Archivo subido correctamente" });
        } catch (error: unknown) {
            toast({
                title: "Error al subir archivo",
                description: (error as Error).message,
                variant: "destructive"
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clubId) return;

        try {
            setLoading(true);
            const payload = {
                club_id: clubId,
                type,
                category,
                amount: Number(amount),
                description,
                entry_date: date,
                receipt_url: receiptUrl,
                created_by: member?.user_id,
                member_id: selectedMemberId,
                payment_month: (category === "Membresía" || category === "Inscripción") ? Number(paymentMonth) : null,
                payment_year: (category === "Membresía" || category === "Inscripción") ? Number(paymentYear) : null
            };

            let error;
            if (initialData?.id) {
                const { error: updateError } = await supabase
                    .from("financial_entries")
                    .update(payload)
                    .eq("id", initialData.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("financial_entries")
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: initialData?.id ? "Registro actualizado" : (type === "income" ? "Ingreso registrado" : "Gasto registrado"),
                description: "La transacción se ha guardado correctamente."
            });
            onSuccess();
        } catch (error: unknown) {
            toast({
                title: "Error al guardar",
                description: (error as Error).message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
            <div className={cn(
                "p-6 flex items-center gap-3 text-white",
                type === "income" ? "bg-emerald-600 shadow-emerald-600/20" : "bg-rose-600 shadow-rose-600/20"
            )}>
                {type === "income" ? <TrendingUp className="h-6 w-6" /> : <TrendingDown className="h-6 w-6" />}
                <h2 className="text-xl font-display font-bold">
                    Registrar {type === "income" ? "Ingreso" : "Gasto"}
                </h2>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" /> Categoría
                        </Label>
                        <Select value={category} onValueChange={handleCategoryChange} required>
                            <SelectTrigger className="rounded-xl">
                                <SelectValue placeholder="Seleccionar categoría" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {CATEGORIES[type].map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" /> Monto
                        </Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="pl-9 rounded-xl"
                                placeholder="0"
                                required
                            />
                        </div>
                        {type === "income" && category === "Membresía" && club?.monthly_fee > 0 && (
                            <p className="text-[10px] text-emerald-600 font-medium">Cargando monto por defecto del club</p>
                        )}
                        {type === "income" && category === "Inscripción" && club?.inscription_fee > 0 && (
                            <p className="text-[10px] text-emerald-600 font-medium">Cargando monto por defecto del club</p>
                        )}
                    </div>

                    {type === "income" && (
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" /> Arquero / Miembro (Opcional)
                            </Label>
                            <Select value={selectedMemberId || "none"} onValueChange={(val) => setSelectedMemberId(val === "none" ? null : val)}>
                                <SelectTrigger className="rounded-xl">
                                    <SelectValue placeholder="Seleccionar miembro" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="none">Ninguno</SelectItem>
                                    {members?.map(m => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.full_name} {m.email ? `(${m.email})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {(category === "Membresía" || category === "Inscripción") && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" /> Mes
                                </Label>
                                <Select value={paymentMonth} onValueChange={setPaymentMonth}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                            <SelectItem key={m} value={String(m)}>
                                                {new Date(2000, m - 1).toLocaleString('es-ES', { month: 'long' })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" /> Año
                                </Label>
                                <Select value={paymentYear} onValueChange={setPaymentYear}>
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" /> Fecha
                        </Label>
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="rounded-xl"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" /> Descripción (Opcional)
                        </Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalles adicionales..."
                            className="rounded-xl min-h-[80px]"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                            <Upload className="h-4 w-4 text-muted-foreground" /> {type === "expense" ? "Boleta / Comprobante" : "Comprobante (Opcional)"}
                        </Label>

                        {receiptUrl ? (
                            <div className="relative rounded-xl border border-border p-2 bg-muted/30 group">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-8 w-8 text-primary" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium truncate">Documento cargado</p>
                                        <a href={receiptUrl} target="_blank" rel="noreferrer" className="text-[10px] text-primary hover:underline">Ver archivo</a>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => setReceiptUrl(null)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="relative">
                                <Input
                                    type="file"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="receipt-upload"
                                    accept="image/*,application/pdf"
                                    disabled={uploading}
                                />
                                <label
                                    htmlFor="receipt-upload"
                                    className={cn(
                                        "flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground",
                                        uploading && "opacity-50 pointer-events-none"
                                    )}
                                >
                                    <Upload className="h-8 w-8 mb-2" />
                                    <span className="text-xs font-medium">{uploading ? "Subiendo..." : "Haga clic para subir"}</span>
                                </label>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-border/50 bg-muted/20 flex gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    className="flex-1 rounded-xl"
                    disabled={loading || uploading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    className={cn(
                        "flex-1 rounded-xl text-white",
                        type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    )}
                    disabled={loading || uploading}
                >
                    {loading ? "Guardando..." : "Guardar Registro"}
                </Button>
            </div>
        </form>
    );
}

function TrendingUp({ className }: { className?: string }) {
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
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
        </svg>
    );
}

function TrendingDown({ className }: { className?: string }) {
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
            <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
            <polyline points="16 17 22 17 22 11" />
        </svg>
    );
}
