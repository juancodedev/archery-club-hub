-- Migración: Disciplinas World Archery + Distancias en Yardas
-- Agrega columnas de disciplina, distancia en yardas y formato de torneo

-- ─── TABLA tournament_types ──────────────────────────────────────────────────

ALTER TABLE public.tournament_types
  ADD COLUMN IF NOT EXISTS discipline TEXT
    CHECK (discipline IN ('outdoor', 'indoor', 'campo', '3d')),
  ADD COLUMN IF NOT EXISTS bow_type TEXT
    CHECK (bow_type IN ('recurvo', 'compuesto', 'barebow', 'longbow', 'todos')),
  ADD COLUMN IF NOT EXISTS distance_yards NUMERIC,
  ADD COLUMN IF NOT EXISTS tournament_format TEXT
    CHECK (tournament_format IN ('ranking_round', 'sets', 'acumulado', 'equipos', 'libre'));

-- ─── TABLA training_sessions ────────────────────────────────────────────────

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS discipline TEXT
    CHECK (discipline IN ('outdoor', 'indoor', 'campo', '3d')),
  ADD COLUMN IF NOT EXISTS distance_yards NUMERIC;

-- ─── ACTUALIZAR REGISTROS DEL SISTEMA ───────────────────────────────────────
-- Calcula distance_yards desde distance_meters existente (1 m = 1.09361 yd)

UPDATE public.tournament_types
SET
  distance_yards = ROUND(distance_meters * 1.09361),
  discipline = CASE
    WHEN is_indoor = true                          THEN 'indoor'
    WHEN name ILIKE '%field%' OR name ILIKE '%campo%' THEN 'campo'
    WHEN name ILIKE '%3d%'                         THEN '3d'
    ELSE                                               'outdoor'
  END,
  tournament_format = CASE
    WHEN name ILIKE '%entrenamiento%' THEN 'libre'
    WHEN name ILIKE '%3d%'            THEN 'libre'
    WHEN name ILIKE '%field%'         THEN 'libre'
    ELSE                                   'ranking_round'
  END,
  bow_type = CASE
    WHEN name ILIKE '%compuesto%' THEN 'compuesto'
    WHEN name ILIKE '%recurvo%'   THEN 'recurvo'
    ELSE                               'todos'
  END
WHERE is_system = true;

-- ─── NUEVOS TIPOS DE TORNEO CANÓNICOS (World Archery) ───────────────────────

-- Eliminar los tipos genéricos para reemplazarlos con nombres en yardas
-- (solo si coinciden exactamente con los nombres semilla originales)
DELETE FROM public.tournament_types
WHERE is_system = true
  AND name IN (
    'Indoor 18m',
    'Indoor 18m (5 flechas)',
    'Outdoor 70m',
    'Outdoor 60m',
    'Outdoor 50m',
    'Outdoor 30m',
    'Field Archery',
    '3D Archery',
    'Entrenamiento Libre'
  );

-- Insertar tipos canónicos con nombres en yardas y metadatos completos
INSERT INTO public.tournament_types (
  name, description,
  arrows_per_end, ends_per_round,
  distance_meters, distance_yards, target_size_cm,
  is_indoor, discipline, bow_type, tournament_format,
  is_system, active
) VALUES
  -- INDOOR SALA
  ('Indoor 20yd (18m)',
   'Sala estándar a 20 yardas / 18 metros. Diana 40cm (triple vertical en alta competencia)',
   3, 20, 18, 20, 40, true, 'indoor', 'todos', 'ranking_round', true, true),

  ('Indoor 27yd (25m) — 5 flechas',
   'Sala a 27 yardas / 25 metros. 5 flechas por serie',
   5, 12, 25, 27, 60, true, 'indoor', 'todos', 'ranking_round', true, true),

  -- OUTDOOR TARGET — RECURVO
  ('Outdoor 76yd (70m) — Recurvo',
   'Distancia olímpica oficial para Arco Recurvo. Diana 122cm',
   6, 12, 70, 76, 122, false, 'outdoor', 'recurvo', 'ranking_round', true, true),

  ('Outdoor 66yd (60m) — Recurvo',
   'Outdoor a 60 metros / 66 yardas. Diana 122cm',
   6, 12, 60, 66, 122, false, 'outdoor', 'recurvo', 'ranking_round', true, true),

  ('Outdoor 33yd (30m) — Recurvo Junior',
   'Distancia junior y cadete. Diana 80cm',
   6, 12, 30, 33, 80, false, 'outdoor', 'recurvo', 'ranking_round', true, true),

  -- OUTDOOR TARGET — COMPUESTO
  ('Outdoor 55yd (50m) — Compuesto',
   'Distancia olímpica para Arco Compuesto. Diana 80cm (solo anillos 6-10)',
   6, 12, 50, 55, 80, false, 'outdoor', 'compuesto', 'ranking_round', true, true),

  -- FIELD ARCHERY
  ('Tiro de Campo (Field)',
   'Recorrido en bosque o terreno accidentado. 24 tiros a distancias conocidas (5-66 yd) y desconocidas',
   3, 24, NULL, NULL, NULL, false, 'campo', 'todos', 'libre', true, true),

  ('Campo — Distancias Conocidas (Marked)',
   'Recorrido de campo con distancias señalizadas. 5 a 66 yardas (5 a 60 metros)',
   3, 24, NULL, NULL, NULL, false, 'campo', 'todos', 'ranking_round', true, true),

  ('Campo — Distancias Desconocidas (Unmarked)',
   'El arquero estima la distancia. Añade habilidad de caza y juicio.',
   3, 24, NULL, NULL, NULL, false, 'campo', 'todos', 'ranking_round', true, true),

  -- 3D ARCHERY
  ('3D Arquería',
   'Figuras de espuma de animales a escala real en entorno natural. Sin anillos visibles; zonas vitales. 1 flecha por figura',
   1, 30, NULL, NULL, NULL, false, '3d', 'todos', 'libre', true, true),

  -- ENTRENAMIENTO
  ('Entrenamiento Libre',
   'Sesión de práctica sin formato competitivo específico',
   6, 10, NULL, NULL, NULL, false, 'outdoor', 'todos', 'libre', true, true)

ON CONFLICT (name, club_id) DO NOTHING;

-- ─── ÍNDICES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_tournament_types_discipline
  ON public.tournament_types (discipline);

CREATE INDEX IF NOT EXISTS idx_training_sessions_discipline
  ON public.training_sessions (discipline);
