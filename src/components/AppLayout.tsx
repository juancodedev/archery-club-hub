import { useAuth } from "@/contexts/AuthContextCore";
import { Link, useLocation } from "react-router-dom";
import { Target, LayoutDashboard, User, History, Shield, LogOut, BarChart3, Calendar, Settings, Users, Building2, CreditCard, DollarSign, Lock, Menu, X as CloseIcon, Wallet, Cake, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

import { cn, getAvatarUrl } from "@/lib/utils";
import { isAdmin as checkIsAdmin, isPresidente as checkIsPresidente, isTesorero as checkIsTesorero, isSecretaria as checkIsSecretaria } from "@/lib/permissions";
import DivisionChangeNotifications from "./notifications/DivisionChangeNotifications";
import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";


const presidenteItems = [
  { to: "/reports", icon: BarChart3, label: "Reportes" },
];

const superAdminItems = [
  { to: "/super-admin/clubs", icon: Building2, label: "Clubes" },
  { to: "/super-admin/members", icon: Users, label: "Miembros" },
  { to: "/admin/memberships", icon: Wallet, label: "Membresías" },
  { to: "/super-admin/finances", icon: DollarSign, label: "Finanzas" },
  { to: "/super-admin/plans", icon: CreditCard, label: "Planes y alumnos" },
  { to: "/super-admin/settings", icon: Settings, label: "Configuración" },
  { to: "/super-admin/reports", icon: BarChart3, label: "Reportes" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { member, signOut, isSuperAdminSubdomain } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile when navigating
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Adjust sidebar default based on screen size
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setIsSidebarOpen(!isMobile);
  }, []);

  const isSuperAdmin = member?.is_super_admin || isSuperAdminSubdomain;

  const roles = member?.roles || [];
  const isAdmin = checkIsAdmin(roles, isSuperAdmin);
  const isPresidente = checkIsPresidente(roles, isSuperAdmin);
  const isTesorero = checkIsTesorero(roles, isSuperAdmin);
  const isSecretaria = checkIsSecretaria(roles, isSuperAdmin);

  const allAdminItems = isSuperAdmin
    ? superAdminItems
    : [
      ...(isSecretaria ? [{ to: "/admin", icon: Users, label: "Miembros" }] : []),
      ...(isTesorero ? [
        { to: "/admin/memberships", icon: Wallet, label: "Membresías" },
        { to: "/admin/finances", icon: DollarSign, label: "Finanzas" },
        { to: "/billing", icon: CreditCard, label: "Planes y alumnos" }
      ] : []),
      ...(isPresidente ? [{ to: "/settings", icon: Settings, label: "Configuración" }] : []),
      ...(isPresidente ? presidenteItems : []),
    ];

  // Remove duplicates and ensure order
  const uniqueItems = Array.from(new Map(allAdminItems.map(item => [item.to, item])).values());

  const isClubAdmin = member?.roles?.includes("administrador");
  const showAttendanceMenu = isSuperAdmin || isClubAdmin;

  const isArquero = member?.roles?.includes("arquero");
  const showEntrenamientoYPuntaje = isSuperAdmin || isArquero;

  const visibleNavItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/profile", icon: User, label: "Mi Perfil" },
    ...(showEntrenamientoYPuntaje ? [{ to: "/scores", icon: Target, label: "Entrenamiento y puntaje" }] : []),
    { to: "/birthdays", icon: Cake, label: "Cumpleaños" },
    ...(showAttendanceMenu ? [{ to: "/training", icon: Calendar, label: "Asistencia" }] : [])
  ];

  // Bottom navigation items (mobile) — pick top 4 most important + "Más"
  const bottomNavItems = (() => {
    const items = [
      { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      ...(showEntrenamientoYPuntaje ? [{ to: "/scores", icon: Target, label: "Puntaje" }] : []),
      { to: "/birthdays", icon: Cake, label: "Cumpleaños" },
      { to: "/profile", icon: User, label: "Perfil" },
    ];
    // Max 4 items + "Más" button that opens sidebar
    return items.slice(0, 4);
  })();


  const renderLink = ({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) => (

    <Link
      key={to}
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        location.pathname === to
          ? isSuperAdmin
            ? "bg-indigo-500/10 text-indigo-400"
            : "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", location.pathname === to && isSuperAdmin && "text-indigo-400")} />
      {label}
    </Link>
  );

  return (
    <div className={cn(
      "flex min-h-screen transition-colors duration-500 overflow-hidden",
      isSuperAdmin ? "bg-superadmin" : "bg-background"
    )}>
      {/* Sidebar - Desktop relative, Mobile fixed overlay */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out md:relative overflow-hidden",
        isSidebarOpen
          ? "w-64 translate-x-0 shadow-2xl md:shadow-none"
          : "w-64 -translate-x-full md:w-0 md:border-none md:opacity-0"
      )}>
        <div className="flex items-center gap-3 p-6 border-b border-border min-w-[256px]">
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            isSuperAdmin ? "bg-yellow-500/10" : "bg-primary/10"
          )}>
            {isSuperAdmin ? (
              <Shield className="h-6 w-6 text-yellow-500 fill-yellow-500/20" />
            ) : (
              <Target className={cn("h-5 w-5", isSuperAdmin ? "text-indigo-400" : "text-primary")} />
            )}
          </div>
          <span className={cn(
            "font-display font-bold",
            isSuperAdmin ? "text-yellow-500" : "text-foreground"
          )}>
            {isSuperAdminSubdomain ? "Archery Central" : "QuiverApp"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
              <CloseIcon className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map(renderLink)}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              <p className="px-3 mb-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Administración</p>
              {uniqueItems.map(renderLink)}
            </>
          )}
        </nav>

        <div className="mt-auto p-4 border-t border-border bg-muted/20 sticky bottom-0">
          <div className="flex items-center gap-3 px-3 mb-4">
            <Avatar className="h-10 w-10 border border-border/50">
              <AvatarImage src={getAvatarUrl(member?.avatar_url)} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {member?.full_name?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{member?.full_name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{member?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-12 md:h-14 items-center justify-between border-b border-border px-3 md:px-4 bg-card sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:flex h-9 w-9 md:h-10 md:w-10">
              <Menu className="h-5 w-5 md:h-6 md:w-6 text-foreground" />
            </Button>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              <span className="text-sm md:text-base font-display font-bold text-foreground truncate max-w-[120px] sm:max-w-none">
                {isSuperAdminSubdomain ? "Archery Central" : "QuiverApp"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <div className="hidden md:block">
              <DivisionChangeNotifications />
            </div>
            {/* Notification bell always visible on mobile as icon */}
            <div className="md:hidden">
              <DivisionChangeNotifications />
            </div>
            {member?.id && (
              <Link to="/profile">
                <Avatar className="h-7 w-7 md:h-8 md:w-8 border border-primary/20 hover:scale-105 transition-transform">
                  <AvatarImage src={getAvatarUrl(member?.avatar_url)} />
                  <AvatarFallback className="bg-primary/10 text-primary text-[9px] md:text-[10px] font-bold">
                    {member?.full_name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 md:p-8 overflow-auto relative pb-16 md:pb-8">
          {member?.club_status === 'bloqueado' && (member?.block_type === 'total' || member?.block_type === null) && !isSuperAdmin ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
              <div className="max-w-md w-full glass p-8 rounded-[2rem] text-center space-y-6 shadow-2xl border-destructive/20 animate-in fade-in zoom-in duration-300">
                <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                  <Lock className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">Acceso Bloqueado</h2>
                  <p className="text-muted-foreground text-sm">
                    La suscripción de tu club ha sido bloqueada totalmente.
                    Por favor, contacta al administrador para regularizar el pago.
                  </p>
                </div>
                <div className="pt-4">
                  <Button variant="outline" className="w-full rounded-xl gap-2 font-bold" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {member?.club_status === 'bloqueado' && member?.block_type === 'partial' && !isSuperAdmin && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top duration-500">
                  <div className="h-10 w-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 shrink-0">
                    <History className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-yellow-500">Modo Lectura - Suscripción Vencida</p>
                    <p className="text-xs text-yellow-500/70">Tu club tiene pagos pendientes. Puedes ver tus datos, pero las funciones de edición están deshabilitadas.</p>
                  </div>
                  <Button variant="outline" size="sm" className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20" asChild>
                    <Link to="/billing">Pagar ahora</Link>
                  </Button>
                </div>
              )}
              {children}
            </>
          )}
        </main>

        {/* Bottom Navigation — mobile only */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-card border-t border-border px-2 pb-safe-or-2 pt-1 safe-area-bottom">
          {bottomNavItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 flex-1"
              >
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-[10px] font-semibold truncate w-full text-center",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
          {/* More button — opens sidebar drawer */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-0 flex-1"
          >
            <div className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground truncate w-full text-center">Más</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
