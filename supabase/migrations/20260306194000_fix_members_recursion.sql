-- ============================================================
-- FIX: Infinite Recursion in "members" policy
-- ============================================================

-- 1. Create a function with SECURITY DEFINER to check superadmin status.
-- This bypasses RLS on the table being queried from within the function,
-- preventing the infinite recursion loop.
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = p_user_id AND is_super_admin = true
  );
$$;

-- 2. Drop the recursive policy and recreate it using the function.
DROP POLICY IF EXISTS "members_super_admin_read_all" ON public.members;

CREATE POLICY "members_super_admin_read_all"
  ON public.members FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3. Update registrations policy which might also be triggering recursion indirectly
DROP POLICY IF EXISTS "registrations_manager_update" ON public.tournament_registrations;
CREATE POLICY "registrations_manager_update"
  ON public.tournament_registrations FOR UPDATE TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM public.tournaments t
      WHERE public.is_club_admin(auth.uid(), t.club_id)
         OR public.has_club_role(auth.uid(), t.club_id, 'gestor_torneos')
         OR public.is_super_admin(auth.uid())
    )
  );

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
