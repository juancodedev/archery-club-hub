-- ============================================================
-- BASELINE SECURITY v1.0
-- ============================================================

-- ============================================================
-- 1. CLEANUP: Clear existing policies to avoid conflicts
-- ============================================================
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- ============================================================
-- 2. HELPER FUNCTIONS (SECURITY DEFINER)
-- ============================================================

-- Super Admin Check
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = p_user_id AND is_super_admin = true
  );
$$;

-- Club Admin Check
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
  ) OR public.is_super_admin(p_user_id);
$$;

-- Generic Role Check
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
  ) OR public.is_super_admin(p_user_id);
$$;

-- Active Member Check
CREATE OR REPLACE FUNCTION public.is_active_member(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members 
    WHERE user_id = p_user_id 
      AND club_id = p_club_id 
      AND status = 'activo'::public.member_status
  ) OR public.is_super_admin(p_user_id);
$$;

-- Updated_at Trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- 3. VALIDATION TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_member_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(trim(NEW.full_name)) < 2 OR length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'El nombre completo debe tener entre 2 y 200 caracteres';
  END IF;
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Formato de email inválido';
  END IF;
  NEW.full_name := trim(NEW.full_name);
  IF NEW.email IS NOT NULL THEN NEW.email := trim(NEW.email); END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_member_before_insert_update ON public.members;
CREATE TRIGGER validate_member_before_insert_update
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.validate_member_data();

-- ============================================================
-- 4. RLS POLICIES
-- ============================================================

-- Plans
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Super admin can manage plans" ON public.plans FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Clubs
CREATE POLICY "Anyone can read clubs" ON public.clubs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin or Super can update clubs" ON public.clubs FOR UPDATE TO authenticated USING (public.is_club_admin(auth.uid(), id));
CREATE POLICY "Super admin manage clubs" ON public.clubs FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Members
CREATE POLICY "Members read own" ON public.members FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin reads club members" ON public.members FOR SELECT TO authenticated USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Super admin read all" ON public.members FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Admin can manage members" ON public.members FOR ALL TO authenticated USING (public.is_club_admin(auth.uid(), club_id)) WITH CHECK (public.is_club_admin(auth.uid(), club_id));

-- Member Roles
CREATE POLICY "Read own roles" ON public.member_roles FOR SELECT TO authenticated USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Admin manage roles" ON public.member_roles FOR ALL TO authenticated USING (public.is_club_admin(auth.uid(), club_id));

-- Tournaments
CREATE POLICY "Tournament visibility" ON public.tournaments FOR SELECT TO authenticated 
  USING (club_id IN (SELECT club_id FROM public.members WHERE user_id = auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admin manage tournaments" ON public.tournaments FOR ALL TO authenticated 
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_club_role(auth.uid(), club_id, 'gestor_torneos'));

-- Tournament Registrations
CREATE POLICY "Registration visibility" ON public.tournament_registrations FOR SELECT TO authenticated
  USING (tournament_id IN (SELECT id FROM public.tournaments WHERE club_id IN (SELECT club_id FROM public.members WHERE user_id = auth.uid())) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Register self" ON public.tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));
CREATE POLICY "Manage registrations" ON public.tournament_registrations FOR ALL TO authenticated
  USING (tournament_id IN (SELECT id FROM public.tournaments WHERE public.is_club_admin(auth.uid(), club_id) OR public.has_club_role(auth.uid(), club_id, 'gestor_torneos')));

-- Scores
CREATE POLICY "Score visibility" ON public.scores FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()) OR public.is_club_admin(auth.uid(), club_id) OR public.has_club_role(auth.uid(), club_id, 'entrenador'));
CREATE POLICY "Insert own scores" ON public.scores FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid() AND status = 'activo'));

-- Financial Entries
CREATE POLICY "Financial visibility and manage" ON public.financial_entries FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.has_club_role(auth.uid(), club_id, 'tesorero'));

-- System Settings
CREATE POLICY "Read settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Super manage settings" ON public.system_settings FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- ============================================================
-- 5. GRANTS - Resolver "permission denied"
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure authenticated users can call functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- ============================================================
-- 6. CACHE RELOAD
-- ============================================================
NOTIFY pgrst, 'reload schema';
