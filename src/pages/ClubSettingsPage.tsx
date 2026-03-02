import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Settings, DollarSign, Link as LinkIcon, Copy, Plus, Trophy, Target, QrCode } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { QRCodeCanvas } from "qrcode.react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DivisionsManager from "@/components/admin/DivisionsManager";
import TournamentTypesManager from "@/components/admin/TournamentTypesManager";
import { Switch } from "@/components/ui/switch";

export default function ClubSettingsPage() {
  const { member } = useAuth();
  const isSuperAdmin = !!member?.is_super_admin;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedClubId, setSelectedClubId] = useState<string>("");
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([]);
  const [qrToken, setQrToken] = useState<string | null>(null);

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
  const [allowSuperAdminFinances, setAllowSuperAdminFinances] = useState(false);
  const [feeInit, setFeeInit] = useState(false);

  // Init form values when club loads
  useEffect(() => {
    if (club) {
      setInscriptionFee(String(club.inscription_fee || 0));
      setMonthlyFee(String(club.monthly_fee || 0));
      setAllowSuperAdminFinances(club.allow_superadmin_finances || false);
      setFeeInit(true);
    }
  }, [club]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!selectedClubId) throw new Error("No club selected");
      const { error } = await supabase
        .from("clubs")
        .update({
          inscription_fee: Number(inscriptionFee) || 0,
          monthly_fee: Number(monthlyFee) || 0,
          allow_superadmin_finances: allowSuperAdminFinances,
        })
        .eq("id", selectedClubId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-settings"] });
      toast({ title: "Configuración actualizada" });
    },
    onError: (e: Error) => toast({ title: "Error", description: getSafeErrorMessage(e), variant: "destructive" }),
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
    onError: (e: Error) => toast({ title: "Error", description: getSafeErrorMessage(e), variant: "destructive" }),
  });

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/join?token=${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Enlace copiado al portapapeles" });
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex-1 text-left">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Configuración del Club
          </h1>
          <p className="text-sm text-muted-foreground">Administra montos, categorías y formatos de torneo</p>
        </div>
      </motion.div>

      {isSuperAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 sm:p-5">
          <h3 className="font-display font-semibold text-foreground mb-4 text-left">Seleccionar Club para Configurar</h3>
          <Select value={selectedClubId} onValueChange={setSelectedClubId}>
            <SelectTrigger><SelectValue placeholder="Seleccionar club" /></SelectTrigger>
            <SelectContent>
              {clubs.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </motion.div>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid grid-cols-3 w-full sm:w-[500px] mb-6">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="divisions" className="gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Divisiones</span>
          </TabsTrigger>
          <TabsTrigger value="tournaments" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Torneos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Fees */}
          <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-left">
              <DollarSign className="h-4 w-4 text-accent" />
              Montos y Seguridad
            </h3>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 text-left">
              <div className="space-y-2">
                <Label>Inscripción (única vez)</Label>
                <Input type="number" value={inscriptionFee} onChange={(e) => setInscriptionFee(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label>Mensualidad</Label>
                <Input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-4 sm:col-span-2 pt-4 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Privacidad de Finanzas</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que el Soporte Técnico (SuperAdmin) visualice los registros financieros de este club.
                    </p>
                  </div>
                  <Switch
                    checked={allowSuperAdminFinances}
                    onCheckedChange={setAllowSuperAdminFinances}
                  />
                </div>
              </div>
            </div>
            <div className="pt-2 text-left">
              <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="w-full sm:w-auto">
                {updateSettings.isPending ? "Guardando..." : "Guardar Configuración General"}
              </Button>
            </div>
          </div>

          {/* Invitations */}
          <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2 text-left">
              <LinkIcon className="h-4 w-4 text-primary" />
              Enlaces de Invitación
            </h3>
            <p className="text-sm text-muted-foreground text-left">Crea enlaces de registro para nuevos miembros. Cada enlace expira en 48 horas.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={invEmail} onChange={(e) => setInvEmail(e.target.value)} placeholder="Email del invitado (opcional)" className="flex-1" />
              <Button onClick={() => createInvitation.mutate()} disabled={createInvitation.isPending} className="gap-1 w-full sm:w-auto">
                <Plus className="h-4 w-4" />Crear
              </Button>
            </div>

            {invitations && invitations.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {invitations.map((inv) => {
                  const isExpired = new Date(inv.expires_at) < new Date();
                  const isUsed = !!inv.used_at;
                  return (
                    <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-left">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{inv.email || "Sin email"}</p>
                        <p className="text-xs text-muted-foreground">
                          {isUsed ? "✓ Usado" : isExpired ? "✕ Expirado" : `Expira: ${new Date(inv.expires_at).toLocaleString("es-CL")}`}
                        </p>
                      </div>
                      {!isUsed && !isExpired && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setQrToken(inv.token)} title="Ver QR">
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => copyLink(inv.token)} title="Copiar enlace">
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="divisions">
          <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
            <div className="text-left">
              <h3 className="font-display font-semibold text-foreground">Gestión de Divisiones</h3>
              <p className="text-sm text-muted-foreground">Categorías configurables para los torneos del club</p>
            </div>
            {selectedClubId && <DivisionsManager clubId={selectedClubId} isSuperAdmin={isSuperAdmin} />}
          </div>
        </TabsContent>

        <TabsContent value="tournaments">
          <div className="glass rounded-xl p-4 sm:p-5 space-y-4">
            <div className="text-left">
              <h3 className="font-display font-semibold text-foreground">Tipos de Torneo</h3>
              <p className="text-sm text-muted-foreground">Define los formatos de competencia (distancia, flechas, etc.)</p>
            </div>
            {selectedClubId && <TournamentTypesManager clubId={selectedClubId} isSuperAdmin={isSuperAdmin} />}
          </div>
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={!!qrToken} onOpenChange={(open) => !open && setQrToken(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR de Invitación</DialogTitle>
            <DialogDescription>
              Escanea este código para ir directamente a la página de registro del club.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-6 space-y-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-border">
              {qrToken && (
                <QRCodeCanvas
                  value={`${window.location.origin}/join?token=${qrToken}`}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center break-all max-w-[256px]">
              {qrToken && `${window.location.origin}/join?token=${qrToken}`}
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (qrToken) copyLink(qrToken);
              }}
            >
              <Copy className="h-4 w-4 mr-2" /> Copiar Enlace
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
