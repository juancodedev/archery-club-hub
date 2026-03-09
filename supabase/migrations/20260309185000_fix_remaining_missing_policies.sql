-- ============================================================
-- FIX REMAINING MISSING RLS POLICIES
-- ============================================================

-- 1. Custom Roles
DROP POLICY IF EXISTS "Admin manage custom roles" ON public.custom_roles;
CREATE POLICY "Admin manage custom roles" ON public.custom_roles
FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Public read custom roles" ON public.custom_roles;
CREATE POLICY "Public read custom roles" ON public.custom_roles
FOR SELECT TO authenticated
USING (
  club_id IN (SELECT public.get_user_clubs(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

-- 2. Coupons
DROP POLICY IF EXISTS "Super admin manage coupons" ON public.coupons;
CREATE POLICY "Super admin manage coupons" ON public.coupons
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read active coupons" ON public.coupons;
CREATE POLICY "Public read active coupons" ON public.coupons
FOR SELECT TO authenticated
USING (true); -- Usually coupons are checked by code anyway

-- Reload cache
NOTIFY pgrst, 'reload schema';
