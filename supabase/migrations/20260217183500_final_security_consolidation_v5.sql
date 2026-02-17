-- MIGRACIÓN DE CONSOLIDACIÓN DEFINITIVA DE PERMISOS (V5)

-- 1. Asegurar Súper Administrador (Cualquier variación de email o UUID conocido)
UPDATE public.members 
SET is_super_admin = true 
WHERE LOWER(TRIM(email)) = 'cl.jmunoz@gmail.com'
   OR user_id = '59dc2143-9e7c-4d00-8704-27375dad8e79';

-- 2. Limpieza TOTAL de políticas previas (para evitar conflictos de "AND/OR" entre ellas)
DO $$
BEGIN
    -- Divisions
    DROP POLICY IF EXISTS "Anyone can read system divisions" ON public.divisions;
    DROP POLICY IF EXISTS "Admin can create club divisions" ON public.divisions;
    DROP POLICY IF EXISTS "Admin can update club divisions" ON public.divisions;
    DROP POLICY IF EXISTS "Admin can delete club divisions" ON public.divisions;
    DROP POLICY IF EXISTS "authenticated_read_divisions" ON public.divisions;
    DROP POLICY IF EXISTS "admin_manage_divisions" ON public.divisions;
    DROP POLICY IF EXISTS "divisions_read_policy" ON public.divisions;
    DROP POLICY IF EXISTS "divisions_admin_policy" ON public.divisions;
    DROP POLICY IF EXISTS "divisions_read_public" ON public.divisions;
    DROP POLICY IF EXISTS "divisions_write_admin" ON public.divisions;
    DROP POLICY IF EXISTS "divisions_read_all" ON public.divisions;
    DROP POLICY IF EXISTS "divisions_modify_policy" ON public.divisions;

    -- Tournament Types
    DROP POLICY IF EXISTS "Anyone can read system tournament types" ON public.tournament_types;
    DROP POLICY IF EXISTS "Admin can create club tournament types" ON public.tournament_types;
    DROP POLICY IF EXISTS "Admin can update club tournament types" ON public.tournament_types;
    DROP POLICY IF EXISTS "Admin can delete club tournament types" ON public.tournament_types;
    DROP POLICY IF EXISTS "authenticated_read_tournament_types" ON public.tournament_types;
    DROP POLICY IF EXISTS "admin_manage_tournament_types" ON public.tournament_types;
    DROP POLICY IF EXISTS "tournament_types_read_policy" ON public.tournament_types;
    DROP POLICY IF EXISTS "tournament_types_admin_policy" ON public.tournament_types;
    DROP POLICY IF EXISTS "tournament_types_read_public" ON public.tournament_types;
    DROP POLICY IF EXISTS "tournament_types_write_admin" ON public.tournament_types;

    -- Member Divisions
    DROP POLICY IF EXISTS "Members can read own divisions" ON public.member_divisions;
    DROP POLICY IF EXISTS "Admin can manage member divisions" ON public.member_divisions;
    DROP POLICY IF EXISTS "authenticated_read_own_member_divisions" ON public.member_divisions;
    DROP POLICY IF EXISTS "admin_manage_member_divisions" ON public.member_divisions;
    DROP POLICY IF EXISTS "member_divisions_read_policy" ON public.member_divisions;
    DROP POLICY IF EXISTS "member_divisions_admin_policy" ON public.member_divisions;

    -- Notifications
    DROP POLICY IF EXISTS "Members can read own division notifications" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "Admin can manage division notifications" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "notifications_read_policy" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "notifications_admin_policy" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "notifications_read_access" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "notifications_admin_access" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "notifications_read" ON public.division_change_notifications;
    DROP POLICY IF EXISTS "notifications_all" ON public.division_change_notifications;
END
$$;

-- 3. GRANTS universales (Error 42501 preventivo)
GRANT ALL ON public.divisions TO authenticated, service_role, anon;
GRANT ALL ON public.tournament_types TO authenticated, service_role, anon;
GRANT ALL ON public.member_divisions TO authenticated, service_role;
GRANT ALL ON public.division_change_notifications TO authenticated, service_role;

-- 4. POLÍTICAS UNIFICADAS Y PRECISAS

-- DIVISIONS
CREATE POLICY "divisions_select" ON public.divisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "divisions_all_admin" ON public.divisions FOR ALL TO authenticated 
    USING (public.is_club_admin(auth.uid(), club_id))
    WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- TOURNAMENT_TYPES
CREATE POLICY "tournament_types_select" ON public.tournament_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournament_types_all_admin" ON public.tournament_types FOR ALL TO authenticated 
    USING (public.is_club_admin(auth.uid(), club_id))
    WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- MEMBER_DIVISIONS
CREATE POLICY "member_divisions_select" ON public.member_divisions FOR SELECT TO authenticated 
    USING (
        member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_divisions.member_id AND public.is_club_admin(auth.uid(), m.club_id))
    );
CREATE POLICY "member_divisions_all_admin" ON public.member_divisions FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_divisions.member_id AND public.is_club_admin(auth.uid(), m.club_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_divisions.member_id AND public.is_club_admin(auth.uid(), m.club_id)));

-- NOTIFICATIONS
CREATE POLICY "notifications_select" ON public.division_change_notifications FOR SELECT TO authenticated 
    USING (
        member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = division_change_notifications.member_id AND public.is_club_admin(auth.uid(), m.club_id))
    );
CREATE POLICY "notifications_all_admin" ON public.division_change_notifications FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.members m WHERE m.id = division_change_notifications.member_id AND public.is_club_admin(auth.uid(), m.club_id)))
    WITH CHECK (EXISTS (SELECT 1 FROM public.members m WHERE m.id = division_change_notifications.member_id AND public.is_club_admin(auth.uid(), m.club_id)));

-- 5. Función is_club_admin optimizada para el club_id NULL (Sistema)
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Super Admin tiene permiso para TODO (inclusive lo que tiene club_id NULL)
    IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true) THEN
        RETURN true;
    END IF;

    -- Si no es super admin y el recurso es del SISTEMA (club_id NULL), NO tiene permiso de escritura
    IF p_club_id IS NULL THEN
        RETURN false;
    END IF;

    -- Verificar roles administrativos en el club del recurso
    RETURN EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.members m ON m.id = mr.member_id
        WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id 
        AND mr.role::text IN ('administrador', 'presidente', 'secretaria', 'tesorero')
    );
END;
$$;
