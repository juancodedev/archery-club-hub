import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error?: Error | null;
  onReset?: () => void;
}

export default function ErrorPage({ error, onReset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h1 className="text-2xl font-display font-bold">Algo salió mal</h1>
      <p className="text-muted-foreground text-sm text-center max-w-md">
        Ocurrió un error inesperado al cargar esta página. Intentá de nuevo o contactá al administrador.
      </p>
      {error && process.env.NODE_ENV === "development" && (
        <pre className="text-xs bg-muted p-4 rounded-lg max-w-xl overflow-auto">
          {error.message}
        </pre>
      )}
      {onReset && (
        <Button onClick={onReset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reintentar
        </Button>
      )}
    </div>
  );
}
