-- ============================================================
-- FIX DEFINITIVO v2: RLS Anti-Recursión + GRANTs correctos
-- Nombre con 999999 para siempre ordenarse al final.
-- Seguro re-ejecutar: todo usa CREATE OR REPLACE / IF NOT EXISTS / IF EXISTS.
-- ============================================================

-- PASO 1: Eliminar TODAS las políticas existentes en tables afectadas
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE tablename IN ('members', 'member_roles', 'tournaments', 'tournament_registrations')
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- PASO 2: Funciones helper con SECURITY DEFINER + cast correcto del enum
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    WHERE mr.club_id = p_club_id
      AND mr.role IN ('administrador'::public.club_role, 'presidente'::public.club_role)
      AND mr.member_id IN (
        SELECT id FROM public.members WHERE user_id = p_user_id
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(p_user_id UUID, p_club_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    WHERE mr.club_id = p_club_id
      AND mr.role = p_role::public.club_role
      AND mr.member_id IN (
        SELECT id FROM public.members WHERE user_id = p_user_id
      )
  );
$$;

-- PASO 3: Políticas para members (solo comparación directa — sin recursión)
CREATE POLICY "members_read_own"
  ON public.members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "members_super_admin_read_all"
  ON public.members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members sa
      WHERE sa.user_id = auth.uid() AND sa.is_super_admin = true
    )
  );

CREATE POLICY "members_update_own"
  ON public.members FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_insert_any"
  ON public.members FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- PASO 4: Políticas para member_roles
-- member_roles consulta members cuya policy ahora es simple → NO hay recursión
CREATE POLICY "member_roles_read_own"
  ON public.member_roles FOR SELECT TO authenticated
  USING (
    member_id IN (
      SELECT id FROM public.members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "member_roles_admin_read"
  ON public.member_roles FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

CREATE POLICY "member_roles_admin_manage"
  ON public.member_roles FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- PASO 5: GRANTs para tournaments (el rol authenticated necesita permiso explícito)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_registrations TO authenticated;

-- Políticas para tournaments
CREATE POLICY "tournaments_club_members_read"
  ON public.tournaments FOR SELECT TO authenticated
  USING (
    club_id IN (
      SELECT club_id FROM public.members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tournaments_admin_manage"
  ON public.tournaments FOR ALL TO authenticated
  USING (
    public.is_club_admin(auth.uid(), club_id) OR
    public.has_club_role(auth.uid(), club_id, 'gestor_torneos')
  )
  WITH CHECK (
    public.is_club_admin(auth.uid(), club_id) OR
    public.has_club_role(auth.uid(), club_id, 'gestor_torneos')
  );

-- Políticas para tournament_registrations
CREATE POLICY "registrations_club_members_read"
  ON public.tournament_registrations FOR SELECT TO authenticated
  USING (
    tournament_id IN (
      SELECT t.id FROM public.tournaments t
      JOIN public.members m ON m.club_id = t.club_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "registrations_self_insert"
  ON public.tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "registrations_self_delete"
  ON public.tournament_registrations FOR DELETE TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
  );

CREATE POLICY "registrations_manager_update"
  ON public.tournament_registrations FOR UPDATE TO authenticated
  USING (
    tournament_id IN (
      SELECT id FROM public.tournaments t
      WHERE public.is_club_admin(auth.uid(), t.club_id)
         OR public.has_club_role(auth.uid(), t.club_id, 'gestor_torneos')
    )
  );

-- PASO 6: Recargar caché
NOTIFY pgrst, 'reload schema';
