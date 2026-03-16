-- Ensure the column exists first
ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS default_member_password TEXT;

-- Drop function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.admin_reset_user_password(uuid, text);
DROP FUNCTION IF EXISTS public.admin_reset_user_password(uuid);
DROP FUNCTION IF EXISTS public.admin_reset_user_password(uuid, text, text);
DROP FUNCTION IF EXISTS public.admin_reset_user_password(uuid, uuid, text);

-- Re-create function
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id uuid, p_club_id uuid, p_new_password text DEFAULT NULL)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_generated_password text;
  v_default_password text;
  v_is_super_admin boolean;
  v_is_club_admin boolean;
BEGIN
  -- 1. Validate that the target user belongs to the specified club
  IF NOT EXISTS (
    SELECT 1 FROM public.members WHERE user_id = p_user_id AND club_id = p_club_id
  ) THEN
    RAISE EXCEPTION 'El usuario no pertenece al club especificado';
  END IF;

  -- 2. Identify context
  v_is_super_admin := public.is_super_admin(auth.uid());
  
  -- Check if caller is admin of THAT club
  v_is_club_admin := public.is_club_admin(auth.uid(), p_club_id);

  -- 3. Authorization Check
  IF NOT (v_is_super_admin OR v_is_club_admin) THEN
    RAISE EXCEPTION 'No tienes permisos para resetear esta contraseña';
  END IF;

  -- 4. Prevent self-reset via this RPC
  IF auth.uid() = p_user_id THEN
    RAISE EXCEPTION 'No puedes resetear tu propia contraseña desde este menú';
  END IF;

  -- 5. Determine Password
  IF p_new_password IS NOT NULL AND p_new_password <> '' THEN
    v_generated_password := p_new_password;
  ELSE
    SELECT default_member_password INTO v_default_password FROM public.clubs WHERE id = p_club_id;

    IF v_default_password IS NOT NULL AND v_default_password <> '' THEN
      v_generated_password := v_default_password;
    ELSE
      -- Use a cryptographically secure random generation fallback if no default is set
      v_generated_password := 'Arq!' || encode(extensions.gen_random_bytes(12), 'hex');
    END IF;
  END IF;

  -- 6. Update the password in the auth table
  UPDATE auth.users
  SET encrypted_password = crypt(v_generated_password, gen_salt('bf'))
  WHERE id = p_user_id;

  RETURN v_generated_password;
END;
$function$;
