
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

-- 5. Asegurar y recrear función de registro de club
CREATE OR REPLACE FUNCTION public.register_club(
  p_club_name TEXT,
  p_city TEXT,
  p_country TEXT,
  p_contact_email TEXT,
  p_admin_name TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_member_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id != v_caller THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  INSERT INTO public.clubs (name, city, country, contact_email)
  VALUES (trim(p_club_name), trim(p_city), trim(p_country), trim(p_contact_email))
  RETURNING id INTO v_club_id;

  INSERT INTO public.members (user_id, club_id, full_name, email, status)
  VALUES (v_caller, v_club_id, trim(p_admin_name), trim(p_contact_email), 'activo')
  RETURNING id INTO v_member_id;

  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, v_club_id, 'administrador');

  RETURN v_club_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_club(text, text, text, text, text, uuid) TO authenticated, anon;

-- 6. Recargar caché de PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
