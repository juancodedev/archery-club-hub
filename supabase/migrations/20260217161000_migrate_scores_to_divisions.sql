-- Migración de scores para usar divisiones y tipos de torneo

-- Agregar nuevas columnas a scores
ALTER TABLE public.scores ADD COLUMN division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;
ALTER TABLE public.scores ADD COLUMN tournament_type_id UUID REFERENCES public.tournament_types(id) ON DELETE SET NULL;
ALTER TABLE public.scores ADD COLUMN x_count INTEGER DEFAULT 0;

-- Guardar valores antiguos para referencia
ALTER TABLE public.scores ADD COLUMN old_division TEXT;
ALTER TABLE public.scores ADD COLUMN old_target_type TEXT;

-- Copiar valores actuales a columnas temporales
UPDATE public.scores SET old_division = division, old_target_type = target_type;

-- Función para intentar mapear divisiones de texto a IDs
CREATE OR REPLACE FUNCTION migrate_score_divisions()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  score_record RECORD;
  division_record RECORD;
BEGIN
  -- Iterar sobre scores que tienen división pero no division_id
  FOR score_record IN 
    SELECT id, division, club_id 
    FROM public.scores 
    WHERE division IS NOT NULL 
    AND division != '' 
    AND division_id IS NULL
  LOOP
    -- Intentar encontrar división que coincida (case-insensitive)
    SELECT id INTO division_record
    FROM public.divisions
    WHERE (
      LOWER(name) = LOWER(score_record.division)
      OR LOWER(abbreviation) = LOWER(score_record.division)
    )
    AND (is_system = true OR club_id = score_record.club_id)
    AND active = true
    LIMIT 1;
    
    -- Si encontramos coincidencia, actualizar
    IF division_record.id IS NOT NULL THEN
      UPDATE public.scores
      SET division_id = division_record.id
      WHERE id = score_record.id;
    END IF;
  END LOOP;
END;
$$;

-- Ejecutar migración
SELECT migrate_score_divisions();

-- Eliminar la función temporal
DROP FUNCTION migrate_score_divisions();

-- Crear índices para mejorar performance
CREATE INDEX idx_scores_division_id ON public.scores(division_id);
CREATE INDEX idx_scores_tournament_type_id ON public.scores(tournament_type_id);
CREATE INDEX idx_member_divisions_member_id ON public.member_divisions(member_id);
CREATE INDEX idx_member_divisions_division_id ON public.member_divisions(division_id);

-- Comentarios para documentación
COMMENT ON COLUMN public.scores.division_id IS 'Referencia a la división/categoría del score';
COMMENT ON COLUMN public.scores.tournament_type_id IS 'Referencia al tipo de torneo';
COMMENT ON COLUMN public.scores.x_count IS 'Cantidad de Xs (para desempates)';
COMMENT ON COLUMN public.scores.old_division IS 'Valor legacy de división (texto libre) - mantener para referencia';
COMMENT ON COLUMN public.scores.old_target_type IS 'Valor legacy de tipo de target - mantener para referencia';
COMMENT ON TABLE public.divisions IS 'Catálogo de divisiones/categorías de arquería';
COMMENT ON TABLE public.member_divisions IS 'Divisiones activas de cada miembro (relación many-to-many)';
COMMENT ON TABLE public.tournament_types IS 'Catálogo de tipos de torneo con configuración de flechas';
