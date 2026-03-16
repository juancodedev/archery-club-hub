
-- Update admin_reset_user_password to generate password server-side
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id uuid, p_new_password text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
  v_generated_password text;
BEGIN
  -- Verify caller is Super Admin
  IF NOT (SELECT public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Solo el Super Admin puede resetear contraseñas';
  END IF;

  -- Always generate a secure random password server-side; ignore p_new_password
  v_generated_password := 'Arq!' || encode(extensions.gen_random_bytes(12), 'hex');

  -- Update the password in the auth table
  UPDATE auth.users
  SET encrypted_password = crypt(v_generated_password, gen_salt('bf'))
  WHERE id = p_user_id;

  RETURN FOUND;
END;
$function$;
