import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Phone, Mail, MapPin, Shield, Heart, Save, Pencil, X, Lock, Key, Eye, EyeOff, Wallet, CreditCard, DollarSign, Calendar } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { formatRUT } from "@/lib/rut";
import { formatCurrency, cn } from "@/lib/utils";
import { calculateFinancialStatus, isMembershipCategory, MemberForStatus } from "@/lib/membershipUtils";

interface ClubItem { id: string; name: string; }
interface MemberItem { id: string; full_name: string; }

interface FullMember extends MemberForStatus {
  id: string;
  club_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  identification: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  status: string;
  observations: string | null;
  medical_history: string | null;
  enrollment_date: string;
  is_super_admin: boolean;
  member_roles: { role: string }[];
  guardian_name: string | null;
  guardian_phone: string | null;
  shirt_size: string | null;
  windbreaker_size: string | null;
  display_name: string | null;
  avatar_url: string | null;
  billing_day: number | null;
  grace_days: number | null;
  membership_category: string | null;
  membership_fee: number | null;
  ifaa_number: string | null;
  shirt_gender: string | null;
}

export default function ProfilePage() {
  const { member, user } = useAuth();
  const isSuperAdmin = !!member?.is_super_admin;
  const queryClient = useQueryClient();

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [membersList, setMembersList] = useState<MemberItem[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    address: "",
    identification: "",
    medical_history: "",
    guardian_name: "",
    guardian_phone: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    shirt_size: "",
    windbreaker_size: "",
    display_name: "",
    avatar_url: "",
    roles: [] as string[],
    billing_day: "",
    grace_days: "7",
    ifaa_number: "",
    shirt_gender: "",
    enrollment_date: "",
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.id && (!selectedMemberId || !selectedClubId)) {
      setSelectedMemberId(member.id);
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin, selectedMemberId, selectedClubId]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data as ClubItem[]);
  };

  const fetchMembers = async (clubId: string) => {
    if (!clubId || clubId === "null") return;
    const { data } = await supabase.from("members").select("id, full_name").eq("club_id", clubId).order("full_name");
    if (data) setMembersList(data as MemberItem[]);
  };

  const { data: fullMember, isLoading: loadingMember } = useQuery<FullMember | null>({
    queryKey: ["member-profile", selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId || selectedMemberId === "null" || selectedMemberId === "00000000-0000-0000-0000-000000000000") return null;
      const { data, error } = await supabase
        .from("members")
        .select("*, member_roles(role)")
        .eq("id", selectedMemberId)
        .single();

      if (error) throw error;

      if (data) {
        const d = data as unknown as FullMember;
        setFormData({
          full_name: d.full_name || "",
          phone: d.phone || "",
          address: d.address || "",
          identification: d.identification || "",
          medical_history: d.medical_history || "",
          guardian_name: d.guardian_name || "",
          guardian_phone: d.guardian_phone || "",
          emergency_contact_name: d.emergency_contact_name || "",
          emergency_contact_phone: d.emergency_contact_phone || "",
          shirt_size: d.shirt_size || "",
          windbreaker_size: d.windbreaker_size || "",
          display_name: d.display_name || "",
          avatar_url: d.avatar_url || "",
          roles: d.member_roles?.map((r) => r.role) || [],
          billing_day: String(d.billing_day || ""),
          grace_days: String(d.grace_days ?? "7"),
          ifaa_number: d.ifaa_number || "",
          shirt_gender: d.shirt_gender || "",
          enrollment_date: d.enrollment_date || "",
        });
      }
      return data as unknown as FullMember;
    },
    enabled: !!selectedMemberId,
  });

  const { data: payments } = useQuery({
    queryKey: ["member-payments-history", selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId || selectedMemberId === 'null') return [];
      const { data, error } = await supabase
        .from("financial_entries")
        .select("*")
        .eq("member_id", selectedMemberId)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedMemberId
  });

  const financialStatus = useMemo(() => {
    return calculateFinancialStatus(fullMember, payments || []);
  }, [fullMember, payments]);

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword.length < 6) throw new Error("Mínimo 6 caracteres");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setIsChangingPassword(false);
      setNewPassword("");
    },
    onError: (e: Error) => toast.error("Error: " + e.message)
  });

  const { data: club } = useQuery({
    queryKey: ["club-profile", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return null;
      const { data } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", selectedClubId)
        .single();
      return data;
    },
    enabled: !!selectedClubId,
  });

  const uploadAvatar = async (file: File) => {
    if (!user) {
      toast.error("Debes iniciar sesión para cambiar tu foto");
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));

      if (selectedMemberId) {
        await supabase
          .from("members")
          .update({ avatar_url: publicUrl })
          .eq("id", selectedMemberId);
        toast.success("Foto de perfil actualizada");
        queryClient.invalidateQueries({ queryKey: ["member-profile", selectedMemberId] });
      }
    } catch (error: unknown) {
      toast.error("Error al subir imagen: " + getSafeErrorMessage(error));
    }
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!selectedMemberId) return;

      const { error } = await supabase
        .from("members")
        .update({
          full_name: formData.full_name,
          phone: formData.phone || null,
          address: formData.address || null,
          identification: formData.identification || null,
          medical_history: formData.medical_history || null,
          guardian_name: formData.guardian_name || null,
          guardian_phone: formData.guardian_phone || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          shirt_size: formData.shirt_size || null,
          windbreaker_size: formData.windbreaker_size || null,
          display_name: formData.display_name || null,
          billing_day: formData.billing_day ? Number(formData.billing_day) : null,
          grace_days: formData.grace_days ? Number(formData.grace_days) : null,
          ifaa_number: formData.ifaa_number || null,
          shirt_gender: formData.shirt_gender || null,
          enrollment_date: formData.enrollment_date || null,
        })
        .eq("id", selectedMemberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-profile", selectedMemberId] });
      toast.success("Perfil actualizado");
      setIsEditing(false);
    },
    onError: (e: Error) => toast.error(getSafeErrorMessage(e))
  });

  const infoItems = fullMember
    ? [
      { icon: User, label: "Nombre", value: fullMember.full_name, key: "full_name" },
      { icon: Phone, label: "Teléfono", value: fullMember.phone || "—", key: "phone" },
      { icon: Shield, label: "Identificación", value: fullMember.identification || "—", key: "identification" },
      { icon: Shield, label: "Núm. IFAA", value: fullMember.ifaa_number || "—", key: "ifaa_number" },
      { icon: Calendar, label: "Incorporación", value: fullMember.enrollment_date || "—", key: "enrollment_date" },
      { icon: User, label: "Estilo Polera", value: fullMember.shirt_gender ? (fullMember.shirt_gender === 'masculino' ? 'Masculino' : 'Femenino') : "—", key: "shirt_gender" },
      { icon: MapPin, label: "Dirección", value: fullMember.address || "—", key: "address" },
      { icon: Heart, label: "Contacto Emergencia", value: fullMember.emergency_contact_name || "—", key: "emergency_contact_name" },
      { icon: Phone, label: "Tel. Emergencia", value: fullMember.emergency_contact_phone || "—", key: "emergency_contact_phone" },
    ]
    : [];

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Mi Perfil</h1>
          <p className="text-muted-foreground">{isEditing ? "Editando información" : "Información personal y gestión de cuenta"}</p>
        </div>
        <div className="flex gap-2">
          {!isEditing && fullMember && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Editar Perfil
            </Button>
          )}
          {!isEditing && member?.id === selectedMemberId && (
            <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(!isChangingPassword)} className="gap-2">
              <Lock className="h-4 w-4" /> Seguridad
            </Button>
          )}
        </div>
      </motion.div>

      {isSuperAdmin && !isEditing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 sm:p-5 space-y-4">
          <Label>Ver perfil de otro miembro (Super Admin)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Select value={selectedClubId} onValueChange={(val) => {
              setSelectedClubId(val);
              setSelectedMemberId("");
              fetchMembers(val);
            }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
              <SelectContent>
                {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar miembro" /></SelectTrigger>
              <SelectContent>
                {membersList.map(m => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}

      {isChangingPassword && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass rounded-xl p-6 border-primary/20 space-y-4 overflow-hidden">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> Actualizar Contraseña
          </h3>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <Label htmlFor="pass">Nueva contraseña (mín. 6 caracteres)</Label>
              <div className="relative">
                <Input
                  id="pass"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setIsChangingPassword(false)}>Cancelar</Button>
              <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending}>Guardar</Button>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          {/* Avatar Section */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 sm:p-6 flex flex-col items-center gap-4 text-center">
            <div className="relative group">
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-muted overflow-hidden border-2 border-primary/20 shadow-lg">
                {formData.avatar_url ? (
                  <img src={formData.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10">
                    <User className="h-12 w-12 text-primary/40" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <span className="text-xs font-medium">Cambiar</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(file);
                  }}
                />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">{formData.full_name}</h2>
              <p className="text-sm text-muted-foreground">{formData.display_name ? `"${formData.display_name}"` : ""}</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1">
                {formData.roles?.map((r: string) => (
                  <Badge key={r} variant="secondary" className="capitalize text-[10px] px-2 py-0">
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Club info */}
          {club && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 border-l-4 border-primary">
              <p className="text-[10px] uppercase font-bold text-primary mb-1">Mi Club</p>
              <h3 className="font-display font-bold text-foreground text-lg">{club.name}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {[club.city, club.country].filter(Boolean).join(", ")}
              </p>
            </motion.div>
          )}

          {/* Status */}
          {fullMember && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Estado de membresía</span>
                <div className="flex gap-2">
                  <Badge variant={fullMember.status === "activo" ? "default" : "destructive"} className="h-5 px-2">
                    {fullMember.status}
                  </Badge>
                  {fullMember.status === "activo" && (
                    <Badge variant={financialStatus === "vigente" ? "secondary" : "destructive"} className="h-5 px-2 bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {financialStatus}
                    </Badge>
                  )}
                </div>
              </div>
              {fullMember.observations && (
                <p className="text-xs text-muted-foreground italic border-t border-border/50 pt-2 mt-2">
                  "{fullMember.observations}"
                </p>
              )}
            </motion.div>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          {/* Personal info / EDIT FORM */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6 space-y-6 h-fit">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Datos del Arquero
              </h3>
            </div>

            {isEditing ? (
              <div className="space-y-4 pt-2">
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Identificación (RUT/DNI)</Label>
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.identification} onChange={(e) => setFormData({ ...formData, identification: formatRUT(e.target.value) })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Dirección Particular</Label>
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Número IFAA</Label>
                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.ifaa_number} onChange={(e) => setFormData({ ...formData, ifaa_number: e.target.value })} placeholder="Ej: CL-1234" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha de Incorporación</Label>
                    <input type="date" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.enrollment_date} onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Corte de Polera/Cortavientos</Label>
                    <Select value={formData.shirt_gender} onValueChange={(val) => setFormData({ ...formData, shirt_gender: val })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar corte" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Antecedentes Médicos / Alergias</Label>
                  <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.medical_history} onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })} />
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Heart className="h-3 w-3 text-destructive" /> Emergencia
                  </h4>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre Contacto</Label>
                      <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono Contacto</Label>
                      <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Wallet className="h-3 w-3 text-emerald-500" /> Información de Cobro
                  </h4>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Día de Cobro Mensual</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        type="number"
                        min="1"
                        max="31"
                        value={formData.billing_day}
                        onChange={(e) => setFormData({ ...formData, billing_day: e.target.value })}
                        disabled={!isSuperAdmin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Días de Gracia</Label>
                      <input
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        type="number"
                        min="0"
                        value={formData.grace_days}
                        onChange={(e) => setFormData({ ...formData, grace_days: e.target.value })}
                        disabled={!isSuperAdmin}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                  <Button variant="ghost" onClick={() => setIsEditing(false)} className="gap-2 w-full sm:w-auto">
                    <X className="h-4 w-4" /> Cancelar
                  </Button>
                  <Button onClick={() => updateProfile.mutate()} className="flex-1 gap-2 w-full sm:flex-auto">
                    <Save className="h-4 w-4" /> Guardar Cambios
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {infoItems.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                      <Icon className="h-3 w-3" /> {label}
                    </p>
                    <p className="text-sm font-medium text-foreground">{value}</p>
                  </div>
                ))}

                <div className="sm:col-span-2 border-t border-border/50 pt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Talla Polera</p>
                    <Badge variant="outline" className="font-mono">{formData.shirt_size || "—"}</Badge>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Talla Cortavientos</p>
                    <Badge variant="outline" className="font-mono">{formData.windbreaker_size || "—"}</Badge>
                  </div>
                </div>

                {fullMember?.medical_history && (
                  <div className="sm:col-span-2 bg-rose-500/5 p-4 rounded-xl border border-rose-500/10">
                    <p className="text-[10px] uppercase font-bold text-rose-600 mb-1">Información Médica</p>
                    <p className="text-sm text-foreground italic">"{fullMember.medical_history}"</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Sección de Pagos (Visualización intuitiva) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500" /> Control de Pagos
              </h3>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Estado Actual
              </Badge>
            </div>

            {!payments || payments.length === 0 ? (
              <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-border/50">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs text-muted-foreground">Aún no hay registros financieros en tu cuenta.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Grid de meses de membresía */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {Array.from({ length: 6 }).map((_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const month = date.getMonth() + 1;
                    const year = date.getFullYear();
                    const p = payments.find(p =>
                      isMembershipCategory(p.category)
                      && p.payment_month === month
                      && p.payment_year === year
                    );

                    return (
                      <div key={i} className={cn(
                        "p-2 rounded-xl border text-center transition-all",
                        p ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/50 border-border/50 opacity-60"
                      )}>
                        <p className="text-[9px] uppercase font-bold text-muted-foreground">{date.toLocaleString('es-ES', { month: 'short' })}</p>
                        <p className="text-xs font-bold">{year}</p>
                        <div className="mt-1 flex justify-center">
                          {p ? (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          )}
                        </div>
                      </div>
                    );
                  }).reverse()}
                </div>

                {/* Listado de movimientos */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] px-1">Últimos movimientos</p>
                  {payments.slice(0, 3).map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-card/40 rounded-xl border border-border/30 hover:bg-card/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center",
                          isMembershipCategory(p.category) ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-600"
                        )}>
                          {isMembershipCategory(p.category) ? <Calendar className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold capitalize">{p.category}</p>
                          <p className="text-[9px] text-muted-foreground">
                            {new Date(p.entry_date).toLocaleDateString("es-CL")} {p.description ? `• ${p.description}` : ""}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs font-bold text-emerald-600">{formatCurrency(p.amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
