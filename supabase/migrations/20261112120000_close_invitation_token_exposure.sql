-- 20260603000000 recreated the "Anyone can view invitation by token" policy with
-- USING (true) for anon and authenticated. Any API caller could list every
-- invitation with its token and email, then use a token to join any club.
-- Neither the join page nor the edge function needs this policy:
-- - The join page reads a single invitation through get_invitation_by_token
--   (SECURITY DEFINER).
-- - The accept-invitation edge function uses the service role.
-- Club admins still read and create invitations through
-- "Admin manage member invitations".
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.member_invitations;

-- The app accepts invitations through the accept-invitation edge function, so
-- accept_invitation_v2 is unused. It is SECURITY DEFINER, writes to auth.users,
-- and falls back to a four-digit password, so it should not be reachable through
-- the API. Revoke every overload, and revoke PUBLIC as well: anon and
-- authenticated inherit the default PUBLIC execute grant.
DO $$
DECLARE
  f regprocedure;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'accept_invitation_v2'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', f);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
