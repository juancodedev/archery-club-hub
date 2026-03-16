-- ============================================================
-- FIX RLS FOR MEMBER_INVITATIONS
-- ============================================================

DROP POLICY IF EXISTS "Admin manage member invitations" ON public.member_invitations;
CREATE POLICY "Admin manage member invitations" ON public.member_invitations
FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

-- Public access to individual invitations via RPC is already covered by get_invitation_by_token
-- which is SECURITY DEFINER. No SELECT policy needed for anon if they only use the RPC.

-- Reload cache
NOTIFY pgrst, 'reload schema';
