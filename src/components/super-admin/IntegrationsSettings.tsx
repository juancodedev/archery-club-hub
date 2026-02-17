import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export default function IntegrationsSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        const { data, error } = await supabase.from("system_settings").select("*").maybeSingle();
        if (error && error.code !== "PGRST116") {
            toast.error("Error al cargar configuraciones");
        } else if (data) {
            setSettings(data);
        } else {
            // Seed if not exists (though migration should do it)
            setSettings({ mercadopago_mode: 'fictitious', annual_discount_percentage: 20 });
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        const { error } = await supabase.from("system_settings").upsert({
            id: settings.id,
            mercadopago_mode: settings.mercadopago_mode,
            mercadopago_public_key: settings.mercadopago_public_key,
            annual_discount_percentage: settings.annual_discount_percentage,
            updated_at: new Date().toISOString()
        });

        if (error) {
            toast.error("Error al guardar configuraciones");
        } else {
            toast.success("Configuraciones guardadas");
            fetchSettings();
        }
        setSaving(false);
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="glass p-6 rounded-2xl space-y-6">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Pasarelas de Pago</h3>
                    <p className="text-sm text-muted-foreground">Configura la integración con Mercado Pago.</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="space-y-0.5">
                        <Label className="text-base">Modo de Operación</Label>
                        <p className="text-sm text-muted-foreground">
                            {settings?.mercadopago_mode === 'real' ? 'Transacciones reales habilitadas.' : 'Modo ficticio para pruebas.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {settings?.mercadopago_mode === 'real' ? 'Real' : 'Pruebas'}
                        </span>
                        <Switch
                            checked={settings?.mercadopago_mode === 'real'}
                            onCheckedChange={(checked) => setSettings({ ...settings, mercadopago_mode: checked ? 'real' : 'fictitious' })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mp_key">Mercado Pago Public Key</Label>
                    <Input
                        id="mp_key"
                        placeholder="APP_USR-..."
                        value={settings.mercadopago_public_key || ""}
                        onChange={(e) => setSettings({ ...settings, mercadopago_public_key: e.target.value })}
                    />
                </div>

                <div className="pt-4 border-t border-border/50">
                    <h3 className="text-lg font-semibold mb-2">Descuentos Globales</h3>
                    <p className="text-sm text-muted-foreground mb-4">Configura los descuentos automáticos para el sistema.</p>

                    <div className="space-y-2">
                        <Label htmlFor="annual_discount">Descuento Pago Anual (%)</Label>
                        <Input
                            id="annual_discount"
                            type="number"
                            min="0"
                            max="100"
                            value={settings.annual_discount_percentage || 0}
                            onChange={(e) => setSettings({ ...settings, annual_discount_percentage: parseInt(e.target.value) })}
                        />
                    </div>
                </div>

                {!settings ? (
                    <div className="p-8 text-center bg-destructive/5 rounded-xl border border-destructive/20">
                        <p className="text-sm text-destructive font-medium mb-4">No se pudo cargar la configuración del sistema.</p>
                        <Button variant="outline" size="sm" onClick={fetchSettings}>Reintentar</Button>
                    </div>
                ) : (
                    <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
                        {saving ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                )}
            </div>
        </div>
    );
}
