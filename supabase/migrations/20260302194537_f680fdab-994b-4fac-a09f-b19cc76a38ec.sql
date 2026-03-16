
-- Update create_member_account_by_admin to stop returning password_used in response
CREATE OR REPLACE FUNCTION public.create_member_account_by_admin(
  p_full_name text, p_club_id uuid, p_email text DEFAULT NULL, p_password text DEFAULT NULL,
  p_role club_role DEFAULT 'arquero', p_phone text DEFAULT NULL, p_date_of_birth date DEFAULT NULL,
  p_identification text DEFAULT NULL, p_address text DEFAULT NULL, p_medical_history text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL, p_emergency_contact_phone text DEFAULT NULL,
  p_shirt_size text DEFAULT NULL, p_windbreaker_size text DEFAULT NULL, p_display_name text DEFAULT NULL,
  p_guardian_name text DEFAULT NULL, p_guardian_phone text DEFAULT NULL, p_guardian_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'extensions'
AS $$
DECLARE
  v_user_id uuid;
  v_member_id uuid;
  v_result jsonb;
  v_auth_email text;
  v_effective_email text;
  v_effective_password text;
  v_is_super boolean;
  v_instance_id uuid;
BEGIN
  SELECT public.is_super_admin(auth.uid()) INTO v_is_super;

  IF NOT (COALESCE(v_is_super, false) OR EXISTS (
    SELECT 1 FROM public.members m
    INNER JOIN public.member_roles mr ON m.id = mr.member_id
    WHERE m.user_id = auth.uid()
      AND m.club_id = p_club_id
      AND mr.role::text IN ('administrador', 'presidente')
  )) THEN
    RAISE EXCEPTION 'No tienes permisos para crear miembros en este club';
  END IF;

  v_effective_email := CASE WHEN p_email IS NOT NULL AND trim(p_email) != '' THEN trim(p_email) ELSE NULL END;
  v_auth_email := COALESCE(v_effective_email, 'miembro-' || replace(gen_random_uuid()::text, '-', '') || '@sin-email.clubarchery.local');

  -- Always generate a secure random password; ignore any provided default
  v_effective_password := 'Arq!' || encode(extensions.gen_random_bytes(12), 'hex');

  SELECT instance_id INTO v_instance_id FROM auth.users LIMIT 1;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, recovery_sent_at, last_sign_in_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    v_instance_id, gen_random_uuid(),
    'authenticated', 'authenticated', v_auth_email,
    crypt(v_effective_password, gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name), now(), now(), '', '', '', ''
  ) RETURNING id INTO v_user_id;

  INSERT INTO public.members (
    user_id, club_id, full_name, email, phone, date_of_birth, identification,
    address, medical_history, emergency_contact_name, emergency_contact_phone,
    shirt_size, windbreaker_size, display_name, guardian_name, guardian_phone,
    guardian_email, status, enrollment_date
  ) VALUES (
    v_user_id, p_club_id, trim(p_full_name), v_effective_email,
    NULLIF(trim(p_phone), ''), p_date_of_birth, NULLIF(trim(p_identification), ''),
    NULLIF(trim(p_address), ''), NULLIF(trim(p_medical_history), ''),
    NULLIF(trim(p_emergency_contact_name), ''), NULLIF(trim(p_emergency_contact_phone), ''),
    p_shirt_size, p_windbreaker_size, NULLIF(trim(p_display_name), ''),
    NULLIF(trim(p_guardian_name), ''), NULLIF(trim(p_guardian_phone), ''),
    NULLIF(trim(p_guardian_email), ''), 'activo', CURRENT_DATE
  ) RETURNING id INTO v_member_id;

  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, p_club_id, p_role);

  -- Do NOT return password in response
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'member_id', v_member_id
  );

  RETURN v_result;

EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un usuario registrado con el correo electrónico: %', v_auth_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear el miembro: %', SQLERRM;
END;
$$;
