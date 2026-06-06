import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContextCore";
import { motion } from "framer-motion";
import { AnimatePresence } from "framer-motion";
import { logger } from "@/lib/logger";
import { 
  Target, Loader2, CheckCircle2, AlertTriangle, 
  MapPin, ShieldAlert, Navigation, RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";

type CheckinStatus = 
  | "checking_auth" 
  | "checking_active_training" 
  | "requesting_gps" 
  | "validating" 
  | "success" 
  | "out_of_range" 
  | "no_training" 
  | "already_registered" 
  | "gps_error" 
  | "invalid_role" 
  | "not_member";

interface ActiveTraining {
  id: string;
  title: string;
  allowed_radius_meters: number;
  location_lat: number;
  location_lng: number;
}

export default function AttendanceCheckinPage() {
  const { user, member, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [status, setStatus] = useState<CheckinStatus>("checking_auth");
  const [activeTraining, setActiveTraining] = useState<ActiveTraining | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [distance, setDistance] = useState<number | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [allowedRadius, setAllowedRadius] = useState<number>(100);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);

  // Resolved Club ID: URL param -> Logged in member's club
  const clubId = searchParams.get("club_id") || member?.club_id;

  const handleRedirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
  };

  const getClientIP = async (): Promise<string> => {
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      if (!res.ok) throw new Error("Failed to fetch IP");
      const data = await res.json();
      return data.ip || "Desconocida";
    } catch (err) {
      logger.error("Error fetching client IP:", err);
      return "Desconocida";
    }
  };

  const startCheckinFlow = async () => {
    if (authLoading) return;

    // 1. Auth check
    if (!user || !member) {
      setStatus("checking_auth");
      // Delayed automatic redirect for better UX transitions
      const timer = setTimeout(() => {
        handleRedirectToLogin();
      }, 1500);
      return () => clearTimeout(timer);
    }

    // 2. Active member validation
    if (member.status !== "activo") {
      setStatus("not_member");
      setErrorMessage("Tu membresía en este club se encuentra inactiva. Comunícate con la administración.");
      return;
    }

    // 3. Role check - must have 'arquero' role
    const hasArcherRole = member.roles?.includes("arquero");
    if (!hasArcherRole) {
      setStatus("invalid_role");
      setErrorMessage("El registro por geolocalización QR está habilitado exclusivamente para arqueros activos del club.");
      return;
    }

    // 4. Resolve Club ID presence
    if (!clubId) {
      setStatus("no_training");
      setErrorMessage("No se pudo determinar el club de tiro con arco. Vuelve a escanear el código QR original.");
      return;
    }

    try {
      setStatus("checking_active_training");
      logger.log("🔍 Buscando entrenamientos activos para club_id:", clubId);

      // Query active trainings in the DB
      const nowStr = new Date().toISOString();
      const { data: trainings, error: trainingsError } = await supabase
        .from("trainings" as never)
        .select("id, title, starts_at, ends_at, location_lat, location_lng, allowed_radius_meters")
        .eq("club_id", clubId)
        .lte("starts_at", nowStr)
        .gte("ends_at", nowStr)
        .order("starts_at", { ascending: true })
        .limit(1);

      if (trainingsError) throw trainingsError;

      if (!trainings || trainings.length === 0) {
        setStatus("no_training");
        setErrorMessage("No hay entrenamientos activos programados en este horario para tu club.");
        return;
      }

      const current = trainings[0] as unknown as ActiveTraining;
      setActiveTraining(current);
      setAllowedRadius(current.allowed_radius_meters);

      // 5. Check if user already registered attendance
      const { data: attendanceRecord, error: attendanceError } = await (supabase
        .from("training_attendance" as never)
        .select("id, distance_meters")
        .eq("training_id", current.id)
        .eq("user_id", user.id)
        .maybeSingle() as unknown as Promise<{ data: { distance_meters: number | null } | null; error: Error | null }>);

      if (attendanceError) throw attendanceError;

      if (attendanceRecord) {
        setDistance(attendanceRecord.distance_meters);
        setStatus("already_registered");
        return;
      }

      // 6. Request GPS Permission & Location
      requestGPSLocation(current);

    } catch (err) {
      logger.error("Error in checkin pre-validations:", err);
      setStatus("no_training");
      setErrorMessage("Ocurrió un error inesperado al consultar los datos del entrenamiento.");
    }
  };

  const requestGPSLocation = (training: ActiveTraining) => {
    setStatus("requesting_gps");
    setGpsLoading(true);

    if (!navigator.geolocation) {
      setStatus("gps_error");
      setErrorMessage("Tu navegador o dispositivo no soporta geolocalización por GPS.");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setGpsLoading(false);
        const { latitude, longitude, accuracy } = position.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        logger.log(`📍 GPS Ubicación obtenida: Lat ${latitude}, Lng ${longitude} (Precisión: ${accuracy}m)`);

        // If GPS accuracy is extremely poor, warn/retry? We'll log it and let the server check.
        await submitCheckin(training, latitude, longitude);
      },
      (error) => {
        setGpsLoading(false);
        logger.error("GPS Error:", error);
        setStatus("gps_error");
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setErrorMessage("Permiso denegado. Debes habilitar el acceso al GPS en tu navegador para verificar tu presencia en el club.");
            break;
          case error.POSITION_UNAVAILABLE:
            setErrorMessage("Ubicación no disponible. Asegúrate de tener el GPS activado y con buena cobertura de red.");
            break;
          case error.TIMEOUT:
            setErrorMessage("Tiempo de espera agotado. El GPS tardó demasiado en responder, por favor vuelve a intentarlo.");
            break;
          default:
            setErrorMessage("Error de GPS al intentar geolocalizar tu dispositivo.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const submitCheckin = async (training: ActiveTraining, lat: number, lng: number) => {
    setStatus("validating");
    try {
      const clientIp = await getClientIP();
      const userAgent = navigator.userAgent;

      logger.log("📤 Enviando datos de asistencia al servidor...");
      const { data, error } = await supabase.rpc("check_in_attendance" as never, {
        p_training_id: training.id,
        p_latitude: lat,
        p_longitude: lng,
        p_ip_address: clientIp,
        p_user_agent: userAgent
      } as never);

      if (error) throw error;

      const result = data as { success: boolean; code: string; message: string; distance_meters?: number; allowed_radius?: number };

      if (result.success) {
        setDistance(result.distance_meters ?? null);
        setStatus("success");
      } else {
        if (result.code === "OUT_OF_RANGE") {
          setDistance(result.distance_meters ?? null);
          setAllowedRadius(result.allowed_radius ?? training.allowed_radius_meters);
          setStatus("out_of_range");
        } else if (result.code === "ALREADY_REGISTERED") {
          setStatus("already_registered");
        } else if (result.code === "INVALID_ROLE") {
          setStatus("invalid_role");
          setErrorMessage(result.message);
        } else if (result.code === "NOT_A_MEMBER") {
          setStatus("not_member");
          setErrorMessage(result.message);
        } else {
          setStatus("no_training");
          setErrorMessage(result.message || "Error al validar la asistencia.");
        }
      }

    } catch (err) {
      logger.error("Error submitting checkin RPC:", err);
      setStatus("no_training");
      setErrorMessage("Error de conexión al procesar el check-in con la base de datos.");
    }
  };

  useEffect(() => {
    if (!authLoading) {
      startCheckinFlow();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, member]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden select-none">
      {/* Premium ambient glow background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl" />

      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -15, scale: 0.98 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="glass max-w-sm w-full p-8 rounded-3xl text-center space-y-6 border border-white/10 shadow-2xl relative z-10"
        >
          {/* Header Branding */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 glow-primary border border-primary/20">
              <Target className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">
              Quiver<span className="text-primary font-black">App</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">
              Control de Asistencia GPS
            </p>
          </div>

          <div className="border-t border-white/5 my-4" />

          {/* 1. STATE: Checking Auth */}
          {status === "checking_auth" && (
            <div className="space-y-4 py-4 animate-pulse">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-foreground font-semibold">Verificando sesión...</p>
                <p className="text-xs text-muted-foreground">Analizando credenciales en la nube de Supabase</p>
              </div>
            </div>
          )}

          {/* 2. STATE: Checking Active Training */}
          {status === "checking_active_training" && (
            <div className="space-y-4 py-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-foreground font-semibold">Buscando entrenamiento...</p>
                <p className="text-xs text-muted-foreground">Buscando sesiones programadas en este club</p>
              </div>
            </div>
          )}

          {/* 3. STATE: Requesting GPS */}
          {status === "requesting_gps" && (
            <div className="space-y-5 py-2">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center bg-primary/5 rounded-full border border-primary/15">
                <Navigation className="h-7 w-7 text-primary animate-bounce" />
                {gpsLoading && (
                  <span className="absolute inset-0 rounded-full border-2 border-primary/40 border-t-transparent animate-spin" />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-foreground font-semibold">Solicitando geolocalización...</p>
                <p className="text-xs text-muted-foreground leading-relaxed px-2">
                  Habilita los permisos de ubicación en tu navegador para validar que te encuentras físicamente en el club.
                </p>
              </div>
            </div>
          )}

          {/* 4. STATE: Validating */}
          {status === "validating" && (
            <div className="space-y-4 py-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
              <div className="space-y-1">
                <p className="text-foreground font-semibold">Validando geolocalización...</p>
                <p className="text-xs text-muted-foreground">Calculando distancia respecto al centro y procesando check-in</p>
              </div>
            </div>
          )}

          {/* 5. STATE: Success Check-in */}
          {status === "success" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-display font-black text-foreground">¡Listo!</h3>
                <p className="text-xs text-emerald-500 font-semibold uppercase tracking-wider">Asistencia Registrada</p>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-1.5 text-left">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Entrenamiento</p>
                <p className="font-bold text-foreground text-sm">{activeTraining?.title}</p>
                {distance !== null && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Distancia calculada: <b className="text-foreground font-semibold">{distance}m</b> del club.</span>
                  </div>
                )}
              </div>

              {userLat !== null && userLng !== null && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg h-36 relative mt-1">
                  <iframe
                    title="Ubicación de Check-in"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLng - 0.0015}%2C${userLat - 0.0015}%2C${userLng + 0.0015}%2C${userLat + 0.0015}&layer=mapnik&marker=${userLat}%2C${userLng}`}
                    className="filter invert-[0.9] hue-rotate-[180deg] opacity-80"
                  />
                </div>
              )}

              <Button className="w-full h-11 font-bold rounded-xl mt-2" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </div>
          )}

          {/* 6. STATE: Already Registered */}
          {status === "already_registered" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-primary/5">
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-display font-black text-foreground">Registrado</h3>
                <p className="text-xs text-primary font-semibold uppercase tracking-wider">Ya marcaste asistencia</p>
              </div>
              
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 space-y-1.5 text-left">
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest leading-none">Entrenamiento</p>
                <p className="font-bold text-foreground text-sm">{activeTraining?.title}</p>
                {distance !== null && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    <span>Registrado previamente a <b className="text-foreground font-semibold">{distance}m</b>.</span>
                  </div>
                )}
              </div>

              {activeTraining?.location_lat && activeTraining?.location_lng && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg h-36 relative mt-1">
                  <iframe
                    title="Ubicación del Entrenamiento"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${activeTraining.location_lng - 0.0015}%2C${activeTraining.location_lat - 0.0015}%2C${activeTraining.location_lng + 0.0015}%2C${activeTraining.location_lat + 0.0015}&layer=mapnik&marker=${activeTraining.location_lat}%2C${activeTraining.location_lng}`}
                    className="filter invert-[0.9] hue-rotate-[180deg] opacity-80"
                  />
                </div>
              )}

              <Button className="w-full h-11 font-bold rounded-xl mt-2" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </div>
          )}

          {/* 7. STATE: Out of Range */}
          {status === "out_of_range" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-destructive/5">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-display font-black text-foreground">Fuera de Rango</h3>
                <p className="text-xs text-destructive font-semibold uppercase tracking-wider">Verificación Fallida</p>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                No te encuentras dentro del radio permitido respecto a las coordenadas del club de tiro.
              </p>

              <div className="bg-destructive/5 p-4 rounded-2xl border border-destructive/10 space-y-2 text-left text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Tu Distancia:</span>
                  <b className="text-foreground">{distance !== null ? `${distance}m` : "Desconocida"}</b>
                </div>
                <div className="flex justify-between">
                  <span>Radio Permitido:</span>
                  <b className="text-foreground">{allowedRadius}m</b>
                </div>
              </div>

              {userLat !== null && userLng !== null && (
                <div className="w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg h-36 relative mt-1">
                  <iframe
                    title="Tu Ubicación actual"
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight={0}
                    marginWidth={0}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${userLng - 0.002}%2C${userLat - 0.002}%2C${userLng + 0.002}%2C${userLat + 0.002}&layer=mapnik&marker=${userLat}%2C${userLng}`}
                    className="filter invert-[0.9] hue-rotate-[180deg] opacity-80"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 h-11 font-bold rounded-xl border-white/10 hover:bg-white/5" 
                  onClick={() => startCheckinFlow()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Reintentar
                </Button>
                <Button 
                  className="flex-1 h-11 font-bold rounded-xl" 
                  onClick={() => navigate("/dashboard")}
                >
                  Ir al Panel
                </Button>
              </div>
            </div>
          )}

          {/* 8. STATE: No Active Training */}
          {status === "no_training" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-foreground">Sin Sesión Activa</h3>
                <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">Entrenamiento no disponible</p>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed px-4">
                {errorMessage || "No se detectaron entrenamientos programados para hoy en este horario."}
              </p>

              <Button className="w-full h-11 font-bold rounded-xl mt-4" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </div>
          )}

          {/* 9. STATE: GPS Error */}
          {status === "gps_error" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-destructive/5">
                <Navigation className="h-10 w-10 text-destructive rotate-45" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-foreground">Error de Ubicación</h3>
                <p className="text-xs text-destructive font-semibold uppercase tracking-wider">GPS Apagado o Bloqueado</p>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                {errorMessage || "No pudimos acceder a tu ubicación física para el check-in."}
              </p>

              <div className="border-t border-white/5 pt-4 space-y-3">
                <Button 
                  className="w-full h-11 font-bold rounded-xl"
                  onClick={() => {
                    if (activeTraining) requestGPSLocation(activeTraining);
                    else startCheckinFlow();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Permitir GPS y Reintentar
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-10 font-bold rounded-xl text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancelar y salir
                </Button>
              </div>
            </div>
          )}

          {/* 10. STATE: Invalid Role */}
          {status === "invalid_role" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-amber-500/5">
                <ShieldAlert className="h-10 w-10 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-foreground">Acceso Restringido</h3>
                <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider">Rol no autorizado</p>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed px-4">
                {errorMessage || "Solo los arqueros registrados pueden marcar su asistencia en esta sesión."}
              </p>

              <Button className="w-full h-11 font-bold rounded-xl mt-4" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </div>
          )}

          {/* 11. STATE: Not Member */}
          {status === "not_member" && (
            <div className="space-y-5">
              <div className="h-20 w-20 bg-destructive/10 border border-destructive/20 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-destructive/5">
                <ShieldAlert className="h-10 w-10 text-destructive" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-display font-black text-foreground">Membresía Inválida</h3>
                <p className="text-xs text-destructive font-semibold uppercase tracking-wider">Miembro Inactivo</p>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed px-4">
                {errorMessage || "No posees un registro activo de miembro en este club de tiro."}
              </p>

              <Button className="w-full h-11 font-bold rounded-xl mt-4" onClick={() => navigate("/dashboard")}>
                Ir al Dashboard
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
