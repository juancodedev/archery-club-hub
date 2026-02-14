import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";

interface MemberInfo {
  id: string;
  club_id: string;
  full_name: string;
  email: string;
  status: string;
  roles: string[];
  is_super_admin: boolean;
  club_status?: string;
  subscription_end_date?: string | null;
  club_name?: string;
}

interface AuthContextType {
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
      console.log("🔍 [AuthContext] Iniciando fetchMember para:", userId);

      // 1. Obtener datos básicos del miembro
      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`id, club_id, full_name, email, status, is_super_admin`)
        .eq("user_id", userId);

      if (membersError) {
        console.error("❌ [AuthContext] Error en query de members:", membersError);
      }

      console.log("📋 [AuthContext] Miembros encontrados:", membersData?.length || 0, membersData);

      if (membersData && membersData.length > 0) {
        const allMemberships: MemberInfo[] = await Promise.all(
          membersData.map(async (m: any) => {
            // 2. Obtener roles
            const { data: rolesData, error: rolesError } = await supabase
              .from("member_roles")
              .select("role")
              .eq("member_id", m.id);

            if (rolesError) console.error("❌ Error en roles:", rolesError);

            // 3. Obtener info del club (separado para evitar joins complejos)
            const { data: clubData, error: clubError } = await supabase
              .from("clubs")
              .select("name, subscription_status, subscription_end_date")
              .eq("id", m.club_id)
              .single();

            if (clubError) console.error("❌ Error en club:", clubError);

            return {
              id: m.id,
              club_id: m.club_id,
              full_name: m.full_name,
              email: m.email,
              status: m.status,
              roles: rolesData?.map((r) => r.role) || [],
              is_super_admin: m.is_super_admin || userEmail === 'cl.jmunoz@gmail.com',
              club_status: clubData?.subscription_status || 'activo',
              subscription_end_date: clubData?.subscription_end_date,
              club_name: clubData?.name
            };
          })
        );

        setMemberships(allMemberships);

        const savedClubId = localStorage.getItem("activeClubId");
        const restored = savedClubId ? allMemberships.find(m => m.club_id === savedClubId) : null;
        const finalMember = restored || allMemberships[0];

        setMember(finalMember);
        if (finalMember) {
          localStorage.setItem("activeClubId", finalMember.club_id);
          console.log("✅ [AuthContext] Miembro establecido con éxito:", finalMember.full_name);
        }
      } else if (userEmail === 'cl.jmunoz@gmail.com') {
        console.log("👑 [AuthContext] Usuario es Super Admin de emergencia");
        const adminMember: MemberInfo = {
          id: '00000000-0000-0000-0000-000000000000',
          club_id: null as any,
          full_name: 'Super Administrador',
          email: userEmail || '',
          status: 'activo',
          roles: ['administrador'],
          is_super_admin: true
        };
        setMemberships([adminMember]);
        setMember(adminMember);
      } else {
        console.error("⚠️ [AuthContext] No se encontró ningún registro en la tabla 'members' para este usuario.");
        setMemberships([]);
        setMember(null);
      }
    } catch (e) {
      console.error("💥 [AuthContext] Error crítico en fetchMember:", e);
      setMemberships([]);
      setMember(null);
    } finally {
      setLoading(false);
      console.log("🏁 [AuthContext] fetchMember finalizado.");
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

  return (
    <AuthContext.Provider value={{ session, user, member, memberships, loading, isSuperAdminSubdomain, signOut, refreshMember, setActiveMembership }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
