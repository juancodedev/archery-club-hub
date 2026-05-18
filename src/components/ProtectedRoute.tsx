import { useAuth } from "@/contexts/AuthContextCore";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  requireSuperAdmin = false,
  requireArquero = false
}: {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  requireArquero?: boolean;
}) {
  const { session, member, loading, signOut, systemMode } = useAuth();

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

  if (requireArquero) {
    const isArquero = member?.roles?.includes("arquero");
    if (!isArquero) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If we are in "pruebas" mode, we don't apply access restrictions based on club status
  if (systemMode === 'pruebas') {
    if (requireSuperAdmin && !member?.is_super_admin) {
      return <Navigate to="/dashboard" replace />;
    }
    return <>{children}</>;
  }

  const isAdmin = member?.roles?.some(role => ['administrador', 'presidente'].includes(role));
  const isExpired = member?.subscription_end_date && new Date(member.subscription_end_date) < new Date();

  // Grace period of 2 days for members
  const graceEndDate = member?.subscription_end_date ? new Date(member.subscription_end_date) : null;
  if (graceEndDate) {
    graceEndDate.setDate(graceEndDate.getDate() + 2);
  }
  const isGraceExpired = graceEndDate && graceEndDate < new Date();
  const isClubBlocked = member?.club_status === "bloqueado";

  // Logical blocking
  let shouldBlock = false;
  let blockTitle = "Acceso Bloqueado";
  let blockMessage = "";
  let contactType: 'platform' | 'club' = 'club';

  if (isAdmin) {
    if (isClubBlocked || isExpired) {
      shouldBlock = true;
      contactType = 'platform';
      blockMessage = isExpired
        ? "La suscripción de tu club ha vencido. Contacta al administrador de la plataforma para renovar el servicio."
        : "La suscripción de tu club ha sido suspendida. Contacta al administrador de la plataforma.";
    }
  } else {
    // Normal member
    if (isClubBlocked || isGraceExpired) {
      shouldBlock = true;
      contactType = 'club';
      blockMessage = isGraceExpired
        ? "La suscripción del club ha vencido. Contacta al administrador del club para regularizar el acceso."
        : "El acceso al club está suspendido temporalmente. Contacta al administrador del club.";
    } else if (member?.status === "inactivo") {
      shouldBlock = true;
      contactType = 'club';
      blockTitle = "Membresía Inactiva";
      blockMessage = "Tu membresía no está activa. Contacta al administrador del club para más información.";
    }
  }

  if (shouldBlock) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="glass rounded-xl p-8 text-center max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-2xl">{blockTitle === "Membresía Inactiva" ? "🚫" : "🔒"}</span>
          </div>
          <h2 className="mb-2 text-xl font-display font-semibold text-foreground">{blockTitle}</h2>
          <p className="text-muted-foreground mb-4">
            {blockMessage}
          </p>

          <div className="flex flex-col gap-4">
            {contactType === 'platform' ? (
              <a
                href="mailto:hola@juancode.dev?subject=club bloqueado"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Contactar Soporte (hola@juancode.dev)
              </a>
            ) : null}

            <button
              onClick={async () => {
                try {
                  await signOut();
                } catch (e) {
                  window.location.href = "/login";
                }
              }}
              className="text-primary hover:underline font-medium text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
