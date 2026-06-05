import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { AuthContext, AuthContextType, MemberInfo } from "./AuthContextCore";
import { logger } from "@/lib/logger";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isSuperAdminSubdomain] = useState(() => {
        const hostname = window.location.hostname;
        return hostname.startsWith("superadmin.");
    });
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [member, setMember] = useState<MemberInfo | null>(null);
    const [memberships, setMemberships] = useState<MemberInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [systemMode, setSystemMode] = useState<'produccion' | 'pruebas'>('pruebas');

    const fetchMember = async (userId: string, userEmail?: string) => {
        try {
            logger.log("Cargando membresías para userId: " + userId);

            const { data: membersData, error: membersError } = await supabase
                .from("members")
                .select(`
          id, user_id, club_id, full_name, email, status, is_super_admin, avatar_url,
          clubs (name, subscription_status, subscription_end_date, block_type),
          member_roles (role)
        `)
                .eq("user_id", userId);

            if (membersError) {
                logger.error("Error al obtener membresías:", membersError);
            }

            logger.log("Datos de membresía recibidos: " + JSON.stringify(membersData));

            if (membersData && membersData.length > 0) {
                const allMemberships: MemberInfo[] = membersData.map((m) => ({
                    id: m.id,
                    user_id: m.user_id,
                    club_id: m.club_id,
                    full_name: m.full_name,
                    email: m.email,
                    status: m.status,
                    roles: (m.member_roles as { role: string }[])?.map((r) => r.role) || [],
                    is_super_admin: m.is_super_admin ?? false,
                    club_status: (m.clubs as { subscription_status?: string })?.subscription_status || 'activo',
                    subscription_end_date: (m.clubs as { subscription_end_date?: string })?.subscription_end_date,
                    block_type: (m.clubs as { block_type?: string })?.block_type as 'total' | 'partial' | null,
                    club_name: (m.clubs as { name?: string })?.name,
                    avatar_url: m.avatar_url
                }));

                setMemberships(allMemberships);

                // Try to restore previous active club
                const savedClubId = localStorage.getItem("activeClubId");
                const restored = savedClubId ? allMemberships.find(m => m.club_id === savedClubId) : null;

                if (restored) {
                    setMember(restored);
                } else if (allMemberships.length > 0) {
                    setMember(allMemberships[0]);
                    if (allMemberships[0].club_id) localStorage.setItem("activeClubId", allMemberships[0].club_id);
                }
                logger.log("Miembro activo establecido: " + JSON.stringify(restored || allMemberships[0]));
            } else {
                logger.log("No se encontraron membresías para este usuario.");
                setMemberships([]);
                setMember(null);
            }
            logger.log("fetchMember finalizado.");
        } catch (e) {
            logger.error("Error crítico en AuthContext:", e);
            setMemberships([]);
            setMember(null);
        }
    };

    const setActiveMembership = (clubId: string) => {
        const found = memberships.find(m => m.club_id === clubId);
        if (found) {
            setMember(found);
            localStorage.setItem("activeClubId", clubId);
        }
    };

    const refreshMember = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchMember(user.id);
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                logger.log("🔔 [AuthContext] Auth session changed: " + event);
                setSession(session);
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    fetchMember(currentUser.id, currentUser.email);
                } else {
                    setMember(null);
                    setMemberships([]);
                    setLoading(false);
                }
            }
        );

        const initSession = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                setSession(initialSession);
                const currentUser = initialSession?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    await fetchMember(currentUser.id, currentUser.email);
                }

                // Fetch system mode
                const { data: settings } = await supabase.from("system_settings").select("mercadopago_mode").maybeSingle();
                if (settings) {
                    setSystemMode(settings.mercadopago_mode === 'real' ? 'produccion' : 'pruebas');
                }

                setLoading(false);
            } catch (err) {
                logger.error("Error initializing session:", err);
                setLoading(false);
            }
        };

        initSession();

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setMember(null);
        setMemberships([]);
    };

    const contextValue: AuthContextType = {
        session,
        user,
        member,
        memberships,
        loading,
        isSuperAdminSubdomain,
        systemMode,
        signOut,
        refreshMember,
        setActiveMembership
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}
