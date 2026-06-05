import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ui/confirm-dialog";

// Leaflet CSS — imported at build time instead of injected from CDN
import "leaflet/dist/leaflet.css";
import QRCode from "qrcode";
import {
  DISCIPLINES, STANDARD_DISTANCES, formatYards,
  TRAINING_TYPES, WEATHER_TYPES, WIND_DIRECTIONS, TRAINING_PRESETS,
  NFAA_DISCIPLINES, NFAA_BOW_STYLES, NFAA_AGE_CATEGORIES, NFAA_GENDERS,
  INDOOR_TARGET_TYPES, SESSION_MODES, NFAA_ALL_DIVISIONS,
  type DisciplineValue
} from "@/lib/archeryConstants";
import { buildDivisionCode } from "@/lib/divisionUtils";
import { logger } from "@/lib/logger";
import {
  Calendar,
  Plus,
  Users,
  MapPin,
  Shield,
  Trash2,
  Printer,
  Smartphone,
  Loader2,
  Navigation,
  Copy,
} from "lucide-react";
import TrainingSessionDialog from "./TrainingSessionDialog";
import TrainingSessionList from "./TrainingSessionList";
import TrainingQRDialog from "./TrainingQRDialog";

interface AttendanceRecord {
  id: string;
  user_id: string;
  attended_at: string;
  distance_meters: number | null;
  ip_address: string | null;
  user_agent: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface GpsTrainingRecord {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location_lat: number;
  location_lng: number;
  allowed_radius_meters: number;
  training_attendance?: AttendanceRecord[];
}

interface QrSessionInfo {
  id: string;
  name: string;
  attendance_token?: string;
}

function QRCodeCanvas({ value, size = 200 }: { value: string; size?: number }) {
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
        (error: Error | null) => {
          if (error) logger.error("QR Error:", error);
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

export default function TrainingSessionsPage() {
  const { member } = useAuth();
  const isSuperAdmin = !!member?.is_super_admin;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin =
    member?.roles?.includes("administrador") ||
    member?.roles?.includes("presidente") ||
    member?.roles?.includes("entrenador");

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const { data: clubs } = useClubs();
  const [qrSession, setQrSession] = useState<QrSessionInfo | null>(null);

  // GPS / QR state
  const [gpsDialogOpen, setGpsDialogOpen] = useState(false);
  const [gpsTitle, setGpsTitle] = useState("");
  const [gpsStartsAt, setGpsStartsAt] = useState(() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    return new Date(
      d.getTime() - d.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
  });
  const [gpsEndsAt, setGpsEndsAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0, 0, 0);
    return new Date(
      d.getTime() - d.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
  });
  const [gpsLat, setGpsLat] = useState<string>("");
  const [gpsLng, setGpsLng] = useState<string>("");
  const [gpsRadius, setGpsRadius] = useState<number>(100);
  const [fetchingMyGps, setFetchingMyGps] = useState(false);
  const [selectedGpsTraining, setSelectedGpsTraining] =
    useState<GpsTrainingRecord | null>(null);
  const [activeMapId, setActiveMapId] = useState<string | null>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [deleteGpsTarget, setDeleteGpsTarget] = useState<string | null>(null);
  const [dialogClubId, setDialogClubId] = useState("");
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);

  // Dynamically load Leaflet for the Interactive Map Picker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled) return;
        // Fix Leaflet default icon paths (broken with bundlers)
        delete (L as any).Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
        });
        (window as any).__leaflet = L;
        if (!cancelled) setLeafletLoaded(true);
      } catch {
        if (!cancelled) setLeafletLoaded(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-trigger geolocation fetch when the dialog is opened
  useEffect(() => {
    if (gpsDialogOpen) {
      if (!gpsLat && !gpsLng) {
        fetchCurrentCoordinates();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsDialogOpen]);

  // Dynamic Leaflet Map Picker Initialization & Synchronization
  useEffect(() => {
    if (!gpsDialogOpen) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const L = (window as any).__leaflet;
    if (!L || !leafletLoaded) return;

    const latNum = parseFloat(gpsLat) || -33.45678;
    const lngNum = parseFloat(gpsLng) || -70.65432;

    const mapContainer = document.getElementById("admin-map");
    if (mapContainer && !mapRef.current) {
      mapRef.current = L.map("admin-map").setView([latNum, lngNum], 16);
      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        { maxZoom: 19 }
      ).addTo(mapRef.current);

      const tileContainer = mapContainer.querySelector(
        ".leaflet-tile-container"
      );
      if (tileContainer) {
        tileContainer.classList.add(
          "filter",
          "invert-[0.9]",
          "hue-rotate-[180deg]",
          "opacity-80"
        );
      }

      markerRef.current = L.marker([latNum, lngNum], {
        draggable: true,
      }).addTo(mapRef.current);

      markerRef.current.on("dragend", () => {
        const pos = markerRef.current.getLatLng();
        setGpsLat(pos.lat.toFixed(6));
        setGpsLng(pos.lng.toFixed(6));
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapRef.current.on("click", (e: any) => {
        const pos = e.latlng;
        markerRef.current.setLatLng(pos);
        setGpsLat(pos.lat.toFixed(6));
        setGpsLng(pos.lng.toFixed(6));
      });
    } else if (mapRef.current && markerRef.current) {
      const currentLatLng = markerRef.current.getLatLng();
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        if (
          Math.abs(currentLatLng.lat - latNum) > 0.0001 ||
          Math.abs(currentLatLng.lng - lngNum) > 0.0001
        ) {
          markerRef.current.setLatLng([latNum, lngNum]);
          mapRef.current.setView([latNum, lngNum]);
        }
      }
    }
  }, [gpsDialogOpen, gpsLat, gpsLng, leafletLoaded]);

  // Queries for GPS Trainings and Members List
  const { data: gpsTrainings, isLoading: gpsLoading } = useQuery({
    queryKey: ["gps-trainings", selectedClubId],
    queryFn: async () => {
      if (
        !selectedClubId ||
        selectedClubId === "null" ||
        selectedClubId === "00000000-0000-0000-0000-000000000000"
      )
        return [];
      const { data, error } = await supabase
        .from("trainings" as never)
        .select("*, training_attendance(*)")
        .eq("club_id", selectedClubId)
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled:
      !!selectedClubId &&
      selectedClubId !== "null" &&
      selectedClubId !== "00000000-0000-0000-0000-000000000000",
  });

  const { data: clubMembers } = useQuery({
    queryKey: ["club-members", selectedClubId],
    queryFn: async () => {
      if (
        !selectedClubId ||
        selectedClubId === "null" ||
        selectedClubId === "00000000-0000-0000-0000-000000000000"
      )
        return [];
      const { data, error } = await supabase
        .from("members")
        .select("id, user_id, full_name")
        .eq("club_id", selectedClubId);
      if (error) throw error;
      return data || [];
    },
    enabled:
      !!selectedClubId &&
      selectedClubId !== "null" &&
      selectedClubId !== "00000000-0000-0000-0000-000000000000",
  });

  // Mutations for GPS Trainings
  const createGpsTraining = useMutation({
    mutationFn: async () => {
      const targetClubId = isSuperAdmin ? dialogClubId : selectedClubId;
      if (!targetClubId || targetClubId === "null")
        throw new Error("Debe seleccionar un club");
      if (!gpsTitle) throw new Error("Debe ingresar un título");
      if (!gpsLat || !gpsLng)
        throw new Error("Debe ingresar las coordenadas GPS");

      const { error } = await supabase.from("trainings" as never).insert({
        club_id: targetClubId,
        title: gpsTitle,
        starts_at: new Date(gpsStartsAt).toISOString(),
        ends_at: new Date(gpsEndsAt).toISOString(),
        location_lat: parseFloat(gpsLat),
        location_lng: parseFloat(gpsLng),
        allowed_radius_meters: gpsRadius,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-trainings"] });
      toast({ title: "Entrenamiento GPS creado exitosamente" });
      setGpsDialogOpen(false);
      setGpsTitle("");
      setGpsLat("");
      setGpsLng("");
      setGpsRadius(100);
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteGpsTraining = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trainings" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gps-trainings"] });
      toast({ title: "Entrenamiento eliminado exitosamente" });
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const fetchCurrentCoordinates = () => {
    setFetchingMyGps(true);
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Tu navegador no soporta geolocalización.",
        variant: "destructive",
      });
      setFetchingMyGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude.toString());
        setGpsLng(pos.coords.longitude.toString());
        setFetchingMyGps(false);
        toast({
          title: "Coordenadas obtenidas",
          description:
            "Se han cargado tus coordenadas actuales con éxito.",
        });
      },
      (err) => {
        logger.error("Error fetching admin coords:", err);
        toast({
          title: "Error GPS",
          description:
            "No se pudieron obtener las coordenadas actuales. Inténtalo de nuevo.",
          variant: "destructive",
        });
        setFetchingMyGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  useEffect(() => {
    if (!isSuperAdmin && member?.club_id) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  // Auto-select first club for superadmin
  useEffect(() => {
    if (isSuperAdmin && clubs && clubs.length > 0 && !selectedClubId) {
      setSelectedClubId(clubs[0].id);
    }
  }, [isSuperAdmin, clubs, selectedClubId]);

  const isClubAdmin = member?.roles?.includes("administrador");
  const hasAccess = isSuperAdmin || isClubAdmin;

  if (!hasAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="glass max-w-md w-full p-8 rounded-3xl text-center space-y-6 border border-white/10 shadow-2xl relative z-10">
          <div className="h-16 w-16 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-8 w-8 text-destructive animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">
              Acceso Restringido
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              El panel de administración de asistencia está reservado
              exclusivamente para el Administrador del Club y el
              Superadministrador.
            </p>
          </div>
          <Button
            className="w-full h-11 font-bold rounded-xl"
            onClick={() => (window.location.href = "/dashboard")}
          >
            Volver al Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-2">
              <Calendar className="h-7 w-7 text-primary" />
              Asistencia y Localización
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Configuración de geocercas GPS y consulta de asistencia
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:max-w-xs">
            <Select
              value={selectedClubId}
              onValueChange={setSelectedClubId}
            >
              <SelectTrigger className="glass h-11">
                <SelectValue placeholder="Seleccionar club" />
              </SelectTrigger>
              <SelectContent className="glass">
                {clubs?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Tabs defaultValue="gps_qr" className="w-full space-y-6">
        <TabsList className="grid grid-cols-1 w-full max-w-xs glass p-1 h-12">
          <TabsTrigger
            value="gps_qr"
            className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Asistencia GPS / QR
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="sessions"
          className="space-y-6 animate-in fade-in-50 duration-300"
        >
          <TrainingSessionList
            clubId={selectedClubId}
            isSuperAdmin={isSuperAdmin}
            onCreateSession={() => setSessionDialogOpen(true)}
            onShowQR={(session) => setQrSession(session)}
          />
        </TabsContent>

        <TabsContent
          value="gps_qr"
          className="space-y-6 animate-in fade-in-50 duration-300"
        >
          {/* 1. Club Permanent QR Code Section */}
          <div className="glass rounded-3xl p-6 border border-white/5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-4 flex flex-col items-center justify-center gap-3 bg-black/10 p-5 rounded-2xl border border-white/5">
                <QRCodeCanvas
                  value={`${window.location.origin}/attendance/checkin?club_id=${selectedClubId}`}
                  size={160}
                />
                <div className="flex gap-2 w-full mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl h-9 text-xs font-bold gap-1.5 border-white/10 hover:bg-white/5"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/attendance/checkin?club_id=${selectedClubId}`
                      );
                      toast({
                        title: "Enlace copiado",
                        description:
                          "El enlace de asistencia fija fue copiado al portapapeles.",
                      });
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar Enlace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl h-9 text-xs font-bold gap-1.5 border-white/10 hover:bg-white/5"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir QR
                  </Button>
                </div>
              </div>

              <div className="md:col-span-8 space-y-4 text-left">
                <div>
                  <span className="text-[10px] text-primary uppercase font-black tracking-widest leading-none">
                    Módulo de Asistencia
                  </span>
                  <h3 className="text-xl font-bold text-foreground mt-0.5">
                    Código QR Fijo + Ubicación GPS
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Este es el código QR permanente del club. Imprímelo y
                  colócalo en la entrada de las instalaciones. Los arqueros
                  solo tienen que escanearlo desde sus teléfonos para
                  registrar asistencia de forma inmediata.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="flex gap-2.5 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                    <Smartphone className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground">
                        Escaneo Móvil Fijo
                      </h4>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        No es necesario generar nuevos códigos QR dinámicos
                        cada día.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2.5 items-start bg-white/5 p-3 rounded-xl border border-white/5">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-foreground">
                        Validación GPS Cruzada
                      </h4>
                      <p className="text-muted-foreground text-[11px] leading-relaxed">
                        Evita marcas de asistencia fraudulentas desde fuera
                        de las instalaciones.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. GPS Trainings Panel */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-left">
                <h3 className="font-bold text-foreground text-lg leading-tight">
                  Calendario de Asistencia GPS
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sesiones activas configuradas con validación de geocercas
                </p>
              </div>

              {(isAdmin || isSuperAdmin) && (
                <Button
                  className="gap-2 w-full sm:w-auto h-10 font-bold shadow-lg shadow-primary/10"
                  onClick={() => setGpsDialogOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Programar GPS
                </Button>
              )}
            </div>

            {gpsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="glass rounded-2xl p-6 h-28 animate-pulse"
                  />
                ))}
              </div>
            ) : gpsTrainings && gpsTrainings.length > 0 ? (
              <div className="space-y-3">
                {(gpsTrainings as GpsTrainingRecord[]).map((t) => {
                  const attendees = t.training_attendance || [];
                  const isCurrentActive =
                    new Date() >= new Date(t.starts_at) &&
                    new Date() <= new Date(t.ends_at);
                  const isFinished =
                    new Date() > new Date(t.ends_at);
                  const isUpcoming =
                    new Date() < new Date(t.starts_at);

                  return (
                    <div
                      key={t.id}
                      className="glass rounded-2xl p-5 border border-white/5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-white/10 transition-colors"
                    >
                      <div className="space-y-2 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-foreground text-base leading-tight">
                            {t.title}
                          </h4>
                          {isCurrentActive && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 h-5 px-2 text-[9px] uppercase font-bold animate-pulse">
                              Activo Ahora
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 h-5 px-2 text-[9px] uppercase font-bold">
                              Programado
                            </span>
                          )}
                          {isFinished && (
                            <span className="inline-flex items-center rounded-full bg-muted-foreground/10 border border-white/5 text-muted-foreground h-5 px-2 text-[9px] uppercase font-bold">
                              Finalizado
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                            <Calendar className="h-3 w-3" />
                            {new Date(t.starts_at).toLocaleDateString("es-CL", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <span className="flex items-center gap-1.5 bg-muted/30 px-2 py-1 rounded-lg">
                            ⏰{" "}
                            {new Date(t.starts_at).toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            a{" "}
                            {new Date(t.ends_at).toLocaleTimeString("es-CL", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-md font-semibold text-primary">
                            📍 Radio: {t.allowed_radius_meters}m
                          </span>
                          <span className="opacity-65">
                            Lat: {t.location_lat.toFixed(5)}, Lng:{" "}
                            {t.location_lng.toFixed(5)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 text-xs font-bold gap-1.5 border-white/10 hover:bg-white/5"
                          onClick={() => setSelectedGpsTraining(t)}
                        >
                          <Users className="h-3.5 w-3.5 text-primary" />{" "}
                          Asistencias ({attendees.length})
                        </Button>

                        {(isAdmin || isSuperAdmin) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-xl h-9 w-9 text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteGpsTarget(t.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass rounded-[2rem] py-14 text-center space-y-4 border-dashed border-2 border-border/50">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/20" />
                <div className="space-y-1">
                  <p className="text-base font-bold text-foreground">
                    Sin Entrenamientos GPS
                  </p>
                  <p className="text-xs text-muted-foreground max-w-[280px] mx-auto leading-relaxed font-medium">
                    No hay entrenamientos GPS programados para el club
                    seleccionado.
                  </p>
                </div>
                {(isAdmin || isSuperAdmin) && (
                  <Button
                    onClick={() => setGpsDialogOpen(true)}
                    className="rounded-xl px-6 h-9 font-bold text-xs"
                  >
                    CREAR PRIMER GPS
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* GPS Training Creation Dialog */}
      <Dialog open={gpsDialogOpen} onOpenChange={setGpsDialogOpen}>
        <DialogContent className="rounded-3xl glass max-w-[95vw] sm:max-w-lg scrollbar-hide max-h-[90vh] overflow-y-auto border-none p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-xl text-left">
              Programar Entrenamiento GPS
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1 text-left font-medium">
              Crea una sesión geolocalizada en el club para validación de
              presencia.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              createGpsTraining.mutate();
            }}
            className="space-y-5 pt-4 text-left"
          >
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                  Club para el entrenamiento
                </Label>
                <Select
                  value={dialogClubId}
                  onValueChange={setDialogClubId}
                >
                  <SelectTrigger className="glass h-11">
                    <SelectValue placeholder="Seleccionar club" />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    {clubs?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                Título del Entrenamiento
              </Label>
              <Input
                value={gpsTitle}
                onChange={(e) => setGpsTitle(e.target.value)}
                placeholder="Ej: Práctica Sabatina - Turno Mañana"
                required
                className="h-11 glass border-primary/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                  Inicio
                </Label>
                <Input
                  type="datetime-local"
                  value={gpsStartsAt}
                  onChange={(e) => setGpsStartsAt(e.target.value)}
                  required
                  className="h-11 glass border-primary/10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                  Término
                </Label>
                <Input
                  type="datetime-local"
                  value={gpsEndsAt}
                  onChange={(e) => setGpsEndsAt(e.target.value)}
                  required
                  className="h-11 glass border-primary/10"
                />
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-xs uppercase font-black tracking-widest text-primary flex items-center gap-1">
                  📍 Ubicación Geográfica
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg text-[10px] font-bold gap-1 border-primary/20 hover:bg-primary/10"
                  onClick={fetchCurrentCoordinates}
                  disabled={fetchingMyGps}
                >
                  {fetchingMyGps ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Navigation className="h-3 w-3" />
                  )}
                  Usar mi GPS actual
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                    Latitud
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={gpsLat}
                    onChange={(e) => setGpsLat(e.target.value)}
                    placeholder="-33.45678"
                    required
                    className="h-10 glass border-primary/10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
                    Longitud
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    value={gpsLng}
                    onChange={(e) => setGpsLng(e.target.value)}
                    placeholder="-70.65432"
                    required
                    className="h-10 glass border-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-muted-foreground font-medium">
                  <span>Radio de Tolerancia:</span>
                  <span className="text-primary font-bold">
                    {gpsRadius} metros
                  </span>
                </div>
                <Input
                  type="range"
                  min="20"
                  max="500"
                  step="10"
                  value={gpsRadius}
                  onChange={(e) =>
                    setGpsRadius(parseInt(e.target.value))
                  }
                  className="h-6 accent-primary cursor-pointer w-full bg-white/5 rounded-lg appearance-none"
                />
                <p className="text-[9px] text-muted-foreground leading-none mt-1 font-medium">
                  Los arqueros deberán encontrarse a menos de{" "}
                  {gpsRadius}m de este punto para que se apruebe su
                  asistencia.
                </p>
              </div>

              {/* Interactive Location Picker Map */}
              <div className="space-y-1 mt-2.5">
                <Label className="text-[10px] text-muted-foreground uppercase font-black tracking-widest font-medium">
                  Ajustar Ubicación en el Mapa
                </Label>
                <div
                  id="admin-map"
                  className="w-full h-40 rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-muted/10"
                >
                  {!leafletLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground animate-pulse font-medium bg-black/20">
                      Cargando mapa interactivo...
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground leading-relaxed mt-1 font-medium italic opacity-70">
                  💡 Puedes hacer clic en el mapa o arrastrar el marcador
                  para fijar las coordenadas manualmente.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-2xl font-black shadow-lg"
              disabled={createGpsTraining.isPending}
            >
              {createGpsTraining.isPending
                ? "CREANDO..."
                : "PROGRAMAR AHORA"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* GPS Attendance Details Dialog */}
      <Dialog
        open={!!selectedGpsTraining}
        onOpenChange={(open) =>
          !open &&
          (setSelectedGpsTraining(null), setActiveMapId(null))
        }
      >
        <DialogContent className="rounded-3xl glass max-w-[95vw] sm:max-w-xl scrollbar-hide max-h-[85vh] overflow-y-auto border-none p-6">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-lg flex items-center gap-1.5 text-left">
              <Users className="h-5 w-5 text-primary" /> Asistencias:{" "}
              {selectedGpsTraining?.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground text-left font-medium">
              Lista de arqueros que registraron asistencia mediante código
              QR y validación por GPS.
            </DialogDescription>
          </DialogHeader>

          <div className="pt-4 space-y-4">
            {selectedGpsTraining &&
            (!selectedGpsTraining.training_attendance ||
              selectedGpsTraining.training_attendance.length === 0) ? (
              <div className="text-center py-10 space-y-2">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-bold text-foreground">
                  Sin Registros
                </p>
                <p className="text-xs text-muted-foreground px-4 leading-relaxed font-medium">
                  Ningún arquero ha marcado asistencia para este
                  entrenamiento aún.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1">
                {(
                  selectedGpsTraining?.training_attendance as AttendanceRecord[]
                )?.map((att) => {
                  const archerName =
                    clubMembers?.find(
                      (m) => m.user_id === att.user_id
                    )?.full_name || "Arquero Desconocido";

                  return (
                    <div
                      key={att.id}
                      className="bg-white/5 p-3.5 rounded-2xl border border-white/5 flex flex-col justify-between gap-3 text-left hover:bg-white/10 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="font-bold text-foreground text-sm">
                              {archerName}
                            </h4>
                          </div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-muted-foreground font-medium">
                            <span>
                              📅{" "}
                              {new Date(
                                att.attended_at
                              ).toLocaleDateString("es-CL")}
                            </span>
                            <span>
                              ⏰{" "}
                              {new Date(
                                att.attended_at
                              ).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {att.distance_meters !== null && (
                              <span className="text-primary font-bold">
                                📍 a {att.distance_meters.toFixed(1)}m del
                                centro
                              </span>
                            )}
                            {att.latitude && att.longitude && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 px-1.5 text-[9px] rounded-md border border-white/5 bg-white/5 text-primary hover:bg-primary/20 hover:text-primary font-bold gap-1 font-sans"
                                onClick={() =>
                                  setActiveMapId(
                                    activeMapId === att.id
                                      ? null
                                      : att.id
                                  )
                                }
                              >
                                🗺️{" "}
                                {activeMapId === att.id
                                  ? "Ocultar Mapa"
                                  : "Ver Mapa"}
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end justify-center text-[9px] text-muted-foreground shrink-0 border-t sm:border-t-0 sm:border-l border-white/5 pt-2 sm:pt-0 sm:pl-3">
                          <span className="flex items-center gap-1">
                            🌐 IP:{" "}
                            <b className="text-foreground font-mono">
                              {att.ip_address || "Desconocida"}
                            </b>
                          </span>
                          <span
                            className="truncate max-w-[150px] mt-0.5"
                            title={att.user_agent ?? ""}
                          >
                            📱{" "}
                            {att.user_agent?.includes("Mobi")
                              ? "Dispositivo Móvil"
                              : "Computador"}
                          </span>
                        </div>
                      </div>

                      {activeMapId === att.id &&
                        att.latitude &&
                        att.longitude && (
                          <div className="w-full mt-1 rounded-2xl overflow-hidden border border-white/10 shadow-lg h-44 relative animate-in slide-in-from-top-3 duration-300">
                            <iframe
                              title={`Mapa de ${archerName}`}
                              width="100%"
                              height="100%"
                              frameBorder="0"
                              scrolling="no"
                              marginHeight={0}
                              marginWidth={0}
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                                att.longitude - 0.002
                              }%2C${att.latitude - 0.002}%2C${
                                att.longitude + 0.002
                              }%2C${
                                att.latitude + 0.002
                              }&layer=mapnik&marker=${att.latitude}%2C${att.longitude}`}
                              className="filter invert-[0.9] hue-rotate-[180deg] opacity-80"
                            />
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full h-11 font-bold rounded-xl border-white/10 hover:bg-white/5 mt-2"
              onClick={() => setSelectedGpsTraining(null)}
            >
              Cerrar Detalle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <TrainingQRDialog
        session={qrSession}
        open={!!qrSession}
        onOpenChange={(open) => !open && setQrSession(null)}
      />

      {/* Training Session Create Dialog */}
      <TrainingSessionDialog
        clubId={selectedClubId}
        open={sessionDialogOpen}
        onOpenChange={setSessionDialogOpen}
        isSuperAdmin={isSuperAdmin}
        clubs={clubs}
      />

      {/* GPS Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteGpsTarget}
        onOpenChange={(open) => !open && setDeleteGpsTarget(null)}
        title="Eliminar entrenamiento GPS"
        description="¿Estás seguro de que deseas eliminar este entrenamiento GPS y todo su historial de asistencia? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        onConfirm={() => {
          if (deleteGpsTarget) {
            deleteGpsTraining.mutate(deleteGpsTarget);
            setDeleteGpsTarget(null);
          }
        }}
      />
    </div>
  );
}
