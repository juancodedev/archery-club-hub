
-- Allow unauthenticated users to read plans (needed for club registration)
DROP POLICY IF EXISTS "Anyone can read plans" ON public.plans;
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT USING (true);

-- Allow unauthenticated users to read club info (needed for invitation page)
DROP POLICY IF EXISTS "Anyone can read clubs" ON public.clubs;
CREATE POLICY "Anyone can read clubs" ON public.clubs FOR SELECT USING (true);

-- Ensure anyone can call get_invitation_by_token
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;
