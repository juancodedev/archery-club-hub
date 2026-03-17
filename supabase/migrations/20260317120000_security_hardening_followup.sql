-- Security hardening follow-up

-- 1) Remove legacy default password storage from clubs.
ALTER TABLE public.clubs
  DROP COLUMN IF EXISTS default_member_password;

-- 2) Re-harden register_club: require authenticated caller and deny anon execution.
CREATE OR REPLACE FUNCTION public.register_club(
  p_club_name TEXT,
  p_city TEXT,
  p_country TEXT,
  p_contact_email TEXT,
  p_admin_name TEXT,
  p_user_id UUID,
  p_plan_id UUID DEFAULT NULL,
  p_monthly_price DECIMAL DEFAULT 29.99
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_club_id UUID;
  v_member_id UUID;
  v_caller UUID := auth.uid();
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_id IS NULL OR p_user_id <> v_caller THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  IF length(trim(COALESCE(p_club_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nombre de club invalido';
  END IF;

  IF length(trim(COALESCE(p_admin_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nombre de administrador invalido';
  END IF;

  IF trim(COALESCE(p_contact_email, '')) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Correo de contacto invalido';
  END IF;

  INSERT INTO public.clubs (name, city, country, contact_email, plan_id, monthly_price)
  VALUES (
    trim(p_club_name),
    NULLIF(trim(COALESCE(p_city, '')), ''),
    NULLIF(trim(COALESCE(p_country, '')), ''),
    trim(p_contact_email),
    p_plan_id,
    p_monthly_price
  )
  RETURNING id INTO v_club_id;

  INSERT INTO public.members (user_id, club_id, full_name, email, status)
  VALUES (v_caller, v_club_id, trim(p_admin_name), trim(p_contact_email), 'activo')
  RETURNING id INTO v_member_id;

  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, v_club_id, 'administrador');

  RETURN v_club_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_club(text, text, text, text, text, uuid, uuid, decimal) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_club(text, text, text, text, text, uuid, uuid, decimal) TO authenticated;

-- 3) Restrict direct clubs table visibility; keep anonymous access via public_clubs_view only.
DROP POLICY IF EXISTS "Anyone can read clubs" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can read clubs" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated can read clubs" ON public.clubs;
DROP POLICY IF EXISTS "Public clubs read" ON public.clubs;

CREATE POLICY "Members and superadmins can read clubs" ON public.clubs
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.members m
    WHERE m.user_id = auth.uid()
      AND m.club_id = clubs.id
  )
);

REVOKE SELECT ON public.clubs FROM anon;
GRANT SELECT ON public.public_clubs_view TO anon, authenticated;

-- 4) Reset-password RPC should not return plaintext passwords.
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id uuid,
  p_club_id uuid,
  p_new_password text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_generated_password text;
  v_is_super_admin boolean;
  v_is_club_admin boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.members WHERE user_id = p_user_id AND club_id = p_club_id
  ) THEN
    RAISE EXCEPTION 'El usuario no pertenece al club especificado';
  END IF;

  v_is_super_admin := public.is_super_admin(auth.uid());
  v_is_club_admin := public.is_club_admin(auth.uid(), p_club_id);

  IF NOT (v_is_super_admin OR v_is_club_admin) THEN
    RAISE EXCEPTION 'No tienes permisos para resetear esta contraseña';
  END IF;

  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'No puedes resetear tu propia contraseña desde este menu';
  END IF;

  IF p_new_password IS NOT NULL AND length(trim(p_new_password)) >= 12 THEN
    v_generated_password := trim(p_new_password);
  ELSE
    v_generated_password := 'Arq!' || encode(extensions.gen_random_bytes(12), 'hex');
  END IF;

  UPDATE auth.users
  SET encrypted_password = crypt(v_generated_password, gen_salt('bf')),
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario con id % no encontrado en auth.users', p_user_id;
  END IF;

  RETURN 'ok';
END;
$function$;

NOTIFY pgrst, 'reload schema';
