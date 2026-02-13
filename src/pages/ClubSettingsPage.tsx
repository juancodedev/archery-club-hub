import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Settings, DollarSign, Link as LinkIcon, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

export default function ClubSettingsPage() {
  const { member } = useAuth();
  const isSuperAdmin = member?.is_super_admin || member?.email === 'cl.jmunoz@gmail.com';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<any[]>([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchClubs();
    } else if (member?.club_id) {
      setSelectedClubId(member.club_id);
    }
  }, [member, isSuperAdmin]);

  const fetchClubs = async () => {
    const { data } = await supabase.from("clubs").select("id, name").order("name");
    if (data) setClubs(data);
  };

  const { data: club } = useQuery({
    queryKey: ["club-settings", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null" || selectedClubId === "00000000-0000-0000-0000-000000000000") return null;
      const { data } = await supabase.from("clubs").select("*").eq("id", selectedClubId).single();
      return data;
    },
    enabled: !!selectedClubId,
  });

  const [inscriptionFee, setInscriptionFee] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [feeInit, setFeeInit] = useState(false);

  // Init form values when club loads
  if (club && !feeInit) {
    setInscriptionFee(String(club.inscription_fee || 0));
    setMonthlyFee(String(club.monthly_fee || 0));
    setDefaultPassword(club.default_member_password);
    setFeeInit(true);
  }

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!selectedClubId) throw new Error("No club selected");
      const { error } = await supabase
        .from("clubs")
        .update({
          inscription_fee: Number(inscriptionFee) || 0,
          monthly_fee: Number(monthlyFee) || 0,
          default_member_password: defaultPassword,
        } as any)
        .eq("id", selectedClubId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-settings"] });
      toast({ title: "Configuración actualizada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Invitations
  const { data: invitations } = useQuery({
    queryKey: ["invitations", selectedClubId],
    queryFn: async () => {
      if (!selectedClubId || selectedClubId === "null") return [];
      const { data } = await supabase
        .from("member_invitations")
        .select("*")
        .eq("club_id", selectedClubId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!selectedClubId,
  });

  const [invEmail, setInvEmail] = useState("");

  const createInvitation = useMutation({
    mutationFn: async () => {
      if (!selectedClubId) throw new Error("No club selected");

      const isVirtual = member?.id === '00000000-0000-0000-0000-000000000000';
      const creatorId = (member?.id && !isVirtual) ? member.id : null;

      const { error } = await supabase.from("member_invitations").insert({
        club_id: selectedClubId,
        email: invEmail || null,
        created_by: creatorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      toast({ title: "Invitación creada" });
      setInvEmail("");
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Enlace copiado al portapapeles" });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configuración del Club
        </h1>
        <p className="text-muted-foreground">Montos, invitaciones y más</p>
      </motion.div>

      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-5">
          <h3 className="font-display font-semibold text-foreground mb-4">Seleccionar Club para Configurar</h3>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
            <SelectContent>
              {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      {/* Fees */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-accent" />
          Montos del Club
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Inscripción (única vez)</Label>
            <Input type="number" value={inscriptionFee} onChange={(e) => setInscriptionFee(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Mensualidad</Label>
            <Input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label className="flex items-center gap-1">
              Password por defecto para nuevos miembros
              <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="Establece una contraseña segura"
              required
            />
            <p className="text-[10px] text-muted-foreground">Esta contraseña se asignará a las cuentas creadas manualmente desde el panel de miembros.</p>
          </div>
        </div>
        <Button
          onClick={() => {
            if (!defaultPassword) {
              toast({ title: "Error", description: "La contraseña por defecto es obligatoria", variant: "destructive" });
              return;
            }
            updateSettings.mutate();
          }}
          disabled={updateSettings.isPending}
        >
          {updateSettings.isPending ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </motion.div>

      {/* Invitations */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-primary" />
          Enlaces de Invitación
        </h3>
        <p className="text-sm text-muted-foreground">Crea enlaces de registro para nuevos miembros. Cada enlace expira en 48 horas.</p>
        <div className="flex gap-2">
          <Input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="Email del invitado (opcional)" className="flex-1" />
          <Button onClick={() => createInvitation.mutate()} disabled={createInvitation.isPending} className="gap-1">
            <Plus className="h-4 w-4" />Crear
          </Button>
        </div>

        {invitations && invitations.length > 0 && (
          <div className="space-y-2 mt-4">
            {invitations.map((inv: any) => {
              const isExpired = new Date(inv.expires_at) < new Date();
              const isUsed = !!inv.used_at;
              return (
                <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{inv.email || "Sin email"}</p>
                    <p className="text-xs text-muted-foreground">
                      {isUsed ? "✓ Usado" : isExpired ? "✕ Expirado" : `Expira: ${new Date(inv.expires_at).toLocaleString("es-CL")}`}
                    </p>
                  </div>
                  {!isUsed && !isExpired && (
                    <Button variant="ghost" size="sm" onClick={() => copyLink(inv.token)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
