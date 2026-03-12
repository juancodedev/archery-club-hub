-- Update admin_reset_user_password to allow Club Admins and use default password
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id uuid, p_new_password text DEFAULT NULL)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_generated_password text;
  v_club_id uuid;
  v_default_password text;
  v_is_super_admin boolean;
  v_is_club_admin boolean;
BEGIN
  -- 1. Identify context
  v_is_super_admin := public.is_super_admin(auth.uid());
  
  -- Get the target user's club_id
  SELECT club_id INTO v_club_id FROM public.members WHERE user_id = p_user_id;
  
  -- Check if caller is admin of THAT club
  v_is_club_admin := public.is_club_admin(auth.uid(), v_club_id);

  -- 2. Authorization Check
  IF NOT (v_is_super_admin OR v_is_club_admin) THEN
    RAISE EXCEPTION 'No tienes permisos para resetear esta contraseña';
  END IF;

  -- 3. Prevent self-reset via this RPC (admins should use profile settings or forgot password)
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'No puedes resetear tu propia contraseña desde este menú';
  END IF;

  -- 4. Determine Password
  -- Check if there is a default password for the club
  SELECT default_member_password INTO v_default_password FROM public.clubs WHERE id = v_club_id;

  IF v_default_password IS NOT NULL AND v_default_password <> '' THEN
    v_generated_password := v_default_password;
  ELSE
    -- Fallback to random generation if no default is set
    v_generated_password := 'Arq!' || encode(extensions.gen_random_bytes(12), 'hex');
  END IF;

  -- 5. Update the password in the auth table
  UPDATE auth.users
  SET encrypted_password = crypt(v_generated_password, gen_salt('bf'))
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$function$;
