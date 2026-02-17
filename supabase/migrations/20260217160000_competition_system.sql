-- Sistema de Competencia y Puntajes
-- Catálogos de divisiones y tipos de torneo

-- Tabla de divisiones/categorías
CREATE TABLE IF NOT EXISTS public.divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  description TEXT,
  min_age INTEGER,
  max_age INTEGER,
  gender TEXT CHECK (gender IN ('M', 'F', NULL)),
  is_system BOOLEAN NOT NULL DEFAULT false,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, club_id),
  CHECK (is_system = true AND club_id IS NULL OR is_system = false)
);

ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- Relación many-to-many: miembros y divisiones
CREATE TABLE IF NOT EXISTS public.member_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, division_id)
);

ALTER TABLE public.member_divisions ENABLE ROW LEVEL SECURITY;

-- Tabla de tipos de torneo
CREATE TABLE IF NOT EXISTS public.tournament_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  arrows_per_end INTEGER NOT NULL DEFAULT 3,
  ends_per_round INTEGER NOT NULL DEFAULT 10,
  distance_meters INTEGER,
  target_size_cm INTEGER,
  is_indoor BOOLEAN NOT NULL DEFAULT false,
  scoring_zones JSONB DEFAULT '[10,9,8,7,6,5,4,3,2,1]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, club_id),
  CHECK (is_system = true AND club_id IS NULL OR is_system = false)
);

ALTER TABLE public.tournament_types ENABLE ROW LEVEL SECURITY;

-- Insertar divisiones estándar de World Archery
INSERT INTO public.divisions (name, abbreviation, description, is_system, active) VALUES
  ('Recurvo', 'RC', 'Arco recurvo olímpico', true, true),
  ('Compuesto', 'CO', 'Arco compuesto con mira y estabilizadores', true, true),
  ('Arco Desnudo', 'BB', 'Barebow - sin mira ni estabilizadores', true, true),
  ('Longbow', 'LB', 'Arco tradicional largo', true, true),
  ('Recurvo Junior', 'RCJ', 'Arco recurvo - categoría junior', true, true),
  ('Compuesto Junior', 'COJ', 'Arco compuesto - categoría junior', true, true),
  ('Recurvo Cadete', 'RCC', 'Arco recurvo - categoría cadete', true, true),
  ('Compuesto Cadete', 'COC', 'Arco compuesto - categoría cadete', true, true),
  ('Recurvo Masculino', 'RCM', 'Arco recurvo - rama masculina', true, true),
  ('Recurvo Femenino', 'RCF', 'Arco recurvo - rama femenina', true, true),
  ('Compuesto Masculino', 'COM', 'Arco compuesto - rama masculina', true, true),
  ('Compuesto Femenino', 'COF', 'Arco compuesto - rama femenina', true, true)
ON CONFLICT (name, club_id) DO NOTHING;

-- Insertar tipos de torneo estándar
INSERT INTO public.tournament_types (name, description, arrows_per_end, ends_per_round, distance_meters, target_size_cm, is_indoor, is_system, active) VALUES
  ('Indoor 18m', 'Torneo indoor a 18 metros con cara de 40cm (3 zonas)', 3, 20, 18, 40, true, true, true),
  ('Indoor 18m (5 flechas)', 'Torneo indoor a 18 metros - 5 flechas por serie', 5, 12, 18, 40, true, true, true),
  ('Outdoor 70m', 'Torneo outdoor a 70 metros con cara de 122cm', 6, 12, 70, 122, false, true, true),
  ('Outdoor 60m', 'Torneo outdoor a 60 metros', 6, 12, 60, 122, false, true, true),
  ('Outdoor 50m', 'Torneo outdoor a 50 metros', 6, 12, 50, 122, false, true, true),
  ('Outdoor 30m', 'Torneo outdoor a 30 metros', 6, 12, 30, 80, false, true, true),
  ('Field Archery', 'Tiro de campo - recorrido en terreno natural', 3, 24, NULL, NULL, false, true, true),
  ('3D Archery', 'Tiro 3D - figuras de animales', 1, 30, NULL, NULL, false, true, true),
  ('Entrenamiento Libre', 'Sesión de entrenamiento sin formato específico', 6, 10, NULL, NULL, false, true, true)
ON CONFLICT (name, club_id) DO NOTHING;

-- RLS Policies para divisions (simplificadas sin dependencias de funciones externas)
CREATE POLICY "Anyone can read system divisions" ON public.divisions FOR SELECT TO authenticated
  USING (
    is_system = true 
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.club_id = divisions.club_id 
      AND m.user_id = auth.uid() 
      AND m.status = 'activo'
    )
  );

CREATE POLICY "Admin can create club divisions" ON public.divisions FOR INSERT TO authenticated
  WITH CHECK (
    is_system = false 
    AND club_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = divisions.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

CREATE POLICY "Admin can update club divisions" ON public.divisions FOR UPDATE TO authenticated
  USING (
    is_system = false 
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = divisions.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

CREATE POLICY "Admin can delete club divisions" ON public.divisions FOR DELETE TO authenticated
  USING (
    is_system = false 
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = divisions.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

-- RLS Policies para member_divisions
CREATE POLICY "Members can read own divisions" ON public.member_divisions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_roles mr ON mr.member_id = m.id
      WHERE m.id = member_divisions.member_id
      AND mr.role IN ('administrador', 'presidente')
      AND EXISTS (
        SELECT 1 FROM public.members m2 
        WHERE m2.user_id = auth.uid() 
        AND m2.club_id = mr.club_id
      )
    )
  );

CREATE POLICY "Admin can manage member divisions" ON public.member_divisions FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_roles mr ON mr.member_id = m.id
      WHERE m.id = member_divisions.member_id
      AND mr.role IN ('administrador', 'presidente')
      AND EXISTS (
        SELECT 1 FROM public.members m2 
        WHERE m2.user_id = auth.uid() 
        AND m2.club_id = mr.club_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_roles mr ON mr.member_id = m.id
      WHERE m.id = member_divisions.member_id
      AND mr.role IN ('administrador', 'presidente')
      AND EXISTS (
        SELECT 1 FROM public.members m2 
        WHERE m2.user_id = auth.uid() 
        AND m2.club_id = mr.club_id
      )
    )
  );

-- RLS Policies para tournament_types
CREATE POLICY "Anyone can read system tournament types" ON public.tournament_types FOR SELECT TO authenticated
  USING (
    is_system = true 
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.club_id = tournament_types.club_id 
      AND m.user_id = auth.uid() 
      AND m.status = 'activo'
    )
  );

CREATE POLICY "Admin can create club tournament types" ON public.tournament_types FOR INSERT TO authenticated
  WITH CHECK (
    is_system = false 
    AND club_id IS NOT NULL 
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = tournament_types.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

CREATE POLICY "Admin can update club tournament types" ON public.tournament_types FOR UPDATE TO authenticated
  USING (
    is_system = false 
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = tournament_types.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

CREATE POLICY "Admin can delete club tournament types" ON public.tournament_types FOR DELETE TO authenticated
  USING (
    is_system = false 
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = tournament_types.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );
