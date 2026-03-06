-- ============================================================
-- PERMISSIONS HARDENING v1.1
-- ============================================================

-- 1. Schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. Tables and Views
-- Granting to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Granting to anon (Ready only as needed)
GRANT SELECT ON public.plans TO anon;
GRANT SELECT ON public.clubs TO anon;
GRANT SELECT ON public.system_settings TO anon;

-- Extra hardening for service_role just in case
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 3. Default privileges for FUTURE tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated, service_role;

-- 4. Specific fix for RLS bypass in functions
ALTER FUNCTION public.is_super_admin(UUID) SECURITY DEFINER;
ALTER FUNCTION public.is_club_admin(UUID, UUID) SECURITY DEFINER;
ALTER FUNCTION public.has_club_role(UUID, UUID, TEXT) SECURITY DEFINER;

-- 5. Reload cache
NOTIFY pgrst, 'reload schema';
