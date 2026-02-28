import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import MemberDivisionsManager from "./MemberDivisionsManager";

interface MemberDivisionsDialogProps {
    member: { id: string; full_name: string } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function MemberDivisionsDialog({
    member,
    open,
    onOpenChange,
}: MemberDivisionsDialogProps) {
    if (!member) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Gestionar Divisiones</DialogTitle>
                    <DialogDescription>
                        Configura las categorías y divisiones de competencia para {member.full_name}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <MemberDivisionsManager
                        memberId={member.id}
                        memberName={member.full_name}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
