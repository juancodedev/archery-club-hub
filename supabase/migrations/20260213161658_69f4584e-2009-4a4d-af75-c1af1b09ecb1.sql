
-- Fix 1: Cross-club role visibility in member_roles SELECT policy
DROP POLICY "Read own or admin reads club roles" ON public.member_roles;
CREATE POLICY "Read own or admin reads club roles" ON public.member_roles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_roles.member_id AND m.user_id = auth.uid())
    OR public.is_club_admin(auth.uid(), club_id)
    OR (public.has_club_role(auth.uid(), club_id, 'entrenador') AND EXISTS (
      SELECT 1 FROM public.members m WHERE m.user_id = auth.uid() AND m.club_id = member_roles.club_id
    ))
  );

-- Fix 2: Harden register_club function - use auth.uid() instead of trusting client, add input validation
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

  -- Input validation
  IF length(trim(p_club_name)) < 2 OR length(p_club_name) > 200 THEN
    RAISE EXCEPTION 'Club name must be between 2 and 200 characters';
  END IF;
  IF length(trim(p_admin_name)) < 2 OR length(p_admin_name) > 200 THEN
    RAISE EXCEPTION 'Admin name must be between 2 and 200 characters';
  END IF;
  IF p_contact_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF length(p_city) > 200 THEN
    RAISE EXCEPTION 'City name too long';
  END IF;
  IF length(p_country) > 200 THEN
    RAISE EXCEPTION 'Country name too long';
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

-- Fix 3: Server-side input validation triggers for members and scores

-- Validation trigger for members table
CREATE OR REPLACE FUNCTION public.validate_member_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(trim(NEW.full_name)) < 2 OR length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'Full name must be between 2 and 200 characters';
  END IF;
  IF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 50 THEN
    RAISE EXCEPTION 'Phone number too long';
  END IF;
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address too long';
  END IF;
  IF NEW.identification IS NOT NULL AND length(NEW.identification) > 50 THEN
    RAISE EXCEPTION 'Identification too long';
  END IF;
  IF NEW.medical_history IS NOT NULL AND length(NEW.medical_history) > 2000 THEN
    RAISE EXCEPTION 'Medical history too long';
  END IF;
  IF NEW.guardian_name IS NOT NULL AND length(NEW.guardian_name) > 200 THEN
    RAISE EXCEPTION 'Guardian name too long';
  END IF;
  IF NEW.guardian_phone IS NOT NULL AND length(NEW.guardian_phone) > 50 THEN
    RAISE EXCEPTION 'Guardian phone too long';
  END IF;
  IF NEW.guardian_email IS NOT NULL AND NEW.guardian_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid guardian email format';
  END IF;
  NEW.full_name := trim(NEW.full_name);
  NEW.email := trim(NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_member_before_insert_update
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.validate_member_data();

-- Validation trigger for scores table
CREATE OR REPLACE FUNCTION public.validate_score_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_name IS NOT NULL AND length(NEW.event_name) > 500 THEN
    RAISE EXCEPTION 'Event name too long';
  END IF;
  IF NEW.division IS NOT NULL AND length(NEW.division) > 100 THEN
    RAISE EXCEPTION 'Division too long';
  END IF;
  IF NEW.target_type IS NOT NULL AND length(NEW.target_type) > 100 THEN
    RAISE EXCEPTION 'Target type too long';
  END IF;
  IF NEW.detail IS NOT NULL AND length(NEW.detail) > 1000 THEN
    RAISE EXCEPTION 'Detail too long';
  END IF;
  IF NEW.total_score < 0 OR NEW.total_score > 10000 THEN
    RAISE EXCEPTION 'Total score out of valid range';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_score_before_insert_update
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.validate_score_data();
