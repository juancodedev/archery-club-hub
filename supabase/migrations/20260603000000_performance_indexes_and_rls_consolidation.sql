-- ============================================================
-- PERFORMANCE INDEXES & RLS CONSOLIDATION
-- Date: 2026-06-03
-- ============================================================

-- ============================================================
-- PART 1: MISSING DATABASE INDEXES
-- ============================================================
-- These indexes target the most frequently queried columns
-- based on the application's data access patterns.

-- Members: auth lookup (every login) + admin member list filtering
CREATE INDEX IF NOT EXISTS idx_members_user_id ON public.members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_club_status ON public.members(club_id, status);

-- Scores: dashboard history + club score list + IFAA classification trigger
CREATE INDEX IF NOT EXISTS idx_scores_member_date ON public.scores(member_id, score_date DESC);
CREATE INDEX IF NOT EXISTS idx_scores_club_id ON public.scores(club_id);

-- Financial entries: admin page + membership page queries
CREATE INDEX IF NOT EXISTS idx_financial_entries_club_id ON public.financial_entries(club_id);

-- Training sessions: training list page filtered by club + date
CREATE INDEX IF NOT EXISTS idx_training_sessions_club_date ON public.training_sessions(club_id, event_date DESC);

-- Tournaments: tournament list page filtered by club
CREATE INDEX IF NOT EXISTS idx_tournaments_club_id ON public.tournaments(club_id);

-- Member roles: role check on every RLS policy evaluation
CREATE INDEX IF NOT EXISTS idx_member_roles_member_id ON public.member_roles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_roles_club_id ON public.member_roles(club_id);

-- Training enrollments: check enrollment status per session
CREATE INDEX IF NOT EXISTS idx_training_enrollments_session ON public.training_enrollments(training_session_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_member ON public.training_enrollments(member_id);

-- Extra charges: admin billing page
CREATE INDEX IF NOT EXISTS idx_extra_charges_club_id ON public.extra_charges(club_id);

-- ============================================================
-- PART 2: RLS POLICY CONSOLIDATION
-- ============================================================
-- Drops and recreates policies for tables that had no policies
-- or had inconsistent coverage across migrations.

-- -----------------------------------------------------------
-- training_enrollments: NO policies existed
-- -----------------------------------------------------------
CREATE POLICY "Members view own enrollments" ON public.training_enrollments
  FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_club_role(auth.uid(), club_id, 'entrenador')
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Members enroll themselves" ON public.training_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid() AND status = 'activo')
  );

CREATE POLICY "Admin manages enrollments" ON public.training_enrollments
  FOR DELETE TO authenticated
  USING (
    public.is_club_admin(auth.uid(), club_id)
    OR public.has_club_role(auth.uid(), club_id, 'entrenador')
    OR public.is_super_admin(auth.uid())
  );

-- -----------------------------------------------------------
-- custom_roles: NO policies existed
-- -----------------------------------------------------------
CREATE POLICY "Club members view custom roles" ON public.custom_roles
  FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT club_id FROM public.members WHERE user_id = auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admin manages custom roles" ON public.custom_roles
  FOR ALL TO authenticated
  USING (
    public.is_club_admin(auth.uid(), club_id)
    OR public.is_super_admin(auth.uid())
  );

-- -----------------------------------------------------------
-- extra_charges: NO policies existed
-- -----------------------------------------------------------
CREATE POLICY "Financial access for extra charges" ON public.extra_charges
  FOR ALL TO authenticated
  USING (
    public.can_access_financials(auth.uid(), club_id)
  );

-- -----------------------------------------------------------
-- coupons: NO policies existed (admin-managed)
-- -----------------------------------------------------------
CREATE POLICY "Super admin manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "Authenticated can read coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (true);

-- -----------------------------------------------------------
-- contact_requests: NO policies existed
-- -----------------------------------------------------------
CREATE POLICY "Members view own contact requests" ON public.contact_requests
  FOR SELECT TO authenticated
  USING (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Members create contact requests" ON public.contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid())
    OR club_id IN (SELECT club_id FROM public.members WHERE user_id = auth.uid())
  );

-- -----------------------------------------------------------
-- member_invitations: clarify existing policies
-- -----------------------------------------------------------
-- Drop and recreate to ensure consistent naming
DROP POLICY IF EXISTS "Manage invites" ON public.member_invitations;
DROP POLICY IF EXISTS "View invite token" ON public.member_invitations;

CREATE POLICY "Admin manage invitations" ON public.member_invitations
  FOR ALL TO authenticated
  USING (
    public.is_club_admin(auth.uid(), club_id)
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Anyone can view invitation by token" ON public.member_invitations
  FOR SELECT TO anon, authenticated
  USING (true);

-- -----------------------------------------------------------
-- scores: add missing DELETE policy
-- -----------------------------------------------------------
-- Existing policies: SELECT (Score visibility), INSERT (Insert own scores)
-- Missing: DELETE (admin/coach should be able to delete scores)
CREATE POLICY "Admin delete scores" ON public.scores
  FOR DELETE TO authenticated
  USING (
    public.is_club_admin(auth.uid(), club_id)
    OR public.has_club_role(auth.uid(), club_id, 'entrenador')
    OR public.is_super_admin(auth.uid())
  );

-- -----------------------------------------------------------
-- system_settings: ensure anon can read (for public config)
-- -----------------------------------------------------------
-- Recreate to ensure consistent TO clause
DROP POLICY IF EXISTS "Read settings" ON public.system_settings;
CREATE POLICY "Read settings" ON public.system_settings
  FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- PART 3: GRANTS FOR NEW TABLES
-- ============================================================
GRANT ALL ON public.training_enrollments TO authenticated;
GRANT ALL ON public.custom_roles TO authenticated;
GRANT ALL ON public.extra_charges TO authenticated;
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.contact_requests TO authenticated;

-- ============================================================
-- RELOAD POSTGREST CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
