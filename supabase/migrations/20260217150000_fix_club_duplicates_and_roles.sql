-- 1. Deduplicate clubs before adding the constraint
-- This will pick the oldest club for each email and move all related data to it.
DO $$
DECLARE
    r RECORD;
    v_primary_id UUID;
BEGIN
    FOR r IN (SELECT contact_email, count(*) FROM public.clubs GROUP BY contact_email HAVING count(*) > 1) LOOP
        -- Select the oldest club ID as the survivor
        SELECT id INTO v_primary_id FROM public.clubs WHERE contact_email = r.contact_email ORDER BY created_at ASC LIMIT 1;
        
        -- Reassign members (handling potential conflicts if a user is in both clubs)
        DELETE FROM public.members 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id)
        AND user_id IN (SELECT user_id FROM public.members WHERE club_id = v_primary_id);

        UPDATE public.members 
        SET club_id = v_primary_id 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id);

        -- Reassign member roles
        UPDATE public.member_roles 
        SET club_id = v_primary_id 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id);

        -- Reassign training sessions
        UPDATE public.training_sessions 
        SET club_id = v_primary_id 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id);

        -- Reassign scores
        UPDATE public.scores 
        SET club_id = v_primary_id 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id);

        -- Reassign invitations
        UPDATE public.member_invitations 
        SET club_id = v_primary_id 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id);

        -- Reassign training enrollments
        UPDATE public.training_enrollments 
        SET club_id = v_primary_id 
        WHERE club_id != v_primary_id 
        AND club_id IN (SELECT id FROM public.clubs WHERE contact_email = r.contact_email AND id != v_primary_id);

        -- Delete the empty duplicate clubs
        DELETE FROM public.clubs 
        WHERE contact_email = r.contact_email AND id != v_primary_id;
    END LOOP;
END $$;

-- Now add the unique constraint
ALTER TABLE public.clubs ADD CONSTRAINT clubs_contact_email_key UNIQUE (contact_email);


-- 2. Add new roles to club_role enum
-- Using DO block to avoid errors if already exists (though VALUE ADD doesn't support IF NOT EXISTS in some PG versions)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'club_role' AND e.enumlabel = 'secretaria') THEN
        ALTER TYPE public.club_role ADD VALUE 'secretaria';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'club_role' AND e.enumlabel = 'tesorero') THEN
        ALTER TYPE public.club_role ADD VALUE 'tesorero';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'club_role' AND e.enumlabel = 'alumno') THEN
        ALTER TYPE public.club_role ADD VALUE 'alumno';
    END IF;
END
$$;

-- 3. Update register_club function to handle unique constraint gracefully
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
  -- Verify caller matches provided user_id
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_user_id != v_caller THEN
    RAISE EXCEPTION 'User ID mismatch';
  END IF;

  -- Check if club with this email already exists
  IF EXISTS (SELECT 1 FROM public.clubs WHERE contact_email = trim(p_contact_email)) THEN
    RAISE EXCEPTION 'Ya existe un club registrado con este correo electrónico';
  END IF;

  -- Input validation
  IF length(trim(p_club_name)) < 2 OR length(p_club_name) > 200 THEN
    RAISE EXCEPTION 'El nombre del club debe tener entre 2 y 200 caracteres';
  END IF;
  IF length(trim(p_admin_name)) < 2 OR length(p_admin_name) > 200 THEN
    RAISE EXCEPTION 'El nombre del administrador debe tener entre 2 y 200 caracteres';
  END IF;
  IF p_contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Formato de correo electrónico inválido';
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

-- 4. Update helper functions to include new roles if necessary
-- Note: We use ::text comparison to avoid "New enum values must be committed before they can be used" error
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    JOIN public.members m ON m.id = mr.member_id
    WHERE m.user_id = p_user_id 
      AND mr.club_id = p_club_id 
      AND mr.role::text IN ('administrador', 'presidente', 'secretaria', 'tesorero')
  );
$$;


