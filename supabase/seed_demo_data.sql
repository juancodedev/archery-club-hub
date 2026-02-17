-- ARCHERY CLUB HUB - ADDITIVE DEMO DATA SEED SCRIPT
-- This script adds fictitious data while respecting existing records.
-- It uses existence checks to avoid duplicate clubs or members.

DO $$
DECLARE
    club_maestra_id UUID;
    club_halcones_id UUID;
    
    member_admin_maestra_id UUID;
    member_tesorero_maestra_id UUID;
    member_coach_maestra_id UUID;
    member_archer1_maestra_id UUID;
    member_archer2_maestra_id UUID;
    member_archer3_maestra_id UUID;
    
    member_admin_halcones_id UUID;
    member_archer1_halcones_id UUID;
BEGIN
    -- 1. CREATE CLUBS (Using ON CONFLICT or checking existence)
    INSERT INTO public.clubs (name, city, country, contact_email, inscription_fee, monthly_fee)
    VALUES ('Flecha Maestra Archery Club', 'Santiago', 'Chile', 'contacto@flechamaestra.com', 25000, 35000)
    ON CONFLICT (contact_email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO club_maestra_id;

    INSERT INTO public.clubs (name, city, country, contact_email, inscription_fee, monthly_fee)
    VALUES ('Los Halcones Arqueros', 'Viña del Mar', 'Chile', 'info@halcones.com', 20000, 30000)
    ON CONFLICT (contact_email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO club_halcones_id;

    -- 2. CREATE MEMBERS (Checking by email per club to be safe)
    -- Club 1
    LOOP
        INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
        SELECT club_maestra_id, 'Juan Pérez', 'admin@flechamaestra.com', 'activo', CURRENT_DATE - INTERVAL '1 year'
        WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'admin@flechamaestra.com' AND club_id = club_maestra_id)
        RETURNING id INTO member_admin_maestra_id;
        
        IF member_admin_maestra_id IS NULL THEN
            SELECT id INTO member_admin_maestra_id FROM public.members WHERE email = 'admin@flechamaestra.com' AND club_id = club_maestra_id;
        END IF;
        EXIT;
    END LOOP;

    LOOP
        INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
        SELECT club_maestra_id, 'María García', 'finanzas@flechamaestra.com', 'activo', CURRENT_DATE - INTERVAL '10 months'
        WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'finanzas@flechamaestra.com' AND club_id = club_maestra_id)
        RETURNING id INTO member_tesorero_maestra_id;
        
        IF member_tesorero_maestra_id IS NULL THEN
            SELECT id INTO member_tesorero_maestra_id FROM public.members WHERE email = 'finanzas@flechamaestra.com' AND club_id = club_maestra_id;
        END IF;
        EXIT;
    END LOOP;

    LOOP
        INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
        SELECT club_maestra_id, 'Roberto Rojas', 'coach@flechamaestra.com', 'activo', CURRENT_DATE - INTERVAL '8 months'
        WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'coach@flechamaestra.com' AND club_id = club_maestra_id)
        RETURNING id INTO member_coach_maestra_id;
        
        IF member_coach_maestra_id IS NULL THEN
            SELECT id INTO member_coach_maestra_id FROM public.members WHERE email = 'coach@flechamaestra.com' AND club_id = club_maestra_id;
        END IF;
        EXIT;
    END LOOP;

    -- Adding simple archers for Club 1
    -- Archer 1
    INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
    SELECT club_maestra_id, 'Pedro Alarcón', 'pedro@gmail.com', 'activo', CURRENT_DATE - INTERVAL '6 months'
    WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'pedro@gmail.com' AND club_id = club_maestra_id)
    RETURNING id INTO member_archer1_maestra_id;
    IF member_archer1_maestra_id IS NULL THEN SELECT id INTO member_archer1_maestra_id FROM public.members WHERE email = 'pedro@gmail.com' AND club_id = club_maestra_id; END IF;

    -- Archer 2
    INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
    SELECT club_maestra_id, 'Ana Silva', 'ana@outlook.com', 'activo', CURRENT_DATE - INTERVAL '4 months'
    WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'ana@outlook.com' AND club_id = club_maestra_id)
    RETURNING id INTO member_archer2_maestra_id;
    IF member_archer2_maestra_id IS NULL THEN SELECT id INTO member_archer2_maestra_id FROM public.members WHERE email = 'ana@outlook.com' AND club_id = club_maestra_id; END IF;

    -- Archer 3
    INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
    SELECT club_maestra_id, 'Luis Martínez', 'luis@yahoo.com', 'activo', CURRENT_DATE - INTERVAL '2 months'
    WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'luis@yahoo.com' AND club_id = club_maestra_id)
    RETURNING id INTO member_archer3_maestra_id;
    IF member_archer3_maestra_id IS NULL THEN SELECT id INTO member_archer3_maestra_id FROM public.members WHERE email = 'luis@yahoo.com' AND club_id = club_maestra_id; END IF;

    -- Club 2 Member
    INSERT INTO public.members (club_id, full_name, email, status, enrollment_date)
    SELECT club_halcones_id, 'Carlos Martínez', 'admin@halcones.com', 'activo', CURRENT_DATE - INTERVAL '5 months'
    WHERE NOT EXISTS (SELECT 1 FROM public.members WHERE email = 'admin@halcones.com' AND club_id = club_halcones_id)
    RETURNING id INTO member_admin_halcones_id;
    IF member_admin_halcones_id IS NULL THEN SELECT id INTO member_admin_halcones_id FROM public.members WHERE email = 'admin@halcones.com' AND club_id = club_halcones_id; END IF;


    -- 3. ASSIGN ROLES (Avoiding duplicates with ON CONFLICT)
    -- Club 1
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_admin_maestra_id, club_maestra_id, 'administrador') ON CONFLICT DO NOTHING;
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_tesorero_maestra_id, club_maestra_id, 'tesorero') ON CONFLICT DO NOTHING;
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_coach_maestra_id, club_maestra_id, 'entrenador') ON CONFLICT DO NOTHING;
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_archer1_maestra_id, club_maestra_id, 'arquero') ON CONFLICT DO NOTHING;
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_archer2_maestra_id, club_maestra_id, 'arquero') ON CONFLICT DO NOTHING;
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_archer3_maestra_id, club_maestra_id, 'arquero') ON CONFLICT DO NOTHING;

    -- Club 2
    INSERT INTO public.member_roles (member_id, club_id, role) VALUES (member_admin_halcones_id, club_halcones_id, 'administrador') ON CONFLICT DO NOTHING;

    -- 4. FINANCIAL ENTRIES (Additive: Only if they don't exist in same date/amount)
    -- Using a simplified check
    IF NOT EXISTS (SELECT 1 FROM public.financial_entries WHERE club_id = club_maestra_id AND amount = 35000 AND description = 'Cuota Enero - Pedro') THEN
        INSERT INTO public.financial_entries (club_id, type, category, amount, description, entry_date)
        VALUES (club_maestra_id, 'income', 'Cuota Mensual', 35000, 'Cuota Enero - Pedro', CURRENT_DATE - INTERVAL '1 month');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.financial_entries WHERE club_id = club_maestra_id AND amount = 200000 AND description = 'Pago mensual recinto') THEN
        INSERT INTO public.financial_entries (club_id, type, category, amount, description, entry_date)
        VALUES (club_maestra_id, 'expense', 'Alquiler', 200000, 'Pago mensual recinto', CURRENT_DATE - INTERVAL '1 month');
    END IF;

    -- 5. TRAINING SESSIONS & SCORES
    DECLARE
        v_session_id UUID;
    BEGIN
        -- Add session if not exists today for this club
        SELECT id INTO v_session_id FROM public.training_sessions WHERE club_id = club_maestra_id AND name = 'Entrenamiento Técnico' AND event_date = CURRENT_DATE - INTERVAL '2 days';
        
        IF v_session_id IS NULL THEN
            INSERT INTO public.training_sessions (club_id, name, event_date, division, target_type, created_by)
            VALUES (club_maestra_id, 'Entrenamiento Técnico', CURRENT_DATE - INTERVAL '2 days', 'Recurvo Senior', '80cm', member_coach_maestra_id)
            RETURNING id INTO v_session_id;

            -- Only insert scores if we just created the session
            INSERT INTO public.scores (member_id, club_id, training_session_id, score_date, division, target_type, total_score, ends)
            VALUES 
                (member_archer1_maestra_id, club_maestra_id, v_session_id, CURRENT_DATE - INTERVAL '2 days', 'Recurvo Senior', '80cm', 285, '[{"score": 28, "arrows": [10, 9, 9]}, {"score": 29, "arrows": [10, 10, 9]}]'::jsonb),
                (member_archer2_maestra_id, club_maestra_id, v_session_id, CURRENT_DATE - INTERVAL '2 days', 'Recurvo Senior', '80cm', 270, '[{"score": 25, "arrows": [9, 8, 8]}, {"score": 27, "arrows": [9, 9, 9]}]'::jsonb);
        END IF;
    END;

    RAISE NOTICE 'Demo data successfully verified/added for clubs: %, %', club_maestra_id, club_halcones_id;
END $$;
