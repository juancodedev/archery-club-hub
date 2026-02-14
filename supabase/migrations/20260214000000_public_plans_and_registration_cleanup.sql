
-- Allow unauthenticated users to read plans (needed for club registration)
DROP POLICY IF EXISTS "Anyone can read plans" ON public.plans;
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT TO anon, authenticated USING (true);

-- Allow unauthenticated users to read club info (needed for invitation page)
DROP POLICY IF EXISTS "Anyone can read clubs" ON public.clubs;
CREATE POLICY "Anyone can read clubs" ON public.clubs FOR SELECT TO anon, authenticated USING (true);

-- Security Definer function to look up invitation by token safely
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  club_id uuid,
  email text,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT mi.id, mi.club_id, mi.email, mi.expires_at, mi.used_at, mi.created_at
  FROM public.member_invitations mi
  WHERE mi.token = p_token
  LIMIT 1;
$$;

-- Ensure anyone can call get_invitation_by_token
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
