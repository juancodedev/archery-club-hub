import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Target, AlertTriangle, Shield, User as UserIcon, Phone, Mail, MapPin, Calendar, Heart, GraduationCap, Info } from "lucide-react";
import { formatRUT } from "@/lib/rut";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Invitation { club_id: string; email: string | null; expires_at: string; used_at: string | null; }
interface ClubInfo { id: string; name: string; inscription_fee?: number; monthly_fee?: number; }

export default function InvitationRegisterPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [expired, setExpired] = useState(false);
  const [loadingInv, setLoadingInv] = useState(true);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [identification, setIdentification] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [password, setPassword] = useState("");

  // New fields
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [windbreakerSize, setWindbreakerSize] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Guardian fields
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  const [noEmail, setNoEmail] = useState(false);

  const isMinor = useMemo(() => {
    if (!dateOfBirth) return false;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  }, [dateOfBirth]);

  useEffect(() => {
    async function loadInvitation() {
      if (!token) {
        console.error("No token provided");
        setExpired(true);
        setLoadingInv(false);
        return;
      }

      try {
        const { data: invRows, error: invError } = await supabase
          .rpc("get_invitation_by_token", { p_token: token });

        if (invError) {
          console.error("Error loading invitation:", invError);
          setExpired(true);
          setLoadingInv(false);
          return;
        }

        const inv = invRows && invRows.length > 0 ? invRows[0] : null;

        if (!inv || inv.used_at || new Date(inv.expires_at) < new Date()) {
          console.log("Invitation invalid or expired:", inv);
          setExpired(true);
          // Still load club for logo if possible
          if (inv) {
            const { data: c } = await supabase.from("public_clubs_view").select("*").eq("id", inv.club_id).single();
            setClub(c as ClubInfo);
          }
          setLoadingInv(false);
          return;
        }

        setInvitation(inv);
        if (inv.email) setEmail(inv.email);

        const { data: c, error: clubError } = await supabase.from("public_clubs_view").select("*").eq("id", inv.club_id).single();
        if (clubError) console.error("Error loading club:", clubError);
        setClub(c as ClubInfo);
      } catch (err) {
        console.error("Unexpected error loading invitation:", err);
        setExpired(true);
      } finally {
        setLoadingInv(false);
      }
    }
    loadInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation || !club) return;
    setLoading(true);

    try {
      let finalUserId = null;
      const finalEmail = email.trim() !== "" ? email.trim() : null;

      // 1. Create auth user only if email is provided (via standard signUp - user verifies email)
      if (!noEmail && finalEmail) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: finalEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("No se pudo crear el usuario");
        finalUserId = authData.user.id;
      }

      // 2. Complete registration via edge function (uses Admin API for placeholder accounts)
      const { data: rpcData, error: rpcError } = await supabase.functions.invoke('accept-invitation', {
        body: {
          token,
          user_id: finalUserId,
          full_name: fullName,
          email: finalEmail,
          password: password || null,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          identification: identification || null,
          address: address || null,
          medical_history: medicalHistory || null,
          emergency_contact_name: emergencyContactName,
          emergency_contact_phone: emergencyContactPhone,
          shirt_size: shirtSize || null,
          windbreaker_size: windbreakerSize || null,
          display_name: displayName || null,
          guardian_name: isMinor ? guardianName : null,
          guardian_phone: isMinor ? guardianPhone : null,
          guardian_email: isMinor ? guardianEmail : null,
        },
      });

      if (rpcError) throw rpcError;
      if (rpcData?.error) throw new Error(rpcData.error);

      if (noEmail) {
        toast({
          title: "¡Inscripción completada!",
          description: "Tu registro ha sido procesado exitosamente por el club.",
        });
      } else {
        toast({
          title: "¡Registro exitoso!",
          description: "IMPORTANTE: Debes validar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
        });
      }
      navigate("/login");
    } catch (error: unknown) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  if (loadingInv) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          {club && (
            <p className="text-sm text-muted-foreground mb-2">🏹 {club.name}</p>
          )}
          <h1 className="text-2xl font-display font-bold text-foreground mb-3">Enlace Expirado</h1>
          <p className="text-muted-foreground">
            Este enlace de invitación ha expirado o ya fue utilizado. Contacta al administrador de tu club para solicitar uno nuevo.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Inscripción</h1>
          {club && <p className="text-muted-foreground mt-1">🏹 {club.name}</p>}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal data */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Datos Personales</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="fullName">Nombre completo *</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Fecha de nacimiento *</Label>
                <Input id="dateOfBirth" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identification">RUT / RUN</Label>
                <Input
                  id="identification"
                  value={identification}
                  onChange={(e) => setIdentification(formatRUT(e.target.value))}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Dirección particular</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {!noEmail && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              )}
              {isMinor && (
                <div className="space-y-3 sm:col-span-2">
                  <div className="flex items-center space-x-2 bg-accent/10 p-3 rounded-lg border border-accent/20">
                    <Checkbox id="noEmail" checked={noEmail} onCheckedChange={(v) => {
                      const checked = v === true;
                      setNoEmail(checked);
                      if (checked) setEmail("");
                    }} />
                    <Label htmlFor="noEmail" className="text-sm cursor-pointer leading-tight">
                      No tengo correo electrónico propio (menor de edad)
                    </Label>
                  </div>
                  {noEmail && (
                    <p className="text-xs text-muted-foreground italic pl-1">
                      * Se utilizará el correo del tutor para las comunicaciones del club.
                    </p>
                  )}
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="displayName">Nombre en Polera (Pila)</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ej: Juanito" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="medicalHistory">Antecedentes médicos relevantes</Label>
                <Textarea id="medicalHistory" value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} placeholder="Alergias, condiciones, etc." rows={3} />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" /> Contacto de Emergencia
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Nombre del contacto *</Label>
                <Input id="emergencyContactName" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Teléfono del contacto *</Label>
                <Input id="emergencyContactPhone" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Sizes */}
          <div className="glass rounded-xl p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Tabla de Tallas</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Talla Polera</Label>
                <Select value={shirtSize} onValueChange={setShirtSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar talla" />
                  </SelectTrigger>
                  <SelectContent>
                    {['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Talla Cortavientos</Label>
                <Select value={windbreakerSize} onValueChange={setWindbreakerSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar talla" />
                  </SelectTrigger>
                  <SelectContent>
                    {['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                      <SelectItem key={size} value={size}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Guardian (if minor) */}
          {isMinor && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass rounded-xl p-5 space-y-4 border-l-4 border-accent">
              <h3 className="font-display font-semibold text-foreground">Datos del Tutor (menor de 18 años)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="guardianName">Nombre del tutor *</Label>
                  <Input id="guardianName" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">Teléfono contacto/emergencias *</Label>
                  <Input id="guardianPhone" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">Email del tutor *</Label>
                  <Input id="guardianEmail" type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} required />
                </div>
              </div>
            </motion.div>
          )}

          {/* Contract */}
          {club && (
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Contrato del Club</h3>
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-foreground leading-relaxed">
                <p>
                  Declaro conocer y aceptar el reglamento de ética y disciplina del club{" "}
                  <strong>{club.name}</strong>. Tomo conocimiento de mis obligaciones económicas
                  relacionadas con la inscripción y mensualidad, que serán canceladas de acuerdo con:
                </p>
                <ul className="mt-3 space-y-2 list-disc pl-5">
                  <li>
                    <strong>Inscripción</strong>, por una sola vez por un monto de{" "}
                    <strong>${Number(club.inscription_fee || 0).toLocaleString("es-CL")}</strong>
                  </li>
                  <li>
                    <strong>Mensualidad</strong>, cancelada el 5 de cada mes por un valor de{" "}
                    <strong>${Number(club.monthly_fee || 0).toLocaleString("es-CL")}</strong>
                  </li>
                </ul>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                />
                <Label htmlFor="accept" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  Acepto los términos y condiciones del club
                </Label>
              </div>
            </div>
          )}

          {/* Password */}
          {!noEmail && (
            <div className="glass rounded-xl p-5 space-y-4">
              <h3 className="font-display font-semibold text-foreground">Crear Cuenta</h3>
              <div className="space-y-2">
                <Label htmlFor="memberPassword">Contraseña *</Label>
                <Input id="memberPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading || !accepted}>
            {loading ? "Registrando..." : "Aceptar e Inscribirme"}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
