
-- Fix search_path on functions that are missing it

CREATE OR REPLACE FUNCTION public.calculate_division_by_age(p_birth_date date, p_gender text DEFAULT NULL::text, p_bow_type text DEFAULT 'recurvo'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_age INTEGER;
  v_division_id UUID;
BEGIN
  v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_birth_date));
  
  IF v_age < 15 THEN
    SELECT id INTO v_division_id FROM public.divisions 
    WHERE LOWER(name) LIKE '%cadete%' 
    AND LOWER(name) LIKE '%' || LOWER(p_bow_type) || '%'
    AND is_system = true
    LIMIT 1;
  ELSIF v_age < 18 THEN
    SELECT id INTO v_division_id FROM public.divisions 
    WHERE LOWER(name) LIKE '%junior%' 
    AND LOWER(name) LIKE '%' || LOWER(p_bow_type) || '%'
    AND is_system = true
    LIMIT 1;
  ELSE
    IF p_gender IS NOT NULL THEN
      SELECT id INTO v_division_id FROM public.divisions 
      WHERE LOWER(name) LIKE '%' || LOWER(p_bow_type) || '%'
      AND (
        (p_gender = 'M' AND LOWER(name) LIKE '%masculino%')
        OR (p_gender = 'F' AND LOWER(name) LIKE '%femenino%')
      )
      AND is_system = true
      LIMIT 1;
    END IF;
    
    IF v_division_id IS NULL THEN
      SELECT id INTO v_division_id FROM public.divisions 
      WHERE LOWER(name) = LOWER(p_bow_type)
      AND is_system = true
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN v_division_id;
END;
$function$;

---

CREATE OR REPLACE FUNCTION public.auto_update_member_divisions()
 RETURNS TABLE(member_id uuid, old_division_name text, new_division_name text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  member_record RECORD;
  new_division_id UUID;
  old_division_id UUID;
BEGIN
  FOR member_record IN
    SELECT DISTINCT 
      m.id as member_id,
      m.full_name,
      m.date_of_birth,
      md.division_id as current_division_id,
      md.valid_until,
      d.name as current_division_name
    FROM public.members m
    JOIN public.member_divisions md ON md.member_id = m.id
    JOIN public.divisions d ON d.id = md.division_id
    WHERE md.valid_until = CURRENT_DATE
    AND m.date_of_birth IS NOT NULL
  LOOP
    new_division_id := public.calculate_division_by_age(
      member_record.date_of_birth,
      NULL,
      'recurvo'
    );
    
    IF new_division_id IS NOT NULL AND new_division_id != member_record.current_division_id THEN
      UPDATE public.member_divisions
      SET valid_until = CURRENT_DATE
      WHERE member_id = member_record.member_id
      AND division_id = member_record.current_division_id;
      
      INSERT INTO public.member_divisions (
        member_id, division_id, is_primary, valid_from, valid_until
      ) VALUES (
        member_record.member_id, new_division_id, true,
        CURRENT_DATE + 1, CURRENT_DATE + INTERVAL '1 year'
      );
      
      INSERT INTO public.division_change_notifications (
        member_id, old_division_id, new_division_id, change_date, reason
      ) VALUES (
        member_record.member_id, member_record.current_division_id,
        new_division_id, CURRENT_DATE, 'Cambio automático por cumplimiento de edad'
      );
      
      RETURN QUERY
      SELECT 
        member_record.member_id,
        member_record.current_division_name,
        d.name
      FROM public.divisions d
      WHERE d.id = new_division_id;
    END IF;
  END LOOP;
END;
$function$;

---

CREATE OR REPLACE FUNCTION public.is_member_paid_current_month(p_member_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.financial_entries
    WHERE member_id = p_member_id
    AND (category ILIKE 'membresía' OR category ILIKE 'membresia' OR category ILIKE 'cuota mensual')
    AND payment_month = EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
    AND payment_year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  );
END;
$function$;

---

CREATE OR REPLACE FUNCTION public.single_row_system_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF (SELECT COUNT(*) FROM public.system_settings) >= 1 THEN
        RAISE EXCEPTION 'Only one row is allowed in system_settings';
    END IF;
    RETURN NEW;
END;
$function$;

---

CREATE OR REPLACE FUNCTION public.validate_score_ends()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF jsonb_typeof(NEW.ends) != 'array' THEN
    RAISE EXCEPTION 'El campo ends debe ser un array JSON';
  END IF;
  RETURN NEW;
END;
$function$;

---

CREATE OR REPLACE FUNCTION public.validate_member_data()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF length(trim(NEW.full_name)) < 2 OR length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'El nombre completo debe tener entre 2 y 200 caracteres';
  END IF;

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
$function$;
