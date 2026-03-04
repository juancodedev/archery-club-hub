-- 1. Crear el usuario en auth.users si no existe
DO $$
DECLARE
  new_user_id UUID;
  default_club_id UUID;
BEGIN
  -- Verificar si el usuario ya existe en auth.users
  SELECT id INTO new_user_id FROM auth.users WHERE email = 'jmunoz@juancode.dev';

  IF new_user_id IS NULL THEN
    -- Insertar en auth.users
    INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'jmunoz@juancode.dev',
      crypt('SuperAdmin2024*', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO new_user_id;
    RAISE NOTICE 'Usuario auth.users creado: %', new_user_id;
  ELSE
    RAISE NOTICE 'Usuario auth.users ya existe: %', new_user_id;
  END IF;

  -- 2. Asegurar que esté en public.members
  -- Primero buscamos un club existente para evitar el error de NOT NULL en club_id
  SELECT id INTO default_club_id FROM public.clubs LIMIT 1;

  IF EXISTS (SELECT 1 FROM public.members WHERE email = 'jmunoz@juancode.dev') THEN
    UPDATE public.members 
    SET is_super_admin = true, user_id = new_user_id
    WHERE email = 'jmunoz@juancode.dev';
    RAISE NOTICE 'Usuario actualizado en public.members';
  ELSE
    IF default_club_id IS NULL THEN
       -- Si no hay clubes, creamos uno de sistema para que la app no rompa
       INSERT INTO public.clubs (name, city, country) 
       VALUES ('Club Central', 'Santiago', 'Chile') 
       RETURNING id INTO default_club_id;
    END IF;

    INSERT INTO public.members (user_id, club_id, email, full_name, is_super_admin, status)
    VALUES (new_user_id, default_club_id, 'jmunoz@juancode.dev', 'Super Admin', true, 'activo');
    RAISE NOTICE 'Usuario insertado en public.members asociado al club %', default_club_id;
  END IF;

  -- 3. Quitar privilegios al usuario antiguo
  UPDATE public.members 
  SET is_super_admin = false 
  WHERE email = 'cl.jmunoz@gmail.com';

END $$;

-- 4. Redefinir la función is_super_admin para eliminar el email hardcodeado
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = p_user_id AND is_super_admin = true
  );
$$;

-- 4. Limpiar políticas RLS que tenían el email antiguo hardcodeado
-- Solo si las tablas existen
DO $$
BEGIN
  -- Tabla: system_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings') THEN
    DROP POLICY IF EXISTS "SuperAdmin system settings all" ON public.system_settings;
    EXECUTE 'CREATE POLICY "SuperAdmin system settings all" ON public.system_settings FOR ALL USING ( public.is_super_admin(auth.uid()) )';
    RAISE NOTICE 'Política system_settings actualizada';
  ELSE
    RAISE NOTICE 'Tabla system_settings no existe, se omite';
  END IF;

  -- Tabla: contact_requests
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_requests') THEN
    DROP POLICY IF EXISTS "Club admins can see own contact requests" ON public.contact_requests;
    EXECUTE 'CREATE POLICY "Club admins can see own contact requests" ON public.contact_requests FOR SELECT USING ( public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()) )';

    DROP POLICY IF EXISTS "SuperAdmin all contact requests" ON public.contact_requests;
    EXECUTE 'CREATE POLICY "SuperAdmin all contact requests" ON public.contact_requests FOR ALL USING ( public.is_super_admin(auth.uid()) )';
    RAISE NOTICE 'Políticas contact_requests actualizadas';
  ELSE
    RAISE NOTICE 'Tabla contact_requests no existe, se omite';
  END IF;

  RAISE NOTICE 'Migración de Superadmin completada. Nuevo admin: jmunoz@juancode.dev';
END $$;
