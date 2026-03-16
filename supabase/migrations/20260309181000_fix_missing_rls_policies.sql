-- ============================================================
-- FIX MISSING RLS POLICIES
-- This migration restores missing policies for tables that were cleaned up 
-- but not recreated in baseline_security.sql
-- ============================================================

-- 1. Training Sessions
DROP POLICY IF EXISTS "Training sessions visibility" ON public.training_sessions;
CREATE POLICY "Training sessions visibility" ON public.training_sessions FOR SELECT TO authenticated
USING (
  club_id IN (SELECT public.get_user_clubs(auth.uid())) 
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Manage training sessions" ON public.training_sessions;
CREATE POLICY "Manage training sessions" ON public.training_sessions FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) 
  OR public.has_club_role(auth.uid(), club_id, 'entrenador')
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) 
  OR public.has_club_role(auth.uid(), club_id, 'entrenador')
);

-- 2. Training Enrollments
DROP POLICY IF EXISTS "Enrollments visibility" ON public.training_enrollments;
CREATE POLICY "Enrollments visibility" ON public.training_enrollments FOR SELECT TO authenticated
USING (
  club_id IN (SELECT public.get_user_clubs(auth.uid())) 
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Self enrollment" ON public.training_enrollments;
CREATE POLICY "Self enrollment" ON public.training_enrollments FOR INSERT TO authenticated
WITH CHECK (
  member_id = public.get_member_id_by_user(auth.uid())
);

DROP POLICY IF EXISTS "Coach manage enrollments" ON public.training_enrollments;
CREATE POLICY "Coach manage enrollments" ON public.training_enrollments FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) 
  OR public.has_club_role(auth.uid(), club_id, 'entrenador')
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) 
  OR public.has_club_role(auth.uid(), club_id, 'entrenador')
);

-- 3. Divisions
DROP POLICY IF EXISTS "Divisions visibility" ON public.divisions;
CREATE POLICY "Divisions visibility" ON public.divisions FOR SELECT TO authenticated
USING (
  club_id IS NULL -- System divisions
  OR club_id IN (SELECT public.get_user_clubs(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admin manage divisions" ON public.divisions;
CREATE POLICY "Admin manage divisions" ON public.divisions FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) 
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) 
);

-- 4. Tournament Types
DROP POLICY IF EXISTS "Tournament types visibility" ON public.tournament_types;
CREATE POLICY "Tournament types visibility" ON public.tournament_types FOR SELECT TO authenticated
USING (
  club_id IS NULL -- System types
  OR club_id IN (SELECT public.get_user_clubs(auth.uid()))
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admin manage tournament types" ON public.tournament_types;
CREATE POLICY "Admin manage tournament types" ON public.tournament_types FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) 
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) 
);

-- 5. Extra Charges
DROP POLICY IF EXISTS "Extra charges visibility" ON public.extra_charges;
CREATE POLICY "Extra charges visibility" ON public.extra_charges FOR SELECT TO authenticated
USING (
  club_id IN (SELECT public.get_user_clubs(auth.uid())) 
  OR public.is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Admin manage extra charges" ON public.extra_charges;
CREATE POLICY "Admin manage extra charges" ON public.extra_charges FOR ALL TO authenticated
USING (
  public.is_club_admin(auth.uid(), club_id) 
  OR public.has_club_role(auth.uid(), club_id, 'tesorero')
)
WITH CHECK (
  public.is_club_admin(auth.uid(), club_id) 
  OR public.has_club_role(auth.uid(), club_id, 'tesorero')
);

-- 6. Member Divisions
DROP POLICY IF EXISTS "Member divisions visibility" ON public.member_divisions;
CREATE POLICY "Member divisions visibility" ON public.member_divisions FOR SELECT TO authenticated
USING (
  member_id = public.get_member_id_by_user(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.members m 
    WHERE m.id = public.member_divisions.member_id 
    AND public.is_club_admin(auth.uid(), m.club_id)
  )
  OR public.is_super_admin(auth.uid())
);

-- 7. Division Change Notifications
DROP POLICY IF EXISTS "Notifications visibility" ON public.division_change_notifications;
CREATE POLICY "Notifications visibility" ON public.division_change_notifications FOR SELECT TO authenticated
USING (
  member_id = public.get_member_id_by_user(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- 8. Contact Requests
DROP POLICY IF EXISTS "Contact requests visibility" ON public.contact_requests;
CREATE POLICY "Contact requests visibility" ON public.contact_requests FOR SELECT TO authenticated
USING (
  member_id = public.get_member_id_by_user(auth.uid())
  OR public.is_club_admin(auth.uid(), club_id)
  OR public.is_super_admin(auth.uid())
);

-- Reload cache
NOTIFY pgrst, 'reload schema';
