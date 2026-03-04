-- ARCHERY CLUB HUB - EMERGENCY REGISTRATION & MIGRATION CHECK
-- Use this script to create a club for cl.jmunoz@gmail.com and ensure essential data exists.

-- 1. Ensure core system data for divisions
INSERT INTO public.divisions (name, abbreviation, description, is_system, active) VALUES
  ('Recurvo', 'RC', 'Arco recurvo olímpico', true, true),
  ('Compuesto', 'CO', 'Arco compuesto con mira y estabilizadores', true, true),
  ('Arco Desnudo', 'BB', 'Barebow - sin mira ni estabilizadores', true, true),
  ('Longbow', 'LB', 'Arco tradicional largo', true, true),
  ('Recurvo Junior', 'RCJ', 'Arco recurvo - categoría junior', true, true),
  ('Compuesto Junior', 'COJ', 'Arco compuesto - categoría junior', true, true)
ON CONFLICT (name, club_id) DO NOTHING;

-- 2. Create the new club for cl.jmunoz@gmail.com
DO $$
DECLARE
    v_user_id UUID;
    v_club_id UUID;
    v_plan_id UUID;
    v_member_id UUID;
BEGIN
    -- Get User ID
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'cl.jmunoz@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User cl.jmunoz@gmail.com not found in auth.users. Please sign up or check the email.';
        RETURN;
    END IF;

    -- Check if it already has a club (to avoid duplicates if already partially created)
    IF EXISTS (SELECT 1 FROM public.members WHERE user_id = v_user_id) THEN
        RAISE NOTICE 'User cl.jmunoz@gmail.com already has a member entry. Checking if it has an associated club...';
        SELECT club_id INTO v_club_id FROM public.members WHERE user_id = v_user_id LIMIT 1;
        
        IF v_club_id IS NOT NULL THEN
             RAISE NOTICE 'User already associated with club ID: %. No new club created.', v_club_id;
             -- Ensure they are admin just in case
             SELECT id INTO v_member_id FROM public.members WHERE user_id = v_user_id AND club_id = v_club_id;
             INSERT INTO public.member_roles (member_id, club_id, role)
             VALUES (v_member_id, v_club_id, 'administrador')
             ON CONFLICT DO NOTHING;
             RETURN;
        END IF;
    END IF;

    -- Get a default plan if exists
    SELECT id INTO v_plan_id FROM public.plans LIMIT 1;

    -- Register the club
    v_club_id := public.register_club(
        'Mi Nuevo Club de Arquería', 
        'Santiago', 
        'Chile', 
        'cl.jmunoz@gmail.com', 
        'Juan Muñoz', 
        v_user_id, 
        v_plan_id
    );

    RAISE NOTICE 'SUCCESS: Club created with ID: %', v_club_id;
    RAISE NOTICE 'User cl.jmunoz@gmail.com is now an administrator of this club.';
END $$;
