import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

interface QrSessionData {
  id: string;
  name: string;
  attendance_token?: string;
}

interface TrainingQRDialogProps {
  session: QrSessionData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function QRCodeCanvas({
  value,
  size = 200,
}: {
  value: string;
  size?: number;
}) {
  const canvasRef = (ref: HTMLCanvasElement | null) => {
    if (ref) {
      QRCode.toCanvas(
        ref,
        value,
        {
          width: size,
          margin: 2,
          color: { dark: "#0F172A", light: "#FFFFFF" },
        },
        (error) => {
          if (error) console.error("QR Error:", error);
        }
      );
    }
  };
  return (
    <div className="p-4 bg-white rounded-3xl shadow-2xl inline-block border-8 border-white">
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function TrainingQRDialog({
  session,
  open,
  onOpenChange,
}: TrainingQRDialogProps) {
  const { toast } = useToast();

  const qrUrl = session
    ? `${window.location.origin}/attendance/${session.id}?token=${session.attendance_token}`
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] glass overflow-hidden border-none p-0">
        <div className="p-8 space-y-8 flex flex-col items-center text-center">
          <div className="space-y-2">
            <DialogTitle className="font-display font-black text-2xl tracking-tighter">
              ACCESO RÁPIDO
            </DialogTitle>
            <DialogDescription className="font-medium text-muted-foreground">
              Escanea para registrar tu participación en la nube
            </DialogDescription>
          </div>
          {session && <QRCodeCanvas value={qrUrl} size={240} />}
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 w-full">
            <p className="font-black text-foreground text-lg uppercase">
              {session?.name}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Token validado - 24 horas
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest gap-2"
              onClick={() => {
                navigator.clipboard.writeText(qrUrl);
                toast({
                  title: "Enlace copiado",
                  description: "El enlace de asistencia fue copiado al portapapeles.",
                });
              }}
            >
              <Copy className="h-4 w-4" /> Copiar Enlace
            </Button>
            <Button
              variant="ghost"
              className="flex-1 h-12 rounded-2xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              Cerrar Panel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
