-- Corrección de políticas RLS para divisions y tournament_types
-- Las políticas anteriores eran demasiado restrictivas

-- Eliminar políticas antiguas de divisions
DROP POLICY IF EXISTS "Anyone can read system divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admin can create club divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admin can update club divisions" ON public.divisions;
DROP POLICY IF EXISTS "Admin can delete club divisions" ON public.divisions;

-- Eliminar políticas antiguas de tournament_types
DROP POLICY IF EXISTS "Anyone can read system tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Admin can create club tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Admin can update club tournament types" ON public.tournament_types;
DROP POLICY IF EXISTS "Admin can delete club tournament types" ON public.tournament_types;

-- Eliminar políticas antiguas de member_divisions
DROP POLICY IF EXISTS "Members can read own divisions" ON public.member_divisions;
DROP POLICY IF EXISTS "Admin can manage member divisions" ON public.member_divisions;

-- =====================================================
-- NUEVAS POLÍTICAS MÁS PERMISIVAS
-- =====================================================

-- DIVISIONS: Lectura
-- Cualquier usuario autenticado puede leer divisiones del sistema o de su club
CREATE POLICY "authenticated_read_divisions" ON public.divisions 
  FOR SELECT 
  TO authenticated
  USING (
    is_system = true 
    OR club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.club_id = divisions.club_id 
      AND m.user_id = auth.uid()
    )
  );

-- DIVISIONS: Escritura (solo admins)
CREATE POLICY "admin_manage_divisions" ON public.divisions 
  FOR ALL 
  TO authenticated
  USING (
    is_system = false 
    AND club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = divisions.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  )
  WITH CHECK (
    is_system = false 
    AND club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = divisions.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

-- TOURNAMENT_TYPES: Lectura
-- Cualquier usuario autenticado puede leer tipos de torneo del sistema o de su club
CREATE POLICY "authenticated_read_tournament_types" ON public.tournament_types 
  FOR SELECT 
  TO authenticated
  USING (
    is_system = true 
    OR club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.club_id = tournament_types.club_id 
      AND m.user_id = auth.uid()
    )
  );

-- TOURNAMENT_TYPES: Escritura (solo admins)
CREATE POLICY "admin_manage_tournament_types" ON public.tournament_types 
  FOR ALL 
  TO authenticated
  USING (
    is_system = false 
    AND club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = tournament_types.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  )
  WITH CHECK (
    is_system = false 
    AND club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.member_roles mr
      JOIN public.members m ON m.id = mr.member_id
      WHERE m.user_id = auth.uid() 
      AND mr.club_id = tournament_types.club_id 
      AND mr.role IN ('administrador', 'presidente')
    )
  );

-- MEMBER_DIVISIONS: Los miembros pueden ver sus propias divisiones
CREATE POLICY "authenticated_read_own_member_divisions" ON public.member_divisions 
  FOR SELECT 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.id = member_divisions.member_id 
      AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_roles mr ON mr.member_id = m.id
      JOIN public.members m2 ON m2.id = member_divisions.member_id
      WHERE m.user_id = auth.uid() 
      AND m2.club_id = mr.club_id
      AND mr.role IN ('administrador', 'presidente')
    )
  );

-- MEMBER_DIVISIONS: Los admins pueden gestionar divisiones de miembros de su club
CREATE POLICY "admin_manage_member_divisions" ON public.member_divisions 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_roles mr ON mr.member_id = m.id
      JOIN public.members m2 ON m2.id = member_divisions.member_id
      WHERE m.user_id = auth.uid() 
      AND m2.club_id = mr.club_id
      AND mr.role IN ('administrador', 'presidente')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.members m
      JOIN public.member_roles mr ON mr.member_id = m.id
      JOIN public.members m2 ON m2.id = member_divisions.member_id
      WHERE m.user_id = auth.uid() 
      AND m2.club_id = mr.club_id
      AND mr.role IN ('administrador', 'presidente')
    )
  );
