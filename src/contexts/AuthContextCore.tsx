import { createContext, useContext } from "react";
import { Session, User } from "@supabase/supabase-js";

export interface MemberInfo {
    id: string;
    user_id: string;
    club_id: string | null;
    full_name: string;
    email: string;
    status: string;
    roles: string[];
    is_super_admin: boolean;
    club_status?: string;
    subscription_end_date?: string | null;
    club_name?: string;
}

export interface AuthContextType {
    session: Session | null;
    user: User | null;
    member: MemberInfo | null;
    memberships: MemberInfo[];
    loading: boolean;
    isSuperAdminSubdomain: boolean;
    signOut: () => Promise<void>;
    refreshMember: () => Promise<void>;
    setActiveMembership: (clubId: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
