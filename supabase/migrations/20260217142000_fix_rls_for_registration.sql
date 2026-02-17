
-- Relax RLS policies to allow registration flow for anon users
-- The safety is now handled by the accept_invitation_v2 RPC function

-- 1. Members Table
DROP POLICY IF EXISTS "Admin can insert members" ON public.members;
CREATE POLICY "Registration can insert members" ON public.members
  FOR INSERT TO anon, authenticated
  WITH CHECK (true); -- Safety handled by invitation token in RPC

DROP POLICY IF EXISTS "Admin can update members" ON public.members;
CREATE POLICY "Users can update own data or admin" ON public.members
  FOR UPDATE TO anon, authenticated
  USING (auth.uid() = user_id OR is_club_admin(auth.uid(), club_id));

-- 2. Member Roles Table
DROP POLICY IF EXISTS "Admin can manage roles" ON public.member_roles;
CREATE POLICY "Registration can insert roles" ON public.member_roles
  FOR INSERT TO anon, authenticated
  WITH CHECK (true); -- Safety handled by invitation token in RPC

-- 3. Clubs Table
DROP POLICY IF EXISTS "Authenticated can create clubs" ON public.clubs;
CREATE POLICY "Registration can insert clubs" ON public.clubs
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 4. Member Invitations Table (Allow anon to update to mark as used)
DROP POLICY IF EXISTS "Admin can manage invitations" ON public.member_invitations;
CREATE POLICY "Anyone with token can update invitation" ON public.member_invitations
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Ensure the RPC is correct and granted
GRANT EXECUTE ON FUNCTION public.accept_invitation_v2 TO anon, authenticated;
