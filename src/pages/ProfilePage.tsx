import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Phone, Mail, MapPin, Calendar, Shield } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Pencil, X } from "lucide-react";

export default function ProfilePage() {
  const { member } = useAuth();
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
    guardian_phone: ""
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
        .select("*")
        .eq("id", selectedMemberId)
        .single();

      if (data) {
        setFormData({
          full_name: data.full_name || "",
          phone: data.phone || "",
          address: data.address || "",
          identification: data.identification || "",
          medical_history: data.medical_history || "",
          guardian_name: data.guardian_name || "",
          guardian_phone: data.guardian_phone || ""
        });
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5 space-y-4">
          <Label>Ver perfil de otro miembro (Super Admin)</Label>
          <div className="grid grid-cols-2 gap-4">
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

      {/* Club info */}
      {club && !isEditing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-2">🏹 {club.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[club.city, club.country].filter(Boolean).join(", ") || "Sin ubicación"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {fullMember?.member_roles?.map((r: any) => (
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Identificación (RUT/DNI)</Label>
                <Input value={formData.identification} onChange={(e) => setFormData({ ...formData, identification: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Historial Médico / Alergias</Label>
              <Input value={formData.medical_history} onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
              <div className="space-y-2">
                <Label>Nombre del Tutor (opcional)</Label>
                <Input value={formData.guardian_name} onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono del Tutor</Label>
                <Input value={formData.guardian_phone} onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={() => updateProfile.mutate()} className="flex-1 gap-2">
                <Save className="h-4 w-4" /> Guardar Cambios
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} className="gap-2">
                <X className="h-4 w-4" /> Cancelar
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
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${fullMember.status === "activo" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}>
              {fullMember.status === "activo" ? "✓ Activo" : "✕ Inactivo"}
            </span>
          </div>
          {fullMember.observations && (
            <p className="mt-3 text-sm text-muted-foreground">{fullMember.observations}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
