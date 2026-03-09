-- ============================================================
-- FIX RLS FOR MEMBER_DIVISIONS
-- ============================================================

DROP POLICY IF EXISTS "Admin manage member divisions" ON public.member_divisions;
CREATE POLICY "Admin manage member divisions" ON public.member_divisions 
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.members m 
    WHERE m.id = member_id 
    AND public.is_club_admin(auth.uid(), m.club_id)
  )
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.members m 
    WHERE m.id = member_id 
    AND public.is_club_admin(auth.uid(), m.club_id)
  )
  OR public.is_super_admin(auth.uid())
);

-- Reload cache
NOTIFY pgrst, 'reload schema';
