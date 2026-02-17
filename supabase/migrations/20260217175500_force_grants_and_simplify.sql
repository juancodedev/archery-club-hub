-- Migración de Refuerzo de Permisos (GRANTS y Políticas Simplificadas)

-- 1. Asegurar GRANTS en las tablas (Esto suele ser el motivo del error 42501 "permission denied for table")
-- El rol 'authenticated' debe tener permisos explícitos en las tablas para que RLS funcione.
GRANT ALL ON public.divisions TO authenticated, service_role;
GRANT ALL ON public.tournament_types TO authenticated, service_role;
GRANT ALL ON public.member_divisions TO authenticated, service_role;
GRANT ALL ON public.division_change_notifications TO authenticated, service_role;

-- Dar permisos de lectura a 'anon' solo si es estrictamente necesario (ej. para pantallas de registro público)
GRANT SELECT ON public.divisions TO anon;
GRANT SELECT ON public.tournament_types TO anon;

-- 2. Simplificar políticas de division_change_notifications para evitar fallos por joins complejos
DROP POLICY IF EXISTS "notifications_read_policy" ON public.division_change_notifications;
DROP POLICY IF EXISTS "notifications_admin_policy" ON public.division_change_notifications;

-- Lectura: El miembro poseedor de la notificación o un admin del club
CREATE POLICY "notifications_read_access" ON public.division_change_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.id = division_change_notifications.member_id 
      AND (
        m.user_id = auth.uid() 
        OR public.is_club_admin(auth.uid(), m.club_id)
      )
    )
  );

-- Gestión: Solo admins del club (o super admins vía is_club_admin)
CREATE POLICY "notifications_admin_access" ON public.division_change_notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.members m 
      WHERE m.id = division_change_notifications.member_id 
      AND public.is_club_admin(auth.uid(), m.club_id)
    )
  );

-- 3. Asegurar que las funciones tengan el search_path correcto para evitar errores de resolución
ALTER FUNCTION public.is_club_admin(UUID, UUID) SET search_path = public;
ALTER FUNCTION public.has_club_role(UUID, UUID, public.club_role) SET search_path = public;
