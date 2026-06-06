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
import { toast } from "sonner";
import { CreditCard, CheckCircle2, XCircle, Search, Building2, Settings, BarChart3, Shield, Trophy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SuperAdminCreateClubDialog from "@/components/super-admin/CreateClubDialog";
import PlansManagement from "@/components/super-admin/PlansManagement";
import { DollarSign, Users as UsersIcon } from "lucide-react";
import MembersManagement from "@/components/super-admin/MembersManagement";
import IntegrationsSettings from "@/components/super-admin/IntegrationsSettings";
import ContactRequests from "@/components/super-admin/ContactRequests";
import ClubActionsMenu from "@/components/super-admin/ClubActionsMenu";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import TournamentsPage from "./TournamentsPage";
interface Club {
    id: string;
    name: string;
    contact_email: string;
    subscription_status: 'activo' | 'pendiente' | 'bloqueado';
    subscription_end_date: string | null;
    monthly_price: number;
    city: string | null;
    country: string | null;
    student_limit_override?: number | null;
    grace_period_days?: number;
    block_type?: 'total' | 'partial';
}

export default function SuperAdminPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Get current tab from URL (e.g., /super-admin/members -> members)
    const currentTab = location.pathname.split("/").pop() || "clubs";

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
        } catch (error: unknown) {
            toast.error("Error al cargar los clubes: " + (error as Error).message);
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
        } catch (error: unknown) {
            toast.error("Error al actualizar el estado: " + (error as Error).message);
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

    const handleTabChange = (value: string) => {
        navigate(`/super-admin/${value}`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                        <Shield className="h-8 w-8 text-yellow-500 fill-yellow-500/20" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground">Panel de Control Central</h1>
                        <p className="text-muted-foreground">Administración global de clientes y suscripciones SaaS.</p>
                    </div>
                </div>
                <SuperAdminCreateClubDialog onSuccess={fetchClubs} />
            </div>

            <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
                <TabsList className="bg-muted/50 overflow-x-auto h-auto p-1">
                    <TabsTrigger value="clubs" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><Building2 className="h-4 w-4" /> Clubes</TabsTrigger>
                    <TabsTrigger value="members" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><UsersIcon className="h-4 w-4" /> Miembros</TabsTrigger>
                    <TabsTrigger value="finances" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><DollarSign className="h-4 w-4" /> Finanzas</TabsTrigger>
                    <TabsTrigger value="plans" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><CreditCard className="h-4 w-4" /> Planes y alumnos</TabsTrigger>
                    <TabsTrigger value="tournaments" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><Trophy className="h-4 w-4" /> Torneos</TabsTrigger>
                    <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><Settings className="h-4 w-4" /> Configuración</TabsTrigger>
                    <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-indigo-500/10 data-[state=active]:text-indigo-400"><BarChart3 className="h-4 w-4" /> Reportes</TabsTrigger>
                </TabsList>

                <Routes>
                    <Route path="/" element={<Navigate to="clubs" replace />} />

                    <Route path="clubs" element={
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-4">
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
                                <Card className="glass shadow-sm border-l-4 border-l-indigo-500">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Ingresos Est.</CardTitle>
                                        <CreditCard className="h-4 w-4 text-indigo-400" />
                                    </CardHeader>
                                    <CardContent><div className="text-2xl font-bold text-indigo-400">${stats.revenue.toFixed(2)}</div></CardContent>
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
                                    <div className="rounded-md border border-border/50 overflow-x-auto">
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
                                                            <TableCell className="text-right">
                                                                <ClubActionsMenu
                                                                    club={club}
                                                                    onStatusToggle={toggleClubStatus}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    } />

                    <Route path="members" element={
                        <Card className="glass">
                            <CardHeader>
                                <CardTitle>Gestión Global de Miembros</CardTitle>
                                <CardDescription>Visualiza y administra todos los miembros de todos los clubes registrados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MembersManagement />
                            </CardContent>
                        </Card>
                    } />

                    <Route path="plans" element={
                        <Card className="glass">
                            <CardHeader>
                                <CardTitle>Gestión de Planes de Membresía</CardTitle>
                                <CardDescription>Estos planes se reflejan automáticamente en la landing page.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PlansManagement />
                            </CardContent>
                        </Card>
                    } />

                    <Route path="finances" element={
                        <Card className="glass">
                            <CardHeader>
                                <CardTitle>Ingresos Globales</CardTitle>
                                <CardDescription>Vista general de la facturación de todos los clubes.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                                Gráficos de facturación mensual y anual en desarrollo...
                            </CardContent>
                        </Card>
                    } />

                    <Route path="settings" element={
                        <Card className="glass">
                            <CardHeader>
                                <CardTitle>Configuración Global</CardTitle>
                                <CardDescription>Configura pasarelas de pago, parámetros globales y solicitudes.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <IntegrationsSettings />
                                <div className="pt-6 border-t border-border/50">
                                    <h4 className="text-sm font-bold mb-4 uppercase tracking-wider text-muted-foreground">Solicitudes de Soporte</h4>
                                    <ContactRequests />
                                </div>
                            </CardContent>
                        </Card>
                    } />

                    <Route path="reports" element={
                        <Card className="glass">
                            <CardHeader>
                                <CardTitle>Reportes Consolidados</CardTitle>
                                <CardDescription>Estadísticas de uso, torneos y prácticas a nivel global.</CardDescription>
                            </CardHeader>
                            <CardContent className="h-40 flex items-center justify-center text-muted-foreground italic">
                                Reportes avanzados de IA y exportación CSV en desarrollo...
                            </CardContent>
                        </Card>
                    } />

                    <Route path="tournaments" element={<TournamentsPage />} />
                </Routes>
            </Tabs>
        </div>
    );
}
