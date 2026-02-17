-- MIGRACIÓN FINAL DE CORRECCIÓN DE PERMISOS (RLS + GRANTS + ROLES)

-- 1. Asegurar que el usuario sea Super Admin (basado en email)
UPDATE public.members 
SET is_super_admin = true 
WHERE email = 'cl.jmunoz@gmail.com';

-- 2. Función is_club_admin ultra-robusta (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    is_super BOOLEAN;
BEGIN
    -- Verificar si es super admin primero (independiente del club)
    SELECT m.is_super_admin INTO is_super 
    FROM public.members m 
    WHERE m.user_id = p_user_id 
    LIMIT 1;

    IF is_super = true THEN
        RETURN true;
    END IF;

    -- Si p_club_id es NULL (registro del sistema), solo super admins (ya checkeado) pueden editar
    IF p_club_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar roles en el club específico
    RETURN EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.members m ON m.id = mr.member_id
        WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id 
        AND mr.role::text IN ('administrador', 'presidente', 'secretaria', 'tesorero')
    );
END;
$$;

-- 3. GRANTS Explícitos para el rol authenticated (Error 42501 preventivo)
GRANT ALL ON public.divisions TO authenticated, service_role;
GRANT ALL ON public.tournament_types TO authenticated, service_role;
GRANT ALL ON public.member_divisions TO authenticated, service_role;
GRANT ALL ON public.division_change_notifications TO authenticated, service_role;

-- 4. Re-creación limpia de políticas para DIVISIONS
DROP POLICY IF EXISTS "divisions_read_policy" ON public.divisions;
DROP POLICY IF EXISTS "divisions_admin_policy" ON public.divisions;

CREATE POLICY "divisions_read_all" ON public.divisions
    FOR SELECT TO authenticated
    USING (true); -- Permitir ver todas para que el selector funcione

CREATE POLICY "divisions_modify_policy" ON public.divisions
    FOR ALL TO authenticated
    USING (is_club_admin(auth.uid(), club_id))
    WITH CHECK (is_club_admin(auth.uid(), club_id));

-- 5. Re-creación limpia de políticas para TOURNAMENT_TYPES
DROP POLICY IF EXISTS "tournament_types_read_policy" ON public.tournament_types;
DROP POLICY IF EXISTS "tournament_types_admin_policy" ON public.tournament_types;

CREATE POLICY "tournament_types_read_all" ON public.tournament_types
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "tournament_types_modify_policy" ON public.tournament_types
    FOR ALL TO authenticated
    USING (is_club_admin(auth.uid(), club_id))
    WITH CHECK (is_club_admin(auth.uid(), club_id));

-- 6. Notificaciones (Corrección de acceso)
DROP POLICY IF EXISTS "notifications_read_access" ON public.division_change_notifications;
DROP POLICY IF EXISTS "notifications_admin_access" ON public.division_change_notifications;

CREATE POLICY "notifications_read" ON public.division_change_notifications
    FOR SELECT TO authenticated
    USING (
        member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.members m 
            WHERE m.id = division_change_notifications.member_id 
            AND public.is_club_admin(auth.uid(), m.club_id)
        )
    );

CREATE POLICY "notifications_all" ON public.division_change_notifications
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members m 
            WHERE m.id = division_change_notifications.member_id 
            AND public.is_club_admin(auth.uid(), m.club_id)
        )
    );
