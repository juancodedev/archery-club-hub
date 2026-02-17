import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { formatRUT } from "@/lib/rut";

interface MemberData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  identification: string | null;
  date_of_birth: string | null;
  observations: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  shirt_size: string | null;
  windbreaker_size: string | null;
  display_name: string | null;
}

interface Props {
  member: MemberData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditMemberDialog({ member, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [identification, setIdentification] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [observations, setObservations] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [shirtSize, setShirtSize] = useState("");
  const [windbreakerSize, setWindbreakerSize] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (member) {
      setName(member.full_name);
      setEmail(member.email);
      setPhone(member.phone || "");
      setAddress(member.address || "");
      setIdentification(member.identification || "");
      setDateOfBirth(member.date_of_birth || "");
      setObservations(member.observations || "");
      setEmergencyName(member.emergency_contact_name || "");
      setEmergencyPhone(member.emergency_contact_phone || "");
      setShirtSize(member.shirt_size || "");
      setWindbreakerSize(member.windbreaker_size || "");
      setDisplayName(member.display_name || "");
    }
  }, [member]);

  const updateMember = useMutation({
    mutationFn: async () => {
      if (!member) return;
      const { error } = await supabase
        .from("members")
        .update({
          full_name: name,
          email,
          phone: phone || null,
          address: address || null,
          identification: identification || null,
          date_of_birth: dateOfBirth || null,
          observations: observations || null,
          emergency_contact_name: emergencyName || null,
          emergency_contact_phone: emergencyPhone || null,
          shirt_size: shirtSize || null,
          windbreaker_size: windbreakerSize || null,
          display_name: displayName || null,
        } as any)
        .eq("id", member.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-members"] });
      toast({ title: "Miembro actualizado" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Editar Miembro</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); updateMember.mutate(); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre completo</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Nombre en Polera (Pila)</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Correo electrónico</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Identificación</Label>
              <Input value={identification} onChange={(e) => setIdentification(formatRUT(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Contacto Emergencia</Label>
              <Input value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tel. Emergencia</Label>
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Talla Polera</Label>
              <Input value={shirtSize} onChange={(e) => setShirtSize(e.target.value)} placeholder="Ej: M" />
            </div>
            <div className="space-y-2">
              <Label>Talla Cortavientos</Label>
              <Input value={windbreakerSize} onChange={(e) => setWindbreakerSize(e.target.value)} placeholder="Ej: L" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Input value={observations} onChange={(e) => setObservations(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={updateMember.isPending}>
            {updateMember.isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
