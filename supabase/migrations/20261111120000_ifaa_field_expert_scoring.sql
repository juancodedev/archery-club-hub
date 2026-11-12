-- The IFAA Field Expert Round splits each Field scoring zone in two and scores
-- 5, 4, 3, 2, 1 from the centre outwards, with the X only used for ties (IFAA
-- Archer's Manual, Field Expert Round). It was validated like a Field round,
-- with 5, 4, 3 only.
--
-- Only the field_expert branch changes. The rest of the function is a copy of
-- 20261109140000_ifaa_indoor_scoring.sql, and the trigger keeps pointing at it.
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
      IF v_ifaa_round = 'indoor_standard' THEN
        -- Exactly 5 arrows
        IF jsonb_array_length(v_end) <> 5 THEN
          RAISE EXCEPTION 'En ronda Indoor, el blanco % debe tener exactamente 5 flechas.', v_end_idx;
        END IF;

        -- Valid values: X (inside the 5, counted for ties), 5 to 1, 0, M, ''
        FOR v_arrow_idx IN 0..4 LOOP
          v_val := jsonb_extract_path_text(v_end, v_arrow_idx::text);
          IF v_val IS NOT NULL AND v_val <> '' AND NOT (v_val IN ('X', '5', '4', '3', '2', '1', '0', 'M')) THEN
            RAISE EXCEPTION 'Valor de flecha inválido (% en blanco %, flecha %). Valores válidos: X, 5, 4, 3, 2, 1, M.', v_val, v_end_idx, v_arrow_idx + 1;
          END IF;
        END LOOP;

      ELSIF v_ifaa_round = 'field_expert' THEN
        -- Exactly 4 arrows
        IF jsonb_array_length(v_end) <> 4 THEN
          RAISE EXCEPTION 'En ronda Field Experto, el blanco % debe tener exactamente 4 flechas.', v_end_idx;
        END IF;

        -- Valid values: X (inside the 5, counted for ties), 5 to 1, 0, M, ''
        FOR v_arrow_idx IN 0..3 LOOP
          v_val := jsonb_extract_path_text(v_end, v_arrow_idx::text);
          IF v_val IS NOT NULL AND v_val <> '' AND NOT (v_val IN ('X', '5', '4', '3', '2', '1', '0', 'M')) THEN
            RAISE EXCEPTION 'Valor de flecha inválido (% en blanco %, flecha %). Valores válidos: X, 5, 4, 3, 2, 1, M.', v_val, v_end_idx, v_arrow_idx + 1;
          END IF;
        END LOOP;

      ELSIF v_ifaa_round IN ('field', 'hunter', 'flint_indoor') THEN
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
