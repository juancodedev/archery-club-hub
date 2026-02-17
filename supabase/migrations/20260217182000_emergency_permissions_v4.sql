-- MIGRACIÓN DE EMERGENCIA PARA PERMISOS (V4)

-- 1. Forzar Súper Administrador por UUID (obtenido del payload del usuario) y Email
-- Esto asegura que no haya pérdida por discrepancias en email
UPDATE public.members 
SET is_super_admin = true 
WHERE user_id = '59dc2143-9e7c-4d00-8704-27375dad8e79' 
   OR LOWER(TRIM(email)) = LOWER(TRIM('cl.jmunoz@gmail.com'));

-- 2. Asegurar que el rol 'authenticated' sea dueño de sus acciones
GRANT ALL ON public.divisions TO authenticated;
GRANT ALL ON public.tournament_types TO authenticated;

-- 3. Redefinir is_club_admin para ser más tolerante y rápida
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. Si es Super Admin, tiene acceso total a TODO (incluyendo registros de sistema club_id NULL)
    IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true) THEN
        RETURN true;
    END IF;

    -- 2. Si es un registro de sistema (club_id NULL) y no es super admin, no puede editar
    IF p_club_id IS NULL THEN
        RETURN false;
    END IF;

    -- 3. Si no es super admin, verificar sus roles en su club específico
    RETURN EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.members m ON m.id = mr.member_id
        WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id 
        AND mr.role::text IN ('administrador', 'presidente', 'secretaria', 'tesorero')
    );
END;
$$;

-- 4. Re-aplicar políticas de DIVISIONS simplificadas al máximo
DROP POLICY IF EXISTS "divisions_read_all" ON public.divisions;
DROP POLICY IF EXISTS "divisions_modify_policy" ON public.divisions;

CREATE POLICY "divisions_read_public" ON public.divisions
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "divisions_write_admin" ON public.divisions
    FOR ALL TO authenticated
    USING (public.is_club_admin(auth.uid(), club_id))
    WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- 5. Re-aplicar políticas de TOURNAMENT_TYPES simplificadas al máximo
DROP POLICY IF EXISTS "tournament_types_read_all" ON public.tournament_types;
DROP POLICY IF EXISTS "tournament_types_modify_policy" ON public.tournament_types;

CREATE POLICY "tournament_types_read_public" ON public.tournament_types
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "tournament_types_write_admin" ON public.tournament_types
    FOR ALL TO authenticated
    USING (public.is_club_admin(auth.uid(), club_id))
    WITH CHECK (public.is_club_admin(auth.uid(), club_id));
