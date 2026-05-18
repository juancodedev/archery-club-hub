-- Supabase SQL Migration: IFAA Backend Validation & Classification Triggers
-- Created At: 2026-05-18

-- 1. Create a function to validate and automatically classify scores
CREATE OR REPLACE FUNCTION public.process_ifaa_score()
RETURNS TRIGGER AS $$
DECLARE
  v_ifaa_round public.ifaa_round_type;
  v_end jsonb;
  v_arrow jsonb;
  v_end_idx integer := 0;
  v_arrow_idx integer;
  v_has_hit boolean;
  v_val text;
  
  -- Variables for classification
  v_div_abbrev text;
  v_div_name text;
  v_prev_scores integer[];
  v_scores integer[];
  v_curr_round public.ifaa_round_type;
  v_avg_score numeric;
BEGIN
  -- ────────────────────────────────────────────────────────────────
  -- PART A: IFAA SCORES STRUCTURE VALIDATION
  -- ────────────────────────────────────────────────────────────────

  -- Fetch tournament_types.ifaa_round
  IF NEW.tournament_type_id IS NOT NULL THEN
    SELECT ifaa_round INTO v_ifaa_round
    FROM public.tournament_types
    WHERE id = NEW.tournament_type_id;
  END IF;

  -- Apply validations if it is an IFAA round
  IF v_ifaa_round IS NOT NULL THEN
    -- Ensure ends is a JSONB array
    IF jsonb_typeof(NEW.ends) <> 'array' THEN
      RAISE EXCEPTION 'La estructura de rondas (ends) debe ser un arreglo JSON.';
    END IF;

    -- Validate each end
    FOR v_end IN SELECT * FROM jsonb_array_elements(NEW.ends) LOOP
      v_end_idx := v_end_idx + 1;
      
      IF jsonb_typeof(v_end) <> 'array' THEN
        RAISE EXCEPTION 'Cada ronda en el blanco % debe ser un arreglo de flechas.', v_end_idx;
      END IF;

      -- Check validations per IFAA round type
      IF v_ifaa_round IN ('field', 'hunter', 'field_expert', 'flint_indoor', 'indoor_standard') THEN
        -- Exactly 4 arrows
        IF jsonb_array_length(v_end) <> 4 THEN
          RAISE EXCEPTION 'En ronda Field/Hunter, el blanco % debe tener exactamente 4 flechas.', v_end_idx;
        END IF;
        
        -- Valid values: 5, 4, 3, 0, M, '' (empty strings allowed in progress, but must be valid characters)
        FOR v_arrow_idx IN 0..3 LOOP
          v_val := jsonb_extract_path_text(v_end, v_arrow_idx::text);
          IF v_val IS NOT NULL AND v_val <> '' AND NOT (v_val IN ('5', '4', '3', '0', 'M')) THEN
            RAISE EXCEPTION 'Valor de flecha inválido (% en blanco %, flecha %). Valores válidos: 5, 4, 3, M.', v_val, v_end_idx, v_arrow_idx + 1;
          END IF;
        END LOOP;

      ELSIF v_ifaa_round IN ('animal_2d', 'animal_3d') THEN
        -- Exactly 3 arrows
        IF jsonb_array_length(v_end) <> 3 THEN
          RAISE EXCEPTION 'En ronda Animal, el blanco % debe tener exactamente 3 flechas.', v_end_idx;
        END IF;

        v_has_hit := false;
        FOR v_arrow_idx IN 0..2 LOOP
          v_val := jsonb_extract_path_text(v_end, v_arrow_idx::text);
          
          -- Empty or null values are allowed
          IF v_val IS NOT NULL AND v_val <> '' THEN
            -- If we already had a hit, then no more arrows are allowed
            IF v_has_hit THEN
              RAISE EXCEPTION 'No se permiten flechas adicionales después de un acierto en blanco %.', v_end_idx;
            END IF;

            -- Validate points depending on arrow index
            IF v_arrow_idx = 0 THEN
              -- Arrow 1: Kill = 20, Wound = 18, Miss = M, 0
              IF NOT (v_val IN ('20', '18', '0', 'M')) THEN
                RAISE EXCEPTION 'Valor de flecha 1 inválido (% en blanco %). Valores válidos: 20, 18, M.', v_val, v_end_idx;
              END IF;
              IF v_val IN ('20', '18') THEN
                v_has_hit := true;
              END IF;
            ELSIF v_arrow_idx = 1 THEN
              -- Arrow 2: Kill = 16, Wound = 14, Miss = M, 0
              IF NOT (v_val IN ('16', '14', '0', 'M')) THEN
                RAISE EXCEPTION 'Valor de flecha 2 inválido (% en blanco %). Valores válidos: 16, 14, M.', v_val, v_end_idx;
              END IF;
              IF v_val IN ('16', '14') THEN
                v_has_hit := true;
              END IF;
            ELSIF v_arrow_idx = 2 THEN
              -- Arrow 3: Kill = 12, Wound = 10, Miss = M, 0
              IF NOT (v_val IN ('12', '10', '0', 'M')) THEN
                RAISE EXCEPTION 'Valor de flecha 3 inválido (% en blanco %). Valores válidos: 12, 10, M.', v_val, v_end_idx;
              END IF;
              IF v_val IN ('12', '10') THEN
                v_has_hit := true;
              END IF;
            END IF;
          END IF;
        END LOOP;

      ELSIF v_ifaa_round = '3d_hunting' THEN
        -- Exactly 1 arrow
        IF jsonb_array_length(v_end) <> 1 THEN
          RAISE EXCEPTION 'En ronda 3D Hunting, el blanco % debe tener exactamente 1 flecha.', v_end_idx;
        END IF;
        
        v_val := jsonb_extract_path_text(v_end, '0');
        IF v_val IS NOT NULL AND v_val <> '' AND NOT (v_val IN ('20', '16', '10', '0', 'M')) THEN
          RAISE EXCEPTION 'Valor de flecha inválido (% en blanco %). Valores válidos: 20, 16, 10, M.', v_val, v_end_idx;
        END IF;

      ELSIF v_ifaa_round = '3d_standard' THEN
        -- Exactly 2 arrows
        IF jsonb_array_length(v_end) <> 2 THEN
          RAISE EXCEPTION 'En ronda 3D Standard, el blanco % debe tener exactamente 2 flechas.', v_end_idx;
        END IF;
        
        FOR v_arrow_idx IN 0..1 LOOP
          v_val := jsonb_extract_path_text(v_end, v_arrow_idx::text);
          IF v_val IS NOT NULL AND v_val <> '' AND NOT (v_val IN ('10', '8', '5', '0', 'M')) THEN
            RAISE EXCEPTION 'Valor de flecha inválido (% en blanco %, flecha %). Valores válidos: 10, 8, 5, M.', v_val, v_end_idx, v_arrow_idx + 1;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  -- ────────────────────────────────────────────────────────────────
  -- PART B: AUTOMATED IFAA ARCHER CLASSIFICATION
  -- ────────────────────────────────────────────────────────────────

  -- Look up category/division of the archer
  IF NEW.division_id IS NOT NULL THEN
    SELECT abbreviation, name INTO v_div_abbrev, v_div_name
    FROM public.divisions
    WHERE id = NEW.division_id;
  END IF;

  -- Proceed with classification only if division was successfully retrieved
  IF v_div_abbrev IS NOT NULL THEN
    -- Early exit: Check if category starts with 'S' (Senior), 'V' (Veteran), or 'C' (Cub/Infantil)
    -- Also check if name contains those indicators to be extremely robust
    IF v_div_abbrev LIKE 'S%' OR v_div_abbrev LIKE 'V%' OR v_div_abbrev LIKE 'C%' 
       OR v_div_name ILIKE '%senior%' OR v_div_name ILIKE '%veteran%' OR v_div_name ILIKE '%cub%' OR v_div_name ILIKE '%infantil%' THEN
      -- Early exit: no classes for Senior, Veteran, or Cub categories
      NEW.ifaa_class := NULL;
      RETURN NEW;
    END IF;

    -- Fetch the archer's top 2 highest total_scores recorded within the last 12 months
    -- (Excluding the current record if we are editing/updating an existing one)
    SELECT ARRAY(
      SELECT s.total_score
      FROM public.scores s
      JOIN public.tournament_types tt ON tt.id = s.tournament_type_id
      WHERE s.member_id = NEW.member_id
        AND s.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND tt.ifaa_round IN ('field', 'hunter', 'field_expert')
        AND s.score_date BETWEEN (NEW.score_date - INTERVAL '12 months') AND NEW.score_date
      ORDER BY s.total_score DESC
      LIMIT 2
    ) INTO v_prev_scores;

    -- Fetch round type of the current score to evaluate if it should be mixed in
    IF NEW.tournament_type_id IS NOT NULL THEN
      SELECT ifaa_round INTO v_curr_round
      FROM public.tournament_types
      WHERE id = NEW.tournament_type_id;
    END IF;

    -- Combine the current score (if it is a field/hunter round) with previous top scores
    IF v_curr_round IN ('field', 'hunter', 'field_expert') THEN
      IF array_length(v_prev_scores, 1) IS NULL THEN
        v_scores := ARRAY[NEW.total_score];
      ELSIF array_length(v_prev_scores, 1) = 1 THEN
        IF NEW.total_score >= v_prev_scores[1] THEN
          v_scores := ARRAY[NEW.total_score, v_prev_scores[1]];
        ELSE
          v_scores := ARRAY[v_prev_scores[1], NEW.total_score];
        END IF;
      ELSE
        -- 2 previous scores
        IF NEW.total_score >= v_prev_scores[1] THEN
          v_scores := ARRAY[NEW.total_score, v_prev_scores[1]];
        ELSIF NEW.total_score >= v_prev_scores[2] THEN
          v_scores := ARRAY[v_prev_scores[1], NEW.total_score];
        ELSE
          v_scores := v_prev_scores;
        END IF;
      END IF;
    ELSE
      v_scores := v_prev_scores;
    END IF;

    -- Calculate average of the top scores
    IF array_length(v_scores, 1) = 1 THEN
      v_avg_score := v_scores[1]::numeric;
    ELSIF array_length(v_scores, 1) = 2 THEN
      v_avg_score := (v_scores[1] + v_scores[2])::numeric / 2.0;
    ELSE
      v_avg_score := 0.0;
    END IF;

    -- Assign class based on the average score and division benchmarks
    IF v_avg_score > 0.0 THEN
      -- Freestyle Unlimited (FU) / Freestyle (FS) Benchmarks: Class A >= 450, Class B = 350-449, Class C <= 349
      IF v_div_abbrev LIKE '%FU%' OR v_div_abbrev LIKE '%FS%' OR v_div_name ILIKE '%freestyle%' THEN
        IF v_avg_score >= 450 THEN
          NEW.ifaa_class := 'A';
        ELSIF v_avg_score >= 350 THEN
          NEW.ifaa_class := 'B';
        ELSE
          NEW.ifaa_class := 'C';
        END IF;
      -- Bowhunter Unlimited (BU) / Bowhunter (BH) Benchmarks: Class A >= 400, Class B = 300-399, Class C <= 299
      ELSIF v_div_abbrev LIKE '%BU%' OR v_div_abbrev LIKE '%BH%' OR v_div_name ILIKE '%bowhunter%' THEN
        IF v_avg_score >= 400 THEN
          NEW.ifaa_class := 'A';
        ELSIF v_avg_score >= 300 THEN
          NEW.ifaa_class := 'B';
        ELSE
          NEW.ifaa_class := 'C';
        END IF;
      -- Barebow (BB) / Arco Desnudo Benchmarks: Class A >= 375, Class B = 275-374, Class C <= 274
      ELSIF v_div_abbrev LIKE '%BB%' OR v_div_name ILIKE '%barebow%' OR v_div_name ILIKE '%desnudo%' THEN
        IF v_avg_score >= 375 THEN
          NEW.ifaa_class := 'A';
        ELSIF v_avg_score >= 275 THEN
          NEW.ifaa_class := 'B';
        ELSE
          NEW.ifaa_class := 'C';
        END IF;
      -- Default / Longbow / others: Class A >= 300, Class B = 200-299, Class C <= 199
      ELSE
        IF v_avg_score >= 300 THEN
          NEW.ifaa_class := 'A';
        ELSIF v_avg_score >= 200 THEN
          NEW.ifaa_class := 'B';
        ELSE
          NEW.ifaa_class := 'C';
        END IF;
      END IF;
    ELSE
      NEW.ifaa_class := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the trigger if it already exists to be idempotent
DROP TRIGGER IF EXISTS trigger_process_ifaa_score ON public.scores;

-- 3. Create the BEFORE INSERT OR UPDATE trigger
CREATE TRIGGER trigger_process_ifaa_score
  BEFORE INSERT OR UPDATE ON public.scores
  FOR EACH ROW EXECUTE FUNCTION public.process_ifaa_score();


-- ────────────────────────────────────────────────────────────────
-- PART C: COMBINATORIAL SEED DATA FOR OFFICIAL IFAA REGULATION
-- ────────────────────────────────────────────────────────────────

-- IFAA Tournament Types
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Field Round', 28, 4, false, 'field', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Hunter Round', 28, 4, false, 'hunter', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Animal Round (2D)', 28, 3, false, 'animal_2d', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Animal Round (3D)', 28, 3, false, 'animal_3d', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA 3-D Hunting Round (1 Arrow)', 28, 1, false, '3d_hunting', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA 3-D Standard Round (2 Arrows)', 28, 2, false, '3d_standard', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Field Expert Round', 28, 4, false, 'field_expert', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Indoor Round', 6, 5, true, 'indoor_standard', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.tournament_types (name, ends_per_round, arrows_per_end, is_indoor, ifaa_round, is_system, active) VALUES ('IFAA Flint Indoor Round', 14, 4, true, 'flint_indoor', true, true) ON CONFLICT (name, club_id) DO NOTHING;

-- IFAA System Divisions
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Barebow Recurve', 'SFBB-R', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Barebow Compound', 'SFBB-C', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Freestyle Limited Recurve', 'SFFS-R', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Freestyle Limited Compound', 'SFFS-C', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Freestyle Unlimited', 'SFFU', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Bowhunter Recurve', 'SFBH-R', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Bowhunter Compound', 'SFBH-C', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Bowhunter Limited', 'SFBL', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Bowhunter Unlimited', 'SFBU', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Longbow', 'SFLB', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Traditional Recurve Bow', 'SFTR', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Female Historical Bow', 'SFHB', 65, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Barebow Recurve', 'SMBB-R', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Barebow Compound', 'SMBB-C', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Freestyle Limited Recurve', 'SMFS-R', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Freestyle Limited Compound', 'SMFS-C', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Freestyle Unlimited', 'SMFU', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Bowhunter Recurve', 'SMBH-R', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Bowhunter Compound', 'SMBH-C', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Bowhunter Limited', 'SMBL', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Bowhunter Unlimited', 'SMBU', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Longbow', 'SMLB', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Traditional Recurve Bow', 'SMTR', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Senior Male Historical Bow', 'SMHB', 65, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Barebow Recurve', 'VFBB-R', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Barebow Compound', 'VFBB-C', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Freestyle Limited Recurve', 'VFFS-R', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Freestyle Limited Compound', 'VFFS-C', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Freestyle Unlimited', 'VFFU', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Bowhunter Recurve', 'VFBH-R', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Bowhunter Compound', 'VFBH-C', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Bowhunter Limited', 'VFBL', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Bowhunter Unlimited', 'VFBU', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Longbow', 'VFLB', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Traditional Recurve Bow', 'VFTR', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Female Historical Bow', 'VFHB', 55, 64, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Barebow Recurve', 'VMBB-R', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Barebow Compound', 'VMBB-C', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Freestyle Limited Recurve', 'VMFS-R', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Freestyle Limited Compound', 'VMFS-C', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Freestyle Unlimited', 'VMFU', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Bowhunter Recurve', 'VMBH-R', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Bowhunter Compound', 'VMBH-C', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Bowhunter Limited', 'VMBL', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Bowhunter Unlimited', 'VMBU', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Longbow', 'VMLB', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Traditional Recurve Bow', 'VMTR', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Veteran Male Historical Bow', 'VMHB', 55, 64, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Barebow Recurve', 'AFBB-R', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Barebow Compound', 'AFBB-C', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Freestyle Limited Recurve', 'AFFS-R', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Freestyle Limited Compound', 'AFFS-C', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Freestyle Unlimited', 'AFFU', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Bowhunter Recurve', 'AFBH-R', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Bowhunter Compound', 'AFBH-C', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Bowhunter Limited', 'AFBL', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Bowhunter Unlimited', 'AFBU', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Longbow', 'AFLB', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Traditional Recurve Bow', 'AFTR', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Female Historical Bow', 'AFHB', 21, 54, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Barebow Recurve', 'AMBB-R', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Barebow Compound', 'AMBB-C', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Freestyle Limited Recurve', 'AMFS-R', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Freestyle Limited Compound', 'AMFS-C', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Freestyle Unlimited', 'AMFU', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Bowhunter Recurve', 'AMBH-R', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Bowhunter Compound', 'AMBH-C', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Bowhunter Limited', 'AMBL', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Bowhunter Unlimited', 'AMBU', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Longbow', 'AMLB', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Traditional Recurve Bow', 'AMTR', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Adult Male Historical Bow', 'AMHB', 21, 54, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Barebow Recurve', 'YAFBB-R', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Barebow Compound', 'YAFBB-C', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Freestyle Limited Recurve', 'YAFFS-R', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Freestyle Limited Compound', 'YAFFS-C', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Freestyle Unlimited', 'YAFFU', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Bowhunter Recurve', 'YAFBH-R', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Bowhunter Compound', 'YAFBH-C', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Bowhunter Limited', 'YAFBL', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Bowhunter Unlimited', 'YAFBU', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Longbow', 'YAFLB', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Traditional Recurve Bow', 'YAFTR', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Female Historical Bow', 'YAFHB', 17, 20, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Barebow Recurve', 'YAMBB-R', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Barebow Compound', 'YAMBB-C', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Freestyle Limited Recurve', 'YAMFS-R', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Freestyle Limited Compound', 'YAMFS-C', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Freestyle Unlimited', 'YAMFU', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Bowhunter Recurve', 'YAMBH-R', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Bowhunter Compound', 'YAMBH-C', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Bowhunter Limited', 'YAMBL', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Bowhunter Unlimited', 'YAMBU', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Longbow', 'YAMLB', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Traditional Recurve Bow', 'YAMTR', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Young Adult Male Historical Bow', 'YAMHB', 17, 20, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Barebow Recurve', 'JFBB-R', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Barebow Compound', 'JFBB-C', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Freestyle Limited Recurve', 'JFFS-R', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Freestyle Limited Compound', 'JFFS-C', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Freestyle Unlimited', 'JFFU', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Bowhunter Recurve', 'JFBH-R', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Bowhunter Compound', 'JFBH-C', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Bowhunter Limited', 'JFBL', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Bowhunter Unlimited', 'JFBU', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Longbow', 'JFLB', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Traditional Recurve Bow', 'JFTR', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Female Historical Bow', 'JFHB', 13, 16, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Barebow Recurve', 'JMBB-R', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Barebow Compound', 'JMBB-C', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Freestyle Limited Recurve', 'JMFS-R', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Freestyle Limited Compound', 'JMFS-C', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Freestyle Unlimited', 'JMFU', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Bowhunter Recurve', 'JMBH-R', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Bowhunter Compound', 'JMBH-C', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Bowhunter Limited', 'JMBL', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Bowhunter Unlimited', 'JMBU', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Longbow', 'JMLB', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Traditional Recurve Bow', 'JMTR', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Junior Male Historical Bow', 'JMHB', 13, 16, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Barebow Recurve', 'CFBB-R', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Barebow Compound', 'CFBB-C', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Freestyle Limited Recurve', 'CFFS-R', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Freestyle Limited Compound', 'CFFS-C', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Freestyle Unlimited', 'CFFU', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Bowhunter Recurve', 'CFBH-R', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Bowhunter Compound', 'CFBH-C', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Bowhunter Limited', 'CFBL', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Bowhunter Unlimited', 'CFBU', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Longbow', 'CFLB', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Traditional Recurve Bow', 'CFTR', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Female Historical Bow', 'CFHB', 0, 12, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Barebow Recurve', 'CMBB-R', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Barebow Compound', 'CMBB-C', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Freestyle Limited Recurve', 'CMFS-R', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Freestyle Limited Compound', 'CMFS-C', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Freestyle Unlimited', 'CMFU', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Bowhunter Recurve', 'CMBH-R', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Bowhunter Compound', 'CMBH-C', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Bowhunter Limited', 'CMBL', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Bowhunter Unlimited', 'CMBU', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Longbow', 'CMLB', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Traditional Recurve Bow', 'CMTR', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Cub Male Historical Bow', 'CMHB', 0, 12, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Professional Female Freestyle Unlimited', 'PFFU', 21, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Professional Female Freestyle Limited Recurve', 'PFFS-R', 21, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Professional Female Freestyle Limited Compound', 'PFFS-C', 21, 150, 'F', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Professional Male Freestyle Unlimited', 'PMFU', 21, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Professional Male Freestyle Limited Recurve', 'PMFS-R', 21, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;
INSERT INTO public.divisions (name, abbreviation, min_age, max_age, gender, is_system, active) VALUES ('Professional Male Freestyle Limited Compound', 'PMFS-C', 21, 150, 'M', true, true) ON CONFLICT (name, club_id) DO NOTHING;