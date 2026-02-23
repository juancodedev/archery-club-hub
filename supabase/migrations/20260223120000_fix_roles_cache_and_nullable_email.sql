-- Migration: 20260223120000_fix_roles_cache_and_nullable_email.sql
-- Fixes:
-- 1. Force PostgREST schema cache reload (eliminates "roles column not found" error)
-- 2. Drop phantom 'roles' column on members if it accidentally exists
-- 3. Make members.email nullable (allows minor archers to be registered without an email)
-- 4. Update validate_member_data trigger to allow null email
-- 5. Update create_member_account_by_admin to support members without their own email

-- ============================================================
-- 1. Force schema cache refresh
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- 2. Drop phantom 'roles' column if it exists (idempotent)
-- ============================================================
ALTER TABLE public.members DROP COLUMN IF EXISTS roles;

-- ============================================================
-- 3. Make members.email nullable
-- ============================================================
ALTER TABLE public.members ALTER COLUMN email DROP NOT NULL;

-- ============================================================
-- 4. Update validate_member_data trigger: allow NULL email
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_member_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(trim(NEW.full_name)) < 2 OR length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'El nombre completo debe tener entre 2 y 200 caracteres';
  END IF;

  -- Email is now optional (e.g. for minor archers registered by guardian)
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;

  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 50 THEN
    RAISE EXCEPTION 'Número de teléfono demasiado largo';
  END IF;
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Dirección demasiado larga';
  END IF;
  IF NEW.identification IS NOT NULL AND length(NEW.identification) > 50 THEN
    RAISE EXCEPTION 'Identificación demasiado larga';
  END IF;
  IF NEW.medical_history IS NOT NULL AND length(NEW.medical_history) > 2000 THEN
    RAISE EXCEPTION 'Historia médica demasiado larga';
  END IF;
  IF NEW.guardian_name IS NOT NULL AND length(NEW.guardian_name) > 200 THEN
    RAISE EXCEPTION 'Nombre del tutor demasiado largo';
  END IF;
  IF NEW.guardian_phone IS NOT NULL AND length(NEW.guardian_phone) > 50 THEN
    RAISE EXCEPTION 'Teléfono del tutor demasiado largo';
  END IF;
  IF NEW.guardian_email IS NOT NULL AND NEW.guardian_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Formato de email del tutor inválido';
  END IF;
  IF NEW.emergency_contact_name IS NOT NULL AND length(NEW.emergency_contact_name) > 200 THEN
    RAISE EXCEPTION 'Nombre de contacto de emergencia demasiado largo';
  END IF;
  IF NEW.emergency_contact_phone IS NOT NULL AND length(NEW.emergency_contact_phone) > 50 THEN
    RAISE EXCEPTION 'Teléfono de contacto de emergencia demasiado largo';
  END IF;
  IF NEW.display_name IS NOT NULL AND length(NEW.display_name) > 100 THEN
    RAISE EXCEPTION 'Nombre de pila demasiado largo';
  END IF;

  NEW.full_name := trim(NEW.full_name);
  IF NEW.email IS NOT NULL THEN
    NEW.email := trim(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 5. Update accept_invitation_v2: make p_email optional
--    IMPORTANT: Signature changed, so we must drop all old versions first.
-- ============================================================
DO $$
BEGIN
    EXECUTE (
        SELECT 'DROP FUNCTION ' || string_agg(oid::regprocedure::text, ', ')
        FROM pg_proc
        WHERE proname = 'accept_invitation_v2'
          AND pronamespace = 'public'::regnamespace
    );
EXCEPTION WHEN OTHERS THEN
    NULL; -- No versions to drop
END $$;

CREATE OR REPLACE FUNCTION public.accept_invitation_v2(
  p_token TEXT,
  p_full_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_password TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_identification TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_medical_history TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_shirt_size TEXT DEFAULT NULL,
  p_windbreaker_size TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_guardian_name TEXT DEFAULT NULL,
  p_guardian_phone TEXT DEFAULT NULL,
  p_guardian_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invitation record;
  v_member_id UUID;
  v_effective_user_id UUID := p_user_id;
  v_effective_email TEXT;
  v_auth_email TEXT;
  v_auth_password TEXT;
BEGIN
  -- 1. Validate invitation
  SELECT * INTO v_invitation FROM public.member_invitations
  WHERE token = p_token AND used_at IS NULL AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación inválida o expirada';
  END IF;

  -- 2. Resolve effective email for members table
  v_effective_email := CASE
    WHEN p_email IS NOT NULL AND trim(p_email) != '' THEN trim(p_email)
    ELSE NULL
  END;

  -- 3. If no user_id provided (e.g. minor without email), create a placeholder auth account
  IF v_effective_user_id IS NULL THEN
    v_auth_email := COALESCE(
      v_effective_email,
      'miembro-' || replace(gen_random_uuid()::text, '-', '') || '@sin-email.clubarchery.local'
    );
    
    v_auth_password := COALESCE(
      NULLIF(trim(p_password), ''),
      'Invitado' || floor(random() * 9000 + 1000)::text
    );

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, recovery_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
      'authenticated', 'authenticated', v_auth_email,
      crypt(v_auth_password, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name),
      now(), now(), '', '', '', ''
    )
    RETURNING id INTO v_effective_user_id;
  END IF;

  -- 4. Insert member
  INSERT INTO public.members (
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
    status
  )
  VALUES (
    v_effective_user_id,
    v_invitation.club_id,
    trim(p_full_name),
    v_effective_email,
    NULLIF(trim(p_phone), ''),
    p_date_of_birth,
    NULLIF(trim(p_identification), ''),
    NULLIF(trim(p_address), ''),
    NULLIF(trim(p_medical_history), ''),
    NULLIF(trim(p_emergency_contact_name), ''),
    NULLIF(trim(p_emergency_contact_phone), ''),
    p_shirt_size,
    p_windbreaker_size,
    NULLIF(trim(p_display_name), ''),
    NULLIF(trim(p_guardian_name), ''),
    NULLIF(trim(p_guardian_phone), ''),
    NULLIF(trim(p_guardian_email), ''),
    'activo'
  )
  RETURNING id INTO v_member_id;

  -- 5. Assign default role
  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, v_invitation.club_id, 'arquero');

  -- 6. Mark invitation as used
  UPDATE public.member_invitations SET used_at = now() WHERE id = v_invitation.id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'user_id', v_effective_user_id,
    'is_placeholder', (p_user_id IS NULL)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation_v2 TO anon, authenticated;

-- ============================================================
-- 6. Update create_member_account_by_admin: email is now optional.
--    IMPORTANT: Signature changed, so we must drop all old versions first.
-- ============================================================
DO $$
BEGIN
    EXECUTE (
        SELECT 'DROP FUNCTION ' || string_agg(oid::regprocedure::text, ', ')
        FROM pg_proc
        WHERE proname = 'create_member_account_by_admin'
          AND pronamespace = 'public'::regnamespace
    );
EXCEPTION WHEN OTHERS THEN
    NULL; -- No versions to drop
END $$;

CREATE OR REPLACE FUNCTION public.create_member_account_by_admin(
  p_full_name text,
  p_club_id uuid,
  p_email text DEFAULT NULL,
  p_password text DEFAULT NULL,
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
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid;
  v_member_id uuid;
  v_result jsonb;
  v_auth_email text;
  v_effective_email text;
  v_effective_password text;
BEGIN
  -- Check caller is admin of the club or super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.members m
    INNER JOIN public.member_roles mr ON m.id = mr.member_id
    WHERE m.user_id = auth.uid()
    AND (
      (m.club_id = p_club_id AND mr.role::text IN ('administrador', 'presidente'))
      OR m.is_super_admin = true
    )
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para crear miembros en este club';
  END IF;

  -- Resolve effective email for members table (null if not a real email)
  v_effective_email := CASE
    WHEN p_email IS NOT NULL AND trim(p_email) != '' THEN trim(p_email)
    ELSE NULL
  END;

  -- For auth.users we MUST have an email; use real one or generate placeholder
  v_auth_email := COALESCE(
    v_effective_email,
    'miembro-' || replace(gen_random_uuid()::text, '-', '') || '@sin-email.clubarchery.local'
  );

  -- Use club's default password or a generated one if none provided
  v_effective_password := COALESCE(
    NULLIF(trim(p_password), ''),
    'Arquero' || floor(random() * 9000 + 1000)::text
  );

  -- Create user in auth.users with email already confirmed
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
    v_auth_email,
    crypt(v_effective_password, gen_salt('bf')),
    now(),
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

  -- Create member record (email can be null for minors)
  INSERT INTO public.members (
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
    trim(p_full_name),
    v_effective_email,         -- NULL if no real email provided
    NULLIF(trim(p_phone), ''),
    p_date_of_birth,
    NULLIF(trim(p_identification), ''),
    NULLIF(trim(p_address), ''),
    NULLIF(trim(p_medical_history), ''),
    NULLIF(trim(p_emergency_contact_name), ''),
    NULLIF(trim(p_emergency_contact_phone), ''),
    p_shirt_size,
    p_windbreaker_size,
    NULLIF(trim(p_display_name), ''),
    NULLIF(trim(p_guardian_name), ''),
    NULLIF(trim(p_guardian_phone), ''),
    NULLIF(trim(p_guardian_email), ''),
    'activo',
    CURRENT_DATE
  )
  RETURNING id INTO v_member_id;

  -- Assign role
  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, p_club_id, p_role);

  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'member_id', v_member_id,
    'auth_email', v_auth_email,
    'has_real_email', v_effective_email IS NOT NULL
  );

  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Ya existe un usuario registrado con el correo electrónico: %', v_auth_email;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear el miembro: %', SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_member_account_by_admin TO authenticated;

COMMENT ON FUNCTION public.create_member_account_by_admin IS
  'Creates a new club member (by admin). Email is optional — for minor archers, '
  'leave p_email null and provide guardian data. A placeholder email is used internally '
  'for Supabase Auth, but members.email stores NULL.';
