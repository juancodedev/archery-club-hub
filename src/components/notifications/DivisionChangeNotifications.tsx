import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContextCore";
import { Bell, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Notification {
    id: string;
    old_division_id: string;
    new_division_id: string;
    change_date: string;
    acknowledged_at: string | null;
    old_division: { name: string };
    new_division: { name: string };
}

export default function DivisionChangeNotifications() {
    const { member } = useAuth();
    const queryClient = useQueryClient();

    const { data: notifications, isLoading } = useQuery({
        queryKey: ["division-notifications", member?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("division_change_notifications")
                .select(`
          id,
          old_division_id,
          new_division_id,
          change_date,
          acknowledged_at,
          old_division:divisions!old_division_id(name),
          new_division:divisions!new_division_id(name)
        `)
                .eq("member_id", member?.id)
                .is("acknowledged_at", null)
                .order("change_date", { ascending: false });

            if (error) throw error;
            return data as unknown as Notification[];
        },
        enabled: !!member?.id,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .rpc("acknowledge_division_notification", { p_notification_id: id });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["division-notifications"] });
        },
    });

    const unreadCount = notifications?.length || 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                            variant="destructive"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="flex items-center justify-between border-b p-4">
                    <h4 className="font-semibold text-sm">Notificaciones</h4>
                    <Badge variant="secondary">{unreadCount} nuevas</Badge>
                </div>
                <ScrollArea className="max-h-[300px]">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Cargando...</div>
                    ) : unreadCount === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No tienes notificaciones pendientes
                        </div>
                    ) : (
                        <div className="grid gap-1">
                            {notifications?.map((n) => (
                                <div key={n.id} className="flex gap-3 p-4 hover:bg-muted/50 transition-colors border-b last:border-0">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                                        <Info className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className="text-xs font-medium leading-none">Cambio de División</p>
                                        <p className="text-xs text-muted-foreground">
                                            Tu división ha cambiado de <span className="font-semibold">{n.old_division.name}</span> a <span className="font-semibold text-primary">{n.new_division.name}</span> debido a tu edad.
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {format(new Date(n.change_date), "PPP", { locale: es })}
                                        </p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="h-auto p-0 text-xs gap-1"
                                            onClick={() => acknowledgeMutation.mutate(n.id)}
                                        >
                                            <Check className="h-3 w-3" /> Entendido
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
