-- Function to create a member account by admin (email auto-confirmed, no verification needed)
CREATE OR REPLACE FUNCTION create_member_account_by_admin(
  -- Required parameters (no defaults)
  p_email text,
  p_password text,
  p_full_name text,
  p_club_id uuid,
  -- Optional parameters (with defaults)
  p_role club_role DEFAULT 'arquero',
  p_phone text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_identification text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_medical_history text DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_shirt_size text DEFAULT NULL,
  p_windbreaker_size text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_guardian_name text DEFAULT NULL,
  p_guardian_phone text DEFAULT NULL,
  p_guardian_email text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_member_id uuid;
  v_result jsonb;
BEGIN
  -- Check if caller is an admin of the club or super admin
  IF NOT EXISTS (
    SELECT 1 FROM members m
    INNER JOIN member_roles mr ON m.id = mr.member_id
    WHERE m.user_id = auth.uid()
    AND (
      (m.club_id = p_club_id AND mr.role IN ('administrador', 'presidente'))
      OR m.is_super_admin = true
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para crear miembros en este club';
  END IF;

  -- Create user in auth.users with email already confirmed
  -- We use the service role context via SECURITY DEFINER
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(), -- Email confirmed immediately
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Create member record
  INSERT INTO members (
    user_id,
    club_id,
    full_name,
    email,
    phone,
    date_of_birth,
    identification,
    address,
    medical_history,
    emergency_contact_name,
    emergency_contact_phone,
    shirt_size,
    windbreaker_size,
    display_name,
    guardian_name,
    guardian_phone,
    guardian_email,
    status,
    enrollment_date
  ) VALUES (
    v_user_id,
    p_club_id,
    p_full_name,
    p_email,
    p_phone,
    p_date_of_birth,
    p_identification,
    p_address,
    p_medical_history,
    p_emergency_contact_name,
    p_emergency_contact_phone,
    p_shirt_size,
    p_windbreaker_size,
    p_display_name,
    p_guardian_name,
    p_guardian_phone,
    p_guardian_email,
    'activo',
    CURRENT_DATE
  )
  RETURNING id INTO v_member_id;

  -- Assign role
  INSERT INTO member_roles (member_id, club_id, role)
  VALUES (v_member_id, p_club_id, p_role);

  -- Return success with user and member IDs
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'member_id', v_member_id
  );

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un usuario con este correo electrónico';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear el miembro: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_member_account_by_admin TO authenticated;

COMMENT ON FUNCTION create_member_account_by_admin IS 'Creates a new member account by an admin with email auto-confirmed (no verification email required)';
