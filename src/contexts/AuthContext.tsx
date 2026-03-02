import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { AuthContext, AuthContextType, MemberInfo } from "./AuthContextCore";

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

  const fetchMember = async (userId: string, userEmail?: string) => {
    try {
      console.log("Cargando membresías para userId:", userId);

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`
          id, user_id, club_id, full_name, email, status, is_super_admin,
          clubs (name, subscription_status, subscription_end_date)
        `)
        .eq("user_id", userId);

      if (membersError) {
        console.error("Error al obtener membresías:", membersError);
      }

      console.log("Datos de membresía recibidos:", membersData);

      if (membersData && membersData.length > 0) {
        const allMemberships: MemberInfo[] = await Promise.all(
          membersData.map(async (m: {
            id: string;
            user_id: string;
            club_id: string;
            full_name: string;
            email: string;
            status: string;
            is_super_admin: boolean;
            clubs?: { subscription_status?: string; subscription_end_date?: string | null; name?: string } | null;
          }) => {
            const { data: rolesData } = await supabase
              .from("member_roles")
              .select("role")
              .eq("member_id", m.id);

            return {
              id: m.id,
              user_id: m.user_id,
              club_id: m.club_id,
              full_name: m.full_name,
              email: m.email,
              status: m.status,
              roles: rolesData?.map((r) => r.role) || [],
              is_super_admin: m.is_super_admin ?? false,
              club_status: m.clubs?.subscription_status || 'activo',
              subscription_end_date: m.clubs?.subscription_end_date,
              club_name: m.clubs?.name
            };
          })
        );

        setMemberships(allMemberships);

        // Try to restore previous active club
        const savedClubId = localStorage.getItem("activeClubId");
        const restored = savedClubId ? allMemberships.find(m => m.club_id === savedClubId) : null;

        if (restored) {
          setMember(restored);
        } else if (allMemberships.length > 0) {
          setMember(allMemberships[0]);
          localStorage.setItem("activeClubId", allMemberships[0].club_id);
        }
        console.log("Miembro activo establecido:", restored || allMemberships[0]);
      } else {
        console.warn("No se encontraron membresías para este usuario.");
        setMemberships([]);
        setMember(null);
      }
      console.log("fetchMember finalizado.");
    } catch (e) {
      console.error("Error crítico en AuthContext:", e);
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
        console.log("🔔 [AuthContext] Auth session changed:", event);
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

        setLoading(false); // Liberamos la UI de inmediato

        if (currentUser) {
          fetchMember(currentUser.id, currentUser.email);
        }
      } catch (err) {
        console.error("Error initializing session:", err);
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
