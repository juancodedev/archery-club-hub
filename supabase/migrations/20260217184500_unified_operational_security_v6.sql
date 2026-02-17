-- MIGRACIÓN DE UNIFICACIÓN DE SEGURIDAD OPERATIVA (V6)
-- Basada en el análisis de roles y la importancia del registro en 'members'

-- 1. Redefinir has_club_role de forma ultra-robusta (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_club_role(p_user_id UUID, p_club_id UUID, p_role text)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Los Super Admins tienen virtualmente todos los roles
    IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true) THEN
        RETURN true;
    END IF;

    -- Verificar rol específico en el club
    RETURN EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.members m ON m.id = mr.member_id
        WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id 
        AND mr.role::text = p_role
    );
END;
$$;

-- Sobrecarga para el tipo enum club_role si es necesario
CREATE OR REPLACE FUNCTION public.has_club_role(p_user_id UUID, p_club_id UUID, p_role public.club_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT public.has_club_role(p_user_id, p_club_id, p_role::text);
$$;

-- 2. Refuerzo de políticas para CLUBS (Gestión de configuración del club)
DROP POLICY IF EXISTS "Admin can update clubs" ON public.clubs;
DROP POLICY IF EXISTS "Super admin can do everything on clubs" ON public.clubs;

CREATE POLICY "clubs_admin_update" ON public.clubs
    FOR UPDATE TO authenticated
    USING (public.is_club_admin(auth.uid(), id));

CREATE POLICY "clubs_super_admin_all" ON public.clubs
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.members WHERE user_id = auth.uid() AND is_super_admin = true));

-- 3. Refuerzo de políticas para MEMBERS (Gestión de arqueros y personal)
DROP POLICY IF EXISTS "Users can update own data or admin" ON public.members;
DROP POLICY IF EXISTS "Super admin can update all members" ON public.members;
DROP POLICY IF EXISTS "Super admin can see all members" ON public.members;

CREATE POLICY "members_select_policy" ON public.members
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR public.is_club_admin(auth.uid(), club_id)
        -- Permitir que miembros del mismo club se vean entre sí (opcional, según requerimiento)
        -- OR club_id IN (SELECT club_id FROM public.members WHERE user_id = auth.uid())
    );

CREATE POLICY "members_modify_policy" ON public.members
    FOR ALL TO authenticated
    USING (
        user_id = auth.uid() 
        OR public.is_club_admin(auth.uid(), club_id)
    );

-- 4. Refuerzo de políticas para SCORES (Auditoría de puntajes)
DROP POLICY IF EXISTS "Users can manage own scores" ON public.scores;
DROP POLICY IF EXISTS "Super admin can read all scores" ON public.scores;

CREATE POLICY "scores_select_policy" ON public.scores
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.members m WHERE m.id = scores.member_id AND m.user_id = auth.uid())
        OR public.is_club_admin(auth.uid(), club_id)
    );

CREATE POLICY "scores_modify_policy" ON public.scores
    FOR ALL TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.members m WHERE m.id = scores.member_id AND m.user_id = auth.uid())
        OR public.is_club_admin(auth.uid(), club_id)
    );

-- 5. Refuerzo de políticas para TRAINING_SESSIONS
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.training_sessions;
DROP POLICY IF EXISTS "Admin or entrenador can create sessions" ON public.training_sessions;

CREATE POLICY "training_sessions_select" ON public.training_sessions
    FOR SELECT TO authenticated
    USING (true); -- Generalmente público para miembros

CREATE POLICY "training_sessions_modify" ON public.training_sessions
    FOR ALL TO authenticated
    USING (
        public.is_club_admin(auth.uid(), club_id) 
        OR public.has_club_role(auth.uid(), club_id, 'entrenador')
    );

-- 6. Refuerzo de políticas para MEMBER_ROLES (Gestión de staff del club)
DROP POLICY IF EXISTS "Read own or admin reads club roles" ON public.member_roles;
DROP POLICY IF EXISTS "Registration can insert roles" ON public.member_roles;
DROP POLICY IF EXISTS "Admin can manage roles" ON public.member_roles;

CREATE POLICY "member_roles_select" ON public.member_roles
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_roles.member_id AND m.user_id = auth.uid())
        OR public.is_club_admin(auth.uid(), club_id)
    );

CREATE POLICY "member_roles_all_admin" ON public.member_roles
    FOR ALL TO authenticated
    USING (public.is_club_admin(auth.uid(), club_id))
    WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- 7. Asegurar GRANTS para el funcionamiento de RLS
GRANT ALL ON public.members TO authenticated;
GRANT ALL ON public.member_roles TO authenticated;
GRANT ALL ON public.clubs TO authenticated;
GRANT ALL ON public.scores TO authenticated;
GRANT ALL ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_enrollments TO authenticated;
GRANT ALL ON public.member_invitations TO authenticated;
