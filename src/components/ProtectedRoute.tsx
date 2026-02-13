import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, member, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Navigate to="/login" replace />;

  if (member?.is_super_admin) {
    return <>{children}</>;
  }

  const isExpired = member?.subscription_end_date && new Date(member.subscription_end_date) < new Date();

  if (member && (member.club_status === "bloqueado" || (isExpired && member.club_status !== "activo"))) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl">🔒</span>
          </div>
          <h2 className="mb-2 text-xl font-display font-semibold text-foreground">Acceso Bloqueado</h2>
          <p className="text-muted-foreground mb-4">
            {isExpired
              ? "La suscripción de tu club ha vencido."
              : "La suscripción de tu club ha sido suspendida."}
            Contacta al administrador del club para regularizar el pago.
          </p>
          <button
            onClick={() => useAuth().signOut()}
            className="text-primary hover:underline font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (member && member.status === "inactivo") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl">🚫</span>
          </div>
          <h2 className="mb-2 text-xl font-display font-semibold text-foreground">Membresía Inactiva</h2>
          <p className="text-muted-foreground">
            Tu membresía no está activa. Contacta al club para más información.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
