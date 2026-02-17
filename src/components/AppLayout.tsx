import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { Target, LayoutDashboard, User, Crosshair, History, Shield, LogOut, BarChart3, Calendar, Settings, Users, Building2, CreditCard, DollarSign, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DivisionChangeNotifications from "./notifications/DivisionChangeNotifications";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Mi Perfil" },
  { to: "/scores/new", icon: Crosshair, label: "Registrar Puntaje" },
  { to: "/scores", icon: History, label: "Historial" },
  { to: "/training", icon: Calendar, label: "Entrenamientos" },
];

const adminItems = [
  { to: "/admin", icon: Users, label: "Miembros" },
  { to: "/billing", icon: CreditCard, label: "Planes y alumnos" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

const presidenteItems = [
  { to: "/reports", icon: BarChart3, label: "Reportes" },
];

const superAdminItems = [
  { to: "/super-admin/clubs", icon: Building2, label: "Clubes" },
  { to: "/super-admin/members", icon: Users, label: "Miembros" },
  { to: "/super-admin/finances", icon: DollarSign, label: "Finanzas" },
  { to: "/super-admin/plans", icon: CreditCard, label: "Planes y alumnos" },
  { to: "/super-admin/settings", icon: Settings, label: "Configuración" },
  { to: "/super-admin/reports", icon: BarChart3, label: "Reportes" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { member, signOut, isSuperAdminSubdomain } = useAuth();
  const location = useLocation();

  const isSuperAdmin = member?.is_super_admin || isSuperAdminSubdomain;

  const roles = member?.roles || [];
  const isAdmin = roles.includes("administrador") || roles.includes("presidente") || roles.includes("secretaria") || isSuperAdmin;
  const isPresidente = roles.includes("presidente") || roles.includes("administrador") || isSuperAdmin;
  const isTesorero = roles.includes("tesorero") || roles.includes("administrador") || roles.includes("presidente") || isSuperAdmin;
  const isSecretaria = roles.includes("secretaria") || roles.includes("administrador") || roles.includes("presidente") || isSuperAdmin;

  const allAdminItems = isSuperAdmin
    ? superAdminItems
    : [
      ...(isSecretaria ? [{ to: "/admin", icon: Users, label: "Miembros" }] : []),
      ...(isTesorero ? [
        { to: "/admin/finances", icon: DollarSign, label: "Finanzas" },
        { to: "/billing", icon: CreditCard, label: "Planes y alumnos" }
      ] : []),
      ...(isPresidente ? [{ to: "/settings", icon: Settings, label: "Configuración" }] : []),
      ...(isPresidente ? presidenteItems : []),
    ];

  // Remove duplicates and ensure order
  const uniqueItems = Array.from(new Map(allAdminItems.map(item => [item.to, item])).values());


  const renderLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
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
      "flex min-h-screen transition-colors duration-500",
      isSuperAdmin ? "bg-superadmin" : "bg-background"
    )}>
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 p-6 border-b border-border">
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
          <div className="ml-auto">
            <DivisionChangeNotifications />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(renderLink)}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              {uniqueItems.map(renderLink)}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="mb-3 px-3">
            <p className="text-sm font-medium text-foreground truncate">{member?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{member?.email}</p>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex md:hidden items-center justify-between border-b border-border p-3 bg-card">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">
              {isSuperAdminSubdomain ? "Archery Central" : "QuiverApp"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <DivisionChangeNotifications />
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex md:hidden border-b border-border bg-card overflow-x-auto scrollbar-hide">
          {[...navItems, ...(isAdmin ? uniqueItems : [])].map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 text-xs font-medium whitespace-nowrap transition-colors min-w-[72px]",
                location.pathname === to
                  ? isSuperAdmin
                    ? "text-indigo-400 border-b-2 border-indigo-400"
                    : "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", location.pathname === to && isSuperAdmin && "text-indigo-400")} />
              <span className="text-[10px]">{label}</span>
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-auto relative">
          {member?.club_status === 'bloqueado' && !isSuperAdmin ? (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-6">
              <div className="max-w-md w-full glass p-8 rounded-[2rem] text-center space-y-6 shadow-2xl border-destructive/20">
                <div className="h-20 w-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
                  <Lock className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">Acceso Limitado</h2>
                  <p className="text-muted-foreground text-sm">
                    La suscripción de tu club ha sido desactivada o bloqueada por el administrador del sistema.
                    Por favor, contacta al tesorero de tu club o al soporte técnico.
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
            children
          )}
        </main>
      </div>
    </div>
  );
}
