-- Migración para corregir políticas RLS y soporte para Super Admins

-- 1. Actualizar funciones de validación de roles para incluir Super Admins
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members m 
    LEFT JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.user_id = p_user_id 
    AND (
      m.is_super_admin = true  -- Soporte para super admins
      OR (
        mr.club_id = p_club_id 
        AND mr.role::text IN ('administrador', 'presidente', 'secretaria', 'tesorero')
      )
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(p_user_id UUID, p_club_id UUID, p_role public.club_role)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.members m 
    LEFT JOIN public.member_roles mr ON mr.member_id = m.id
    WHERE m.user_id = p_user_id 
    AND (
      m.is_super_admin = true -- Los super admins tienen todos los roles
      OR (
        mr.club_id = p_club_id 
        AND mr.role = p_role
      )
    )
  );
END;
$$;

-- 2. Limpiar y recrear políticas para DIVISIONS
DROP POLICY IF EXISTS "authenticated_read_divisions" ON public.divisions;
DROP POLICY IF EXISTS "admin_manage_divisions" ON public.divisions;
DROP POLICY IF EXISTS "Anyone can read system divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admin can create club divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admin can update club divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admin can delete club divisions" ON public.divisions;

CREATE POLICY "divisions_read_policy" ON public.divisions
  FOR SELECT TO authenticated
  USING (
    is_system = true 
    OR club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.user_id = auth.uid() AND m.club_id = divisions.club_id
    )
  );

CREATE POLICY "divisions_admin_policy" ON public.divisions
  FOR ALL TO authenticated
  USING (is_club_admin(auth.uid(), club_id))
  WITH CHECK (is_club_admin(auth.uid(), club_id));

-- 3. Limpiar y recrear políticas para TOURNAMENT_TYPES
DROP POLICY IF EXISTS "authenticated_read_tournament_types" ON public.tournament_types;
DROP POLICY IF EXISTS "admin_manage_tournament_types" ON public.tournament_types;
DROP POLICY IF EXISTS "Anyone can read system tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Admin can create club tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Admin can update club tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Admin can delete club tournament types" ON public.tournament_types;

CREATE POLICY "tournament_types_read_policy" ON public.tournament_types
  FOR SELECT TO authenticated
  USING (
    is_system = true 
    OR club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.user_id = auth.uid() AND m.club_id = tournament_types.club_id
    )
  );

CREATE POLICY "tournament_types_admin_policy" ON public.tournament_types
  FOR ALL TO authenticated
  USING (is_club_admin(auth.uid(), club_id))
  WITH CHECK (is_club_admin(auth.uid(), club_id));

-- 4. Limpiar y recrear políticas para DIVISION_CHANGE_NOTIFICATIONS
DROP POLICY IF EXISTS "Members can read own division notifications" ON public.division_change_notifications;
DROP POLICY IF EXISTS "Admin can manage division notifications" ON public.division_change_notifications;

CREATE POLICY "notifications_read_policy" ON public.division_change_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.id = division_change_notifications.member_id 
      AND public.is_club_admin(auth.uid(), m.club_id)
    )
  );

CREATE POLICY "notifications_admin_policy" ON public.division_change_notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.id = member_id 
      AND public.is_club_admin(auth.uid(), m.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.id = member_id 
      AND public.is_club_admin(auth.uid(), m.club_id)
    )
  );

-- 5. Asegurar políticas de MEMBER_DIVISIONS
DROP POLICY IF EXISTS "authenticated_read_own_member_divisions" ON public.member_divisions;
DROP POLICY IF EXISTS "admin_manage_member_divisions" ON public.member_divisions;
DROP POLICY IF EXISTS "Members can read own divisions" ON public.member_divisions;
DROP POLICY IF EXISTS "Admin can manage member divisions" ON public.member_divisions;

CREATE POLICY "member_divisions_read_policy" ON public.member_divisions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.members m 
      JOIN public.members m2 ON m2.id = member_divisions.member_id
      WHERE m.user_id = auth.uid() 
      AND public.is_club_admin(auth.uid(), m2.club_id)
    )
  );

CREATE POLICY "member_divisions_admin_policy" ON public.member_divisions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m2 
      WHERE m2.id = member_divisions.member_id
      AND public.is_club_admin(auth.uid(), m2.club_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m2 
      WHERE m2.id = member_divisions.member_id
      AND public.is_club_admin(auth.uid(), m2.club_id)
    )
  );
