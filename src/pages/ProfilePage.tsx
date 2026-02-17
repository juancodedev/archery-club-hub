import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Phone, Mail, MapPin, Calendar, Shield, Heart, Save, Pencil, X } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatRUT } from "@/lib/rut";

export default function ProfilePage() {
  const { member, user } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const queryClient = useQueryClient();

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const [clubs, setClubs] = useState<any[]>([]);
  const [membersList, setMembersList] = useState<any[]>([]);

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
    avatar_url: ""
  });

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.id) {
      setSelectedMemberId(member.id);
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const fetchMembers = async (clubId: string) => {
    if (!clubId || clubId === "null") return;
    const { data } = await supabase.from("members").select("id, full_name").eq("club_id", clubId).order("full_name");
    if (data) setMembersList(data);
  };

  const { data: fullMember, isLoading: loadingMember } = useQuery({
    queryKey: ["member-profile", selectedMemberId],
    queryFn: async () => {
      if (!selectedMemberId || selectedMemberId === "null" || selectedMemberId === "00000000-0000-0000-0000-000000000000") return null;
      const { data } = await supabase
        .from("members")
        .select("*, member_roles(role)")
        .eq("id", selectedMemberId)
        .single();

      if (data) {
        setFormData({
          full_name: (data as any).full_name || "",
          phone: (data as any).phone || "",
          address: (data as any).address || "",
          identification: (data as any).identification || "",
          medical_history: (data as any).medical_history || "",
          guardian_name: (data as any).guardian_name || "",
          guardian_phone: (data as any).guardian_phone || "",
          emergency_contact_name: (data as any).emergency_contact_name || "",
          emergency_contact_phone: (data as any).emergency_contact_phone || "",
          shirt_size: (data as any).shirt_size || "",
          windbreaker_size: (data as any).windbreaker_size || "",
          display_name: (data as any).display_name || "",
          avatar_url: (data as any).avatar_url || "",
          roles: (data as any).member_roles?.map((r: any) => r.role) || []
        } as any);
      }
      return data;
    },
    enabled: !!selectedMemberId,
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
          .update({ avatar_url: publicUrl } as any)
          .eq("id", selectedMemberId);
        toast.success("Foto de perfil actualizada");
        queryClient.invalidateQueries({ queryKey: ["member-profile", selectedMemberId] });
      }
    } catch (error: any) {
      toast.error("Error al subir imagen: " + error.message);
    }
  };

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!selectedMemberId) return;
      const { error } = await supabase
        .from("members")
        .update(formData as any)
        .eq("id", selectedMemberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-profile", selectedMemberId] });
      toast.success("Perfil actualizado");
      setIsEditing(false);
    },
    onError: (e: any) => toast.error("Error: " + e.message)
  });

  const infoItems = fullMember
    ? [
      { icon: User, label: "Nombre", value: fullMember.full_name, key: "full_name" },
      { icon: Phone, label: "Teléfono", value: fullMember.phone || "—", key: "phone" },
      { icon: Shield, label: "Identificación", value: fullMember.identification || "—", key: "identification" },
      { icon: MapPin, label: "Dirección", value: fullMember.address || "—", key: "address" },
      { icon: Heart, label: "Contacto Emergencia", value: (fullMember as any).emergency_contact_name || "—", key: "emergency_contact_name" },
      { icon: Phone, label: "Tel. Emergencia", value: (fullMember as any).emergency_contact_phone || "—", key: "emergency_contact_phone" },
    ]
    : [];

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Datos Personales</h1>
          <p className="text-muted-foreground">{isEditing ? "Editando información" : "Información personal y del club"}</p>
        </div>
        {!isEditing && fullMember && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
            <Pencil className="h-4 w-4" /> Editar Perfil
          </Button>
        )}
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

      {/* Avatar Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 sm:p-6 flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-muted overflow-hidden border-2 border-primary/20">
            {formData.avatar_url ? (
              <img src={formData.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-primary/10">
                <User className="h-10 w-10 text-primary/40" />
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
        {!isEditing && (
          <div className="text-center">
            <h2 className="text-xl font-display font-bold text-foreground">{formData.full_name}</h2>
            <p className="text-sm text-muted-foreground">{formData.display_name ? `"${formData.display_name}"` : ""}</p>
          </div>
        )}
      </motion.div>

      {/* Club info */}
      {club && !isEditing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-2">🏹 {club.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[club.city, club.country].filter(Boolean).join(", ") || "Sin ubicación"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(fullMember as any)?.member_roles?.map((r: any) => (
              <span key={r.role} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                {r.role}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Personal info / EDIT FORM */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-semibold text-foreground italic flex items-center gap-2">
            <Shield className="h-4 w-4" /> Datos de Identificación
          </h3>
        </div>

        {isEditing ? (
          <div className="space-y-4 pt-2">
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Identificación (RUT/DNI)</Label>
                <Input value={formData.identification} onChange={(e) => setFormData({ ...formData, identification: formatRUT(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nombre en Polera (Pila)</Label>
                <Input value={formData.display_name} onChange={(e) => setFormData({ ...formData, display_name: e.target.value })} placeholder="Ej: Juanito" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Historial Médico / Alergias</Label>
              <Input value={formData.medical_history} onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })} />
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive" /> Contacto de Emergencia
              </h4>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre del contacto</Label>
                  <Input value={formData.emergency_contact_name} onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono del contacto</Label>
                  <Input value={formData.emergency_contact_phone} onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })} />
                </div>
              </div>
            </div>

            {!(formData as any).roles?.includes("alumno") && (
              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-semibold mb-3">Tabla de Tallas</h4>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Talla Polera</Label>
                    <Select value={formData.shirt_size} onValueChange={(val) => setFormData({ ...formData, shirt_size: val })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Talla Cortavientos</Label>
                    <Select value={formData.windbreaker_size} onValueChange={(val) => setFormData({ ...formData, windbreaker_size: val })}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label>Nombre del Tutor (menores)</Label>
                <Input value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono del Tutor</Label>
                <Input value={formData.guardian_phone} onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })} />
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
          <div className="space-y-4">
            {infoItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              </div>
            ))}

            {!(formData as any).roles?.includes("alumno") && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-muted-foreground">Talla Polera</p>
                  <p className="text-sm font-medium text-foreground">{formData.shirt_size || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Talla Cortavientos</p>
                  <p className="text-sm font-medium text-foreground">{formData.windbreaker_size || "—"}</p>
                </div>
              </div>
            )}

            {fullMember?.medical_history && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Información Médica</p>
                <p className="text-sm text-foreground italic">"{fullMember.medical_history}"</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Status */}
      {fullMember && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado de membresía</span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${(fullMember as any).status === "activo" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}>
              {(fullMember as any).status === "activo" ? "✓ Activo" : "✕ Inactivo"}
            </span>
          </div>
          {(fullMember as any).observations && (
            <p className="mt-3 text-sm text-muted-foreground">{(fullMember as any).observations}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
