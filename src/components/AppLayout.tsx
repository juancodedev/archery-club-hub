import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { Target, LayoutDashboard, User, Crosshair, History, Shield, LogOut, BarChart3, Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Mi Perfil" },
  { to: "/scores/new", icon: Crosshair, label: "Registrar Puntaje" },
  { to: "/scores", icon: History, label: "Historial" },
  { to: "/training", icon: Calendar, label: "Entrenamientos" },
];

const adminItems = [
  { to: "/admin", icon: Shield, label: "Administración" },
  { to: "/settings", icon: Settings, label: "Configuración" },
];

const presidenteItems = [
  { to: "/reports", icon: BarChart3, label: "Reportes" },
];

const superAdminItems = [
  { to: "/super-admin", icon: Shield, label: "Panel Central" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { member, signOut } = useAuth();
  const location = useLocation();
  const isAdmin = member?.roles.includes("administrador") || member?.roles.includes("presidente") || member?.is_super_admin;
  const isPresidente = member?.roles.includes("presidente") || member?.roles.includes("administrador") || member?.is_super_admin;
  const isSuperAdmin = member?.is_super_admin;

  const allAdminItems = [
    ...(isSuperAdmin ? superAdminItems : []),
    ...adminItems,
    ...(isPresidente ? presidenteItems : []),
  ];

  const renderLink = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <Link
      key={to}
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        location.pathname === to
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-3 p-6 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display font-bold text-foreground">ArcheryHub</span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(renderLink)}
          {isAdmin && (
            <>
              <div className="my-3 border-t border-border" />
              {allAdminItems.map(renderLink)}
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
        <header className="flex md:hidden items-center justify-between border-b border-border p-4 bg-card">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-foreground">ArcheryHub</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>

        {/* Mobile nav */}
        <nav className="flex md:hidden border-b border-border bg-card overflow-x-auto">
          {[...navItems, ...(isAdmin ? allAdminItems : [])].map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors",
                location.pathname === to
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
