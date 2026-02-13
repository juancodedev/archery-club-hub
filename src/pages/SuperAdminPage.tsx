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
import PlansManagement from "@/components/super-admin/PlansManagement";
import ExtraChargesDialog from "@/components/super-admin/ExtraChargesDialog";
import { PlusCircle, TicketPercent, Layers, Trophy, CalendarDays, DollarSign, Users as UsersIcon } from "lucide-react";
import MembersManagement from "@/components/super-admin/MembersManagement";

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
                <TabsList className="bg-muted/50 overflow-x-auto h-auto p-1">
                    <TabsTrigger value="clubs" className="gap-2"><Building2 className="h-4 w-4" /> Clubes</TabsTrigger>
                    <TabsTrigger value="members" className="gap-2"><UsersIcon className="h-4 w-4" /> Miembros</TabsTrigger>
                    <TabsTrigger value="plans" className="gap-2"><Layers className="h-4 w-4" /> Planes SaaS</TabsTrigger>
                    <TabsTrigger value="coupons" className="gap-2"><TicketPercent className="h-4 w-4" /> Cupones</TabsTrigger>
                    <TabsTrigger value="tournaments" className="gap-2"><Trophy className="h-4 w-4" /> Torneos</TabsTrigger>
                    <TabsTrigger value="practices" className="gap-2"><CalendarDays className="h-4 w-4" /> Prácticas</TabsTrigger>
                </TabsList>

                <TabsContent value="members">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Gestión Global de Miembros</CardTitle>
                            <CardDescription>Visualiza y administra todos los miembros de todos los clubes registrados.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <MembersManagement />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="clubs" className="space-y-6">
                    {/* ... Stats cards already there ... */}
                    <div className="grid gap-4 md:grid-cols-4">
                        {/* I'll re-render them to ensure they are inside TabsContent if I missed them before */}
                        <Card className="glass shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Clubes</CardTitle>
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
                        </Card>
                        <Card className="glass shadow-sm border-l-4 border-l-green-500">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Activos</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent>
                        </Card>
                        <Card className="glass shadow-sm border-l-4 border-l-destructive">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Bloqueados</CardTitle>
                                <XCircle className="h-4 w-4 text-destructive" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-destructive">{stats.blocked}</div></CardContent>
                        </Card>
                        <Card className="glass shadow-sm border-l-4 border-l-primary">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ingresos Est.</CardTitle>
                                <CreditCard className="h-4 w-4 text-primary" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-primary">${stats.revenue.toFixed(2)}</div></CardContent>
                        </Card>
                    </div>

                    <Card className="glass shadow-md overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Gestión de Clubes</CardTitle>
                                <CardDescription>Administra el estado y facturación de cada club.</CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar club..."
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
                                            <TableHead>Email</TableHead>
                                            <TableHead>Precio</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8">Cargando clubes...</TableCell>
                                            </TableRow>
                                        ) : filteredClubs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No se encontraron clubes.</TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredClubs.map((club) => (
                                                <TableRow key={club.id}>
                                                    <TableCell className="font-semibold">{club.name}</TableCell>
                                                    <TableCell className="text-xs">{club.contact_email}</TableCell>
                                                    <TableCell>${club.monthly_price}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={club.subscription_status === "activo" ? "default" : "destructive"}>
                                                            {club.subscription_status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right flex justify-end gap-2">
                                                        <ExtraChargesDialog clubId={club.id} clubName={club.name} />
                                                        <Button
                                                            variant={club.subscription_status === "activo" ? "destructive" : "default"}
                                                            size="sm"
                                                            onClick={() => toggleClubStatus(club.id, club.subscription_status)}
                                                        >
                                                            {club.subscription_status === "activo" ? "Bloquear" : "Activar"}
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
                            <CardTitle>Gestión de Planes de Membresía</CardTitle>
                            <CardDescription>Estos planes se reflejan automáticamente en la landing page.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PlansManagement />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="coupons">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Cupones de Descuento</CardTitle>
                            <CardDescription>Capa de cupones para atraer nuevos clubes.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                            Módulo de cupones en desarrollo...
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tournaments">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Torneos Globales</CardTitle>
                            <CardDescription>Vista general de todos los eventos deportivos en el sistema.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                            Listado global de torneos en desarrollo... (SuperAdmin puede ver todo)
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="practices">
                    <Card className="glass">
                        <CardHeader>
                            <CardTitle>Entrenamientos Globales</CardTitle>
                            <CardDescription>Monitorización de la actividad en todos los clubes.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                            Monitorización global de prácticas en desarrollo...
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
