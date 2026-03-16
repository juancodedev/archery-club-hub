-- NOTE: Super admin user bootstrap must be performed outside of version-controlled
-- migrations. Use the Supabase Admin API or `supabase auth` CLI with secrets stored
-- outside the repository (e.g. via environment variables or a secrets manager).
-- Do NOT insert users or credentials directly in migration files.

-- 1. Redefinir la función is_super_admin para eliminar el email hardcodeado
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = p_user_id AND is_super_admin = true
  );
$$;

-- 2. Limpiar políticas RLS que tenían el email antiguo hardcodeado
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

  RAISE NOTICE 'Migración de Superadmin completada.';
END $$;
