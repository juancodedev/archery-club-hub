import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Settings, CreditCard, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import ClubConfigDialog from "./ClubConfigDialog";
import PlanOverrideDialog from "./PlanOverrideDialog";
import ExtraChargesDialog from "./ExtraChargesDialog";

interface Club {
    id: string;
    name: string;
    subscription_status: 'activo' | 'pendiente' | 'bloqueado';
    subscription_end_date: string | null;
    monthly_price: number;
    student_limit_override?: number | null;
    grace_period_days?: number;
    block_type?: 'total' | 'partial';
}

interface ClubActionsMenuProps {
    club: Club;
    onStatusToggle: (clubId: string, currentStatus: string) => void;
}

export default function ClubActionsMenu({ club, onStatusToggle }: ClubActionsMenuProps) {
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isPlanOpen, setIsPlanOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass w-56">
                    <DropdownMenuLabel>Acciones del Club</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => setIsConfigOpen(true)}>
                        <Settings className="mr-2 h-4 w-4 text-indigo-400" />
                        <span>Ver Configuración</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setIsPlanOpen(true)}>
                        <CreditCard className="mr-2 h-4 w-4 text-emerald-400" />
                        <span>Gestionar Plan (Excepciones)</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <div className="px-2 py-1.5 hover:bg-muted/50 rounded-sm cursor-pointer transition-colors">
                        <ExtraChargesDialog clubId={club.id} clubName={club.name} />
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                        className={club.subscription_status === 'activo' ? "text-destructive focus:bg-destructive/10" : "text-emerald-500 focus:bg-emerald-500/10"}
                        onClick={() => onStatusToggle(club.id, club.subscription_status)}
                    >
                        {club.subscription_status === 'activo' ? (
                            <>
                                <Lock className="mr-2 h-4 w-4" />
                                <span>Bloquear Acceso</span>
                            </>
                        ) : (
                            <>
                                <Unlock className="mr-2 h-4 w-4" />
                                <span>Activar Acceso</span>
                            </>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <ClubConfigDialog
                clubId={club.id}
                clubName={club.name}
                isOpen={isConfigOpen}
                onOpenChange={setIsConfigOpen}
            />

            <PlanOverrideDialog
                club={club}
                isOpen={isPlanOpen}
                onOpenChange={setIsPlanOpen}
            />
        </>
    );
}
