-- ============================================================
-- FIX PLATFORM ERRORS
-- 1. Add missing attended column
-- 2. Fix RLS recursion using SECURITY DEFINER functions
-- ============================================================

-- 1. Add attended column to training_enrollments
ALTER TABLE public.training_enrollments ADD COLUMN IF NOT EXISTS attended BOOLEAN DEFAULT false;

-- 2. Refactor helper functions to be more robust and avoid recursion
-- These are SECURITY DEFINER so they bypass RLS on the tables they query.

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = p_user_id AND is_super_admin = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_member_id_by_user(p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.members WHERE user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    public.is_super_admin(p_user_id) 
    OR EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id
        AND mr.role IN ('administrador'::public.club_role, 'presidente'::public.club_role)
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(p_user_id UUID, p_club_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (
    public.is_super_admin(p_user_id) 
    OR EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id
        AND mr.role = p_role::public.club_role
    )
  );
$$;

-- 3. Update Policies to use specialized functions

-- Update members
DROP POLICY IF EXISTS "Admin reads club members" ON public.members;
CREATE POLICY "Admin reads club members" ON public.members FOR SELECT TO authenticated 
USING (public.is_club_admin(auth.uid(), club_id));

DROP POLICY IF EXISTS "Super admin read all" ON public.members;
CREATE POLICY "Super admin read all" ON public.members FOR SELECT TO authenticated 
USING (public.is_super_admin(auth.uid()));

-- Update member_roles (Fix recursion: Read own roles)
DROP POLICY IF EXISTS "Read own roles" ON public.member_roles;
CREATE POLICY "Read own roles" ON public.member_roles FOR SELECT TO authenticated 
USING (member_id = public.get_member_id_by_user(auth.uid()));

-- Update tournaments visibility (Fix recursion)
DROP POLICY IF EXISTS "Tournament visibility" ON public.tournaments;
CREATE POLICY "Tournament visibility" ON public.tournaments FOR SELECT TO authenticated 
USING (
  club_id IN (SELECT club_id FROM public.members WHERE user_id = auth.uid()) 
  OR public.is_super_admin(auth.uid())
);
-- Wait, the subquery above (SELECT club_id FROM members) is still an RLS-checked query if not superuser.
-- Let's make a security definer function for club visibility.

CREATE OR REPLACE FUNCTION public.get_user_clubs(p_user_id UUID)
RETURNS TABLE (club_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.club_id FROM public.members m WHERE m.user_id = p_user_id;
$$;

DROP POLICY IF EXISTS "Tournament visibility" ON public.tournaments;
CREATE POLICY "Tournament visibility" ON public.tournaments FOR SELECT TO authenticated 
USING (
  club_id IN (SELECT public.get_user_clubs(auth.uid())) 
  OR public.is_super_admin(auth.uid())
);

-- Update registrations visibility
DROP POLICY IF EXISTS "Registration visibility" ON public.tournament_registrations;
CREATE POLICY "Registration visibility" ON public.tournament_registrations FOR SELECT TO authenticated
USING (
  tournament_id IN (
    SELECT id FROM public.tournaments 
    WHERE club_id IN (SELECT public.get_user_clubs(auth.uid()))
  ) 
  OR public.is_super_admin(auth.uid())
);

-- Update RLS for training_enrollments update (to allow marking attendance)
CREATE POLICY "Members can update own enrollment" ON public.training_enrollments
FOR UPDATE TO authenticated
USING (member_id = public.get_member_id_by_user(auth.uid()));

-- Grants (ensure functions are executable)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Reload cache
NOTIFY pgrst, 'reload schema';
