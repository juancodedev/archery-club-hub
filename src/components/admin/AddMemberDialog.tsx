import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClubs } from "@/hooks/useClubs";
import { UserPlus, Heart, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatRUT } from "@/lib/rut";

import { useAuth } from "@/contexts/AuthContextCore";
import { getSafeErrorMessage } from "@/lib/errorUtils";

interface Props {
  clubId: string;
  disabled?: boolean;
}

export default function AddMemberDialog({ clubId: initialClubId, disabled }: Props) {
  const { member, isSuperAdminSubdomain } = useAuth();
  const isSuperAdmin = !!member?.is_super_admin || isSuperAdminSubdomain;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [identification, setIdentification] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [windbreakerSize, setWindbreakerSize] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [billingDay, setBillingDay] = useState(String(new Date().getDate()));
  const [graceDays, setGraceDays] = useState("7");
  const [role, setRole] = useState<string>("arquero");
  const [selectedClubId, setSelectedClubId] = useState(initialClubId);
  const { data: clubs } = useClubs();
  const [ifaaNumber, setIfaaNumber] = useState("");
  const [shirtGender, setShirtGender] = useState("");
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);

  const isMinor = useMemo(() => {
    if (!dateOfBirth) return false;
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age < 18;
  }, [dateOfBirth]);

  const addMember = useMutation({
    mutationFn: async () => {
      const targetClubId = isSuperAdmin ? selectedClubId : initialClubId;
      if (!targetClubId || targetClubId === "null") throw new Error("Debe seleccionar un club");

      // Email: use provided value, or null for minors without email
      const effectiveEmail = email.trim() !== '' ? email.trim() : null;

      // Use edge function to create member account via Admin API
      // Password is generated server-side automatically
      const { data, error } = await supabase.functions.invoke('create-member', {
        body: {
          full_name: name,
          club_id: targetClubId,
          email: effectiveEmail,
          role,
          phone: phone || null,
          date_of_birth: dateOfBirth || null,
          identification: identification || null,
          address: address || null,
          medical_history: medicalHistory || null,
          emergency_contact_name: emergencyContactName || null,
          emergency_contact_phone: emergencyContactPhone || null,
          shirt_size: shirtSize || null,
          windbreaker_size: windbreakerSize || null,
          display_name: displayName || null,
          guardian_name: isMinor ? guardianName : null,
          guardian_phone: isMinor ? guardianPhone : null,
          guardian_email: isMinor ? guardianEmail : null,
          billing_day: billingDay ? Number(billingDay) : new Date().getDate(),
          grace_days: graceDays ? Number(graceDays) : 7,
          ifaa_number: ifaaNumber || null,
          shirt_gender: shirtGender || null,
          enrollment_date: enrollmentDate || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.success) throw new Error("No se pudo crear el miembro");

      return data; // Return the created member data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      queryClient.invalidateQueries({ queryKey: ["all-members"] });

      toast({
        title: "✅ Miembro agregado exitosamente",
        description: `La cuenta está lista.`
      });
      setOpen(false);
      // Reset all fields
      setName("");
      setEmail("");
      setPhone("");
      setIdentification("");
      setDateOfBirth("");
      setAddress("");
      setMedicalHistory("");
      setEmergencyContactName("");
      setEmergencyContactPhone("");
      setShirtSize("");
      setWindbreakerSize("");
      setDisplayName("");
      setGuardianName("");
      setGuardianPhone("");
      setGuardianEmail("");
      setRole("arquero");
      setIfaaNumber("");
      setShirtGender("");
      setEnrollmentDate(new Date().toISOString().split('T')[0]);
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: getSafeErrorMessage(e), variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={disabled}><UserPlus className="h-4 w-4" />Agregar Miembro</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Nuevo Miembro</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(); }} className="space-y-4">
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label>Club de destino</Label>
              <Select value={selectedClubId} onValueChange={setSelectedClubId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
                <SelectContent>
                  {clubs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Datos Personales */}
          <div className="glass rounded-xl p-4 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Datos Personales</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nombre completo *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento *</Label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>RUT / RUN</Label>
                <Input
                  value={identification}
                  onChange={(e) => setIdentification(formatRUT(e.target.value))}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Dirección particular</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              {!isMinor && (
                <div className="space-y-2">
                  <Label>Correo electrónico</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                  <p className="text-xs text-muted-foreground">Opcional. Si se deja vacío, el miembro puede iniciar sesión con la contraseña del club.</p>
                </div>
              )}
              {isMinor && (
                <div className="space-y-2 rounded-lg bg-accent/10 border border-accent/30 p-3 sm:col-span-2">
                  <p className="text-xs text-accent-foreground flex items-center gap-1">
                    <span>ℹ️</span>
                    <span>El arquero es <strong>menor de edad</strong>. No es necesario un email propio — ingresa el email del tutor/padre en la sección de tutor a continuación.</span>
                  </p>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label>Nombre en Polera (Pila)</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ej: Juanito" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Antecedentes médicos relevantes</Label>
                <Textarea
                  value={medicalHistory}
                  onChange={(e) => setMedicalHistory(e.target.value)}
                  placeholder="Alergias, condiciones, etc."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Número IFAA</Label>
                <Input value={ifaaNumber} onChange={(e) => setIfaaNumber(e.target.value)} placeholder="Ej: CL-1234" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de Incorporación</Label>
                <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Contacto de Emergencia */}
          <div className="glass rounded-xl p-4 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" /> Contacto de Emergencia
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre del contacto *</Label>
                <Input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Teléfono del contacto *</Label>
                <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} required />
              </div>
            </div>
          </div>

          {/* Tallas */}
          <div className="glass rounded-xl p-4 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Tabla de Tallas</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Corte de Polera/Cortavientos</Label>
                <Select value={shirtGender} onValueChange={setShirtGender}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar corte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

          {/* Datos del Tutor (si es menor) */}
          {isMinor && (
            <div className="glass rounded-xl p-4 space-y-4 border-l-4 border-accent">
              <h3 className="font-display font-semibold text-foreground">Datos del Tutor (menor de 18 años)</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Nombre del tutor *</Label>
                  <Input value={guardianName} onChange={(e) => setGuardianName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono contacto/emergencias *</Label>
                  <Input value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Email del tutor *</Label>
                  <Input type="email" value={guardianEmail} onChange={(e) => setGuardianEmail(e.target.value)} required />
                </div>
              </div>
            </div>
          )}

          {/* Configuración de Pagos */}
          <div className="glass rounded-xl p-4 space-y-4 border-l-4 border-emerald-500">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4 text-emerald-500" /> Configuración de Pagos
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Día de Cobro (1-31)</Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  value={billingDay}
                  onChange={(e) => setBillingDay(e.target.value)}
                  placeholder="Día del mes..."
                />
                <p className="text-[10px] text-muted-foreground">Vencimiento mensual. Por defecto: hoy.</p>
              </div>
              <div className="space-y-2">
                <Label>Días de Gracia</Label>
                <Input
                  type="number"
                  min="0"
                  value={graceDays}
                  onChange={(e) => setGraceDays(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">Días extra antes de marcar atrasado.</p>
              </div>
            </div>
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label>Rol</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="arquero">Arquero</SelectItem>
                <SelectItem value="socio">Socio</SelectItem>
                <SelectItem value="entrenador">Entrenador</SelectItem>
                <SelectItem value="presidente">Presidente</SelectItem>
                <SelectItem value="administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={addMember.isPending}>
            {addMember.isPending ? "Agregando..." : "Agregar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
