import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { User, Phone, Mail, MapPin, Calendar, Shield } from "lucide-react";

export default function ProfilePage() {
  const { member } = useAuth();

  const { data: fullMember } = useQuery({
    queryKey: ["member-profile", member?.id],
    queryFn: async () => {
      if (!member) return null;
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("id", member.id)
        .single();
      return data;
    },
    enabled: !!member,
  });

  const { data: club } = useQuery({
    queryKey: ["club", member?.club_id],
    queryFn: async () => {
      if (!member) return null;
      const { data } = await supabase
        .from("clubs")
        .select("*")
        .eq("id", member.club_id)
        .single();
      return data;
    },
    enabled: !!member,
  });

  const infoItems = fullMember
    ? [
        { icon: User, label: "Nombre", value: fullMember.full_name },
        { icon: Mail, label: "Correo", value: fullMember.email },
        { icon: Phone, label: "Teléfono", value: fullMember.phone || "—" },
        { icon: MapPin, label: "Dirección", value: fullMember.address || "—" },
        { icon: Calendar, label: "Fecha Nacimiento", value: fullMember.date_of_birth ? new Date(fullMember.date_of_birth).toLocaleDateString("es-CL") : "—" },
        { icon: Calendar, label: "Inscripción", value: new Date(fullMember.enrollment_date).toLocaleDateString("es-CL") },
        { icon: Shield, label: "Identificación", value: fullMember.identification || "—" },
      ]
    : [];

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground">Mi Perfil</h1>
        <p className="text-muted-foreground">Información personal y del club</p>
      </motion.div>

      {/* Club info */}
      {club && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-2">🏹 {club.name}</h3>
          <p className="text-sm text-muted-foreground">
            {[club.city, club.country].filter(Boolean).join(", ") || "Sin ubicación"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {member?.roles.map((role) => (
              <span key={role} className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary capitalize">
                {role}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Personal info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-foreground">Datos Personales</h3>
        {infoItems.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-medium text-foreground">{value}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Status */}
      {fullMember && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado de membresía</span>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
              fullMember.status === "activo" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
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
