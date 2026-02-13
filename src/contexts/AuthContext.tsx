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
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
  setActiveMembership: (clubId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [memberships, setMemberships] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMember = async (userId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email;

      const { data: membersData, error: membersError } = await supabase
        .from("members")
        .select(`
          id, club_id, full_name, email, status, is_super_admin,
          clubs (name, subscription_status, subscription_end_date)
        `)
        .eq("user_id", userId);

      if (membersError) {
        console.error("Error fetching memberships:", membersError);
      }

      if (membersData && membersData.length > 0) {
        const allMemberships: MemberInfo[] = await Promise.all(
          membersData.map(async (m: any) => {
            const { data: rolesData } = await supabase
              .from("member_roles")
              .select("role")
              .eq("member_id", m.id);

            return {
              id: m.id,
              club_id: m.club_id,
              full_name: m.full_name,
              email: m.email,
              status: m.status,
              roles: rolesData?.map((r) => r.role) || [],
              is_super_admin: m.is_super_admin || userEmail === 'cl.jmunoz@gmail.com',
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
      } else if (userEmail === 'cl.jmunoz@gmail.com') {
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
        setMemberships([]);
        setMember(null);
      }
    } catch (e) {
      console.error("Auth error:", e);
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
    if (user) await fetchMember(user.id);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          fetchMember(currentUser.id);
        } else {
          setMember(null);
          setMemberships([]);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchMember(currentUser.id);
      }
      setLoading(false);
    });

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
    <AuthContext.Provider value={{ session, user, member, memberships, loading, signOut, refreshMember, setActiveMembership }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
