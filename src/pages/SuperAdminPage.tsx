import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, XCircle, Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SuperAdminCreateClubDialog from "@/components/super-admin/CreateClubDialog";
import { PlusCircle, TicketPercent, Layers } from "lucide-react";

interface Club {
    id: string;
    name: string;
    contact_email: string;
    subscription_status: 'activo' | 'pendiente' | 'bloqueado';
    subscription_end_date: string | null;
    monthly_price: number;
    city: string | null;
    country: string | null;
}

export default function SuperAdminPage() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchClubs();
    }, []);

    const fetchClubs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("clubs")
                .select("*")
                .order("name");

            if (error) throw error;
            setClubs(data as Club[]);
        } catch (error: any) {
            toast.error("Error al cargar los clubes: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleClubStatus = async (clubId: string, currentStatus: string) => {
        const newStatus = currentStatus === "activo" ? "bloqueado" : "activo";
        try {
            const { error } = await supabase
                .from("clubs")
                .update({ subscription_status: newStatus })
                .eq("id", clubId);

            if (error) throw error;

            toast.success(`Club ${newStatus === "activo" ? "activado" : "bloqueado"} con éxito`);
            fetchClubs();
        } catch (error: any) {
            toast.error("Error al actualizar el estado: " + error.message);
        }
    };

    const filteredClubs = clubs.filter(club =>
        club.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        club.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: clubs.length,
        active: clubs.filter(c => c.subscription_status === 'activo').length,
        blocked: clubs.filter(c => c.subscription_status === 'bloqueado').length,
        revenue: clubs.filter(c => c.subscription_status === 'activo')
            .reduce((acc, curr) => acc + (curr.monthly_price || 0), 0)
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold text-foreground">Panel de Control Central</h1>
                    <p className="text-muted-foreground">Administración global de clientes y suscripciones SaaS.</p>
                </div>
                <SuperAdminCreateClubDialog onSuccess={fetchClubs} />
            </div>

            <Tabs defaultValue="clubs" className="space-y-6">
                <TabsList className="bg-muted/50">
                    <TabsTrigger value="clubs" className="gap-2"><Building2 className="h-4 w-4" /> Clubes</TabsTrigger>
                    <TabsTrigger value="plans" className="gap-2"><Layers className="h-4 w-4" /> Planes SaaS</TabsTrigger>
                    <TabsTrigger value="coupons" className="gap-2"><TicketPercent className="h-4 w-4" /> Cupones</TabsTrigger>
                </TabsList>

                <TabsContent value="clubs" className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card className="glass shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clubes</CardTitle>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.total}</div>
                            </CardContent>
                        </Card>
                        <Card className="glass shadow-sm border-l-4 border-l-green-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Suscripciones Activas</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                            </CardContent>
                        </Card>
                        <Card className="glass shadow-sm border-l-4 border-l-destructive">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Clubes Bloqueados</CardTitle>
                                <XCircle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-destructive">{stats.blocked}</div>
                            </CardContent>
                        </Card>
                        <Card className="glass shadow-sm border-l-4 border-l-primary">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Mensuales Est.</CardTitle>
                                <CreditCard className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-primary">${stats.revenue.toFixed(2)}</div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="glass shadow-md overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Listado de Clientes</CardTitle>
                                <CardDescription>Gestiona el estado y pagos de cada club.</CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar club o email..."
                                    className="pl-9 bg-background/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border border-border/50">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead>Club</TableHead>
                                            <TableHead>Email de Contacto</TableHead>
                                            <TableHead>Ubicación</TableHead>
                                            <TableHead>Precio Saco</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead>Vencimiento</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8">
                                                    Cargando clubes...
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredClubs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                    No se encontraron clubes.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClubs.map((club) => (
                                                <TableRow key={club.id} className="hover:bg-muted/30 transition-colors">
                                                    <TableCell className="font-semibold">{club.name}</TableCell>
                                                    <TableCell>{club.contact_email}</TableCell>
                                                    <TableCell>{club.city}, {club.country}</TableCell>
                                                    <TableCell>${club.monthly_price}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={club.subscription_status === "activo" ? "default" : "destructive"}
                                                            className={club.subscription_status === "activo" ? "bg-green-500 hover:bg-green-600" : ""}
                                                        >
                                                            {club.subscription_status.toUpperCase()}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {club.subscription_end_date
                                                            ? new Date(club.subscription_end_date).toLocaleDateString()
                                                            : "N/A"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant={club.subscription_status === "activo" ? "destructive" : "default"}
                                                            size="sm"
                                                            onClick={() => toggleClubStatus(club.id, club.subscription_status)}
                                                        >
                                                            {club.subscription_status === "activo" ? (
                                                                <>
                                                                    <XCircle className="mr-2 h-4 w-4" /> Bloquear
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <CheckCircle2 className="mr-2 h-4 w-4" /> Activar
                                                                </>
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="plans">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Planes de Suscripción</CardTitle>
                            <CardDescription>Configura los precios y características de los planes SaaS.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                            Módulo de gestión de planes en desarrollo...
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="coupons">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Cupones de Descuento</CardTitle>
                            <CardDescription>Crea cupones para atraer nuevos clubes o fidelizar clientes.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                            Módulo de cupones en desarrollo...
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
