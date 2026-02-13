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
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  member: MemberInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMember = async (userId: string) => {
    try {
      // Get auth user session directly to be safe from state race conditions
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const userEmail = authUser?.email;

      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("id, club_id, full_name, email, status, is_super_admin")
        .eq("user_id", userId)
        .maybeSingle();

      if (memberError) {
        console.error("Error fetching member:", memberError);
      }

      if (memberData) {
        const { data: rolesData } = await supabase
          .from("member_roles")
          .select("role")
          .eq("member_id", memberData.id);

        let clubStatus = 'activo';
        let subscriptionEndDate = null;

        if (memberData.club_id) {
          const { data: clubData } = await supabase
            .from("clubs")
            .select("subscription_status, subscription_end_date")
            .eq("id", memberData.club_id)
            .maybeSingle();
          clubStatus = clubData?.subscription_status || 'activo';
          subscriptionEndDate = clubData?.subscription_end_date;
        }

        setMember({
          ...memberData,
          status: memberData.status as string,
          roles: rolesData?.map((r) => r.role) || [],
          is_super_admin: memberData.is_super_admin || userEmail === 'cl.jmunoz@gmail.com',
          club_status: clubStatus,
          subscription_end_date: subscriptionEndDate,
        });
      } else if (userEmail === 'cl.jmunoz@gmail.com') {
        // Virtual member for Super Admin if no member record exists yet
        setMember({
          id: 'super-admin-virtual',
          club_id: null as any,
          full_name: 'Super Administrador',
          email: userEmail,
          status: 'activo',
          roles: ['administrador'],
          is_super_admin: true
        });
      } else {
        setMember(null);
      }
    } catch (e) {
      console.error("Auth error:", e);
      setMember(null);
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
  };

  return (
    <AuthContext.Provider value={{ session, user, member, loading, signOut, refreshMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
