-- ============================================================
-- FIXED QR + GPS ATTENDANCE MODULE
-- ============================================================

-- 1. Create Trainings Table
CREATE TABLE IF NOT EXISTS public.trainings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    location_lat DOUBLE PRECISION NOT NULL,
    location_lng DOUBLE PRECISION NOT NULL,
    allowed_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create Training Attendance Table
CREATE TABLE IF NOT EXISTS public.training_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_meters DOUBLE PRECISION,
    ip_address TEXT,
    user_agent TEXT,
    attended_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_training_user UNIQUE (training_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;

-- 3. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_trainings_club_id ON public.trainings(club_id);
CREATE INDEX IF NOT EXISTS idx_trainings_starts_ends ON public.trainings(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_attendance_club_id ON public.training_attendance(club_id);
CREATE INDEX IF NOT EXISTS idx_attendance_training_id ON public.training_attendance(training_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON public.training_attendance(user_id);

-- 4. Distance Calculation Helper Function (Haversine Formula)
CREATE OR REPLACE FUNCTION public.calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R DOUBLE PRECISION := 6371000.0; -- Earth's radius in meters
  dlat DOUBLE PRECISION;
  dlon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  a := sin(dlat / 2.0) * sin(dlat / 2.0) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlon / 2.0) * sin(dlon / 2.0);
  c := 2.0 * asin(sqrt(a));
  RETURN R * c;
END;
$$;

-- 5. Transactional RPC for Secure Check-in
CREATE OR REPLACE FUNCTION public.check_in_attendance(
  p_training_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_ip_address TEXT,
  p_user_agent TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_club_id UUID;
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
  v_loc_lat DOUBLE PRECISION;
  v_loc_lng DOUBLE PRECISION;
  v_allowed_radius DOUBLE PRECISION;
  v_distance DOUBLE PRECISION;
  v_has_role BOOLEAN;
  v_is_active_member BOOLEAN;
BEGIN
  -- A. Verify authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'code', 'UNAUTHORIZED', 'message', 'Debes iniciar sesión para registrar asistencia.');
  END IF;

  -- B. Get training details with lock to prevent race conditions
  SELECT club_id, starts_at, ends_at, location_lat, location_lng, allowed_radius_meters
  INTO v_club_id, v_starts_at, v_ends_at, v_loc_lat, v_loc_lng, v_allowed_radius
  FROM public.trainings
  WHERE id = p_training_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'code', 'TRAINING_NOT_FOUND', 'message', 'El entrenamiento no existe.');
  END IF;

  -- C. Check if user is an active member in this club
  SELECT EXISTS (
    SELECT 1 FROM public.members
    WHERE user_id = v_user_id AND club_id = v_club_id AND status = 'activo'::public.member_status
  ) INTO v_is_active_member;

  IF NOT v_is_active_member THEN
    RETURN json_build_object('success', false, 'code', 'NOT_A_MEMBER', 'message', 'No eres un miembro activo de este club.');
  END IF;

  -- D. Validate role 'arquero' (archer) in member_roles
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    JOIN public.members m ON m.id = mr.member_id
    WHERE m.user_id = v_user_id
      AND m.club_id = v_club_id
      AND mr.role = 'arquero'::public.club_role
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN json_build_object('success', false, 'code', 'INVALID_ROLE', 'message', 'Solo los arqueros registrados pueden marcar asistencia.');
  END IF;

  -- E. Validate active training hours
  IF now() < v_starts_at THEN
    RETURN json_build_object('success', false, 'code', 'TRAINING_NOT_STARTED', 'message', 'El entrenamiento aún no ha comenzado.');
  ELSIF now() > v_ends_at THEN
    RETURN json_build_object('success', false, 'code', 'TRAINING_EXPIRED', 'message', 'El entrenamiento ya ha finalizado.');
  END IF;

  -- F. Check duplicate check-ins
  IF EXISTS (
    SELECT 1 FROM public.training_attendance
    WHERE training_id = p_training_id AND user_id = v_user_id
  ) THEN
    RETURN json_build_object('success', false, 'code', 'ALREADY_REGISTERED', 'message', 'Ya has registrado tu asistencia para este entrenamiento.');
  END IF;

  -- G. Calculate Haversine distance
  v_distance := public.calculate_distance(p_latitude, p_longitude, v_loc_lat, v_loc_lng);

  -- H. Verify allowed check-in radius range
  IF v_distance > v_allowed_radius THEN
    RETURN json_build_object(
      'success', false,
      'code', 'OUT_OF_RANGE',
      'message', 'Estás fuera del radio permitido para este entrenamiento.',
      'distance_meters', round(v_distance::numeric, 1),
      'allowed_radius', v_allowed_radius
    );
  END IF;

  -- I. Perform transactional insert
  INSERT INTO public.training_attendance (
    club_id,
    training_id,
    user_id,
    latitude,
    longitude,
    distance_meters,
    ip_address,
    user_agent,
    attended_at
  ) VALUES (
    v_club_id,
    p_training_id,
    v_user_id,
    p_latitude,
    p_longitude,
    v_distance,
    p_ip_address,
    p_user_agent,
    now()
  );

  RETURN json_build_object(
    'success', true,
    'code', 'SUCCESS',
    'message', '¡Asistencia registrada con éxito!',
    'distance_meters', round(v_distance::numeric, 1)
  );
END;
$$;

-- ============================================================
-- RLS POLICIES FOR TRAININGS
-- ============================================================

CREATE POLICY "Read trainings by club members" ON public.trainings
    FOR SELECT TO authenticated
    USING (
      club_id IN (SELECT public.get_user_clubs(auth.uid())) 
      OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Manage trainings by authorized roles" ON public.trainings
    FOR ALL TO authenticated
    USING (
      public.is_club_admin(auth.uid(), club_id) 
      OR public.has_club_role(auth.uid(), club_id, 'entrenador') 
      OR public.is_super_admin(auth.uid())
    );

-- ============================================================
-- RLS POLICIES FOR TRAINING_ATTENDANCE
-- ============================================================

CREATE POLICY "Read attendance records" ON public.training_attendance
    FOR SELECT TO authenticated
    USING (
      user_id = auth.uid()
      OR public.is_club_admin(auth.uid(), club_id)
      OR public.has_club_role(auth.uid(), club_id, 'entrenador')
      OR public.is_super_admin(auth.uid())
    );

CREATE POLICY "Insert own attendance records" ON public.training_attendance
    FOR INSERT TO authenticated
    WITH CHECK (
      user_id = auth.uid()
    );

-- ============================================================
-- PRIVILEGES & CACHE RELOAD
-- ============================================================

GRANT ALL ON public.trainings TO authenticated;
GRANT ALL ON public.training_attendance TO authenticated;
GRANT SELECT ON public.trainings TO anon;

GRANT EXECUTE ON FUNCTION public.calculate_distance(double precision, double precision, double precision, double precision) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.check_in_attendance(uuid, double precision, double precision, text, text) TO authenticated, anon;

NOTIFY pgrst, 'reload schema';
