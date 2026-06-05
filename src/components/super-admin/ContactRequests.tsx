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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Loader2, CheckCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface ContactRequest {
    id: string;
    created_at: string | null;
    status: string | null;
    type: string;
    message: string;
    club_id: string | null;
    clubs?: { name: string } | null;
    members?: { full_name: string } | null;
}

export default function ContactRequests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState<ContactRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("contact_requests")
            .select("*, clubs(name), members(full_name)")
            .order("created_at", { ascending: false });

        if (error) {
            toast.error("Error al cargar solicitudes: " + error.message);
            setRequests([]);
        } else {
            setRequests(data || []);
        }
        setLoading(false);
    };

    const resolveRequest = async (id: string) => {
        const { error } = await supabase
            .from("contact_requests")
            .update({ status: 'resolved' })
            .eq("id", id);

        if (error) {
            toast.error("Error al actualizar solicitud");
        } else {
            toast.success("Solicitud resuelta");
            fetchRequests();
        }
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-4">
            <div className="glass rounded-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Club</TableHead>
                            <TableHead>Miembro</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Mensaje</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!requests || requests.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    {!requests ? "Error al cargar solicitudes. Por favor, reintenta." : "No hay solicitudes pendientes."}
                                    {!requests && (
                                        <div className="mt-2">
                                            <Button variant="outline" size="sm" onClick={fetchRequests}>Reintentar</Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            requests.map((req) => (
                                <TableRow key={req.id}>
                                    <TableCell className="text-xs">{new Date(req.created_at ?? "").toLocaleDateString()}</TableCell>
                                    <TableCell className="font-semibold">{req.clubs?.name}</TableCell>
                                    <TableCell className="text-xs">{req.members?.full_name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize">{req.type}</Badge>
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={req.message}>
                                        {req.message}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={req.status === "resolved" ? "default" : "secondary"}>
                                            {req.status === "resolved" ? "Resuelto" : "Pendiente"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {req.type === "financial_support" && req.status === "pending" && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
                                                    onClick={() => navigate(`/finance?club=${req.club_id}`)}
                                                >
                                                    <DollarSign className="h-4 w-4" /> Ver Finanzas
                                                </Button>
                                            )}
                                            {req.status === "pending" && (
                                                <Button variant="ghost" size="sm" onClick={() => resolveRequest(req.id)} className="gap-1">
                                                    <CheckCircle className="h-4 w-4" /> Resolver
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
