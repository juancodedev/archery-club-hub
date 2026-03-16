-- ============================================================
-- RESTORE MISSING RLS POLICIES & FIX SYSTEMIC ERRORS
-- ============================================================

-- 1. Members: Allow users to update their own profile
DROP POLICY IF EXISTS "Members update own" ON public.members;
CREATE POLICY "Members update own" ON public.members 
    FOR UPDATE TO authenticated 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid()); -- Prevent changing ownership

-- 2. Scores: Allow users to update/delete their own scores
DROP POLICY IF EXISTS "Users manage own scores" ON public.scores;
CREATE POLICY "Users manage own scores" ON public.scores 
    FOR ALL TO authenticated
    USING (member_id = public.get_member_id_by_user(auth.uid()))
    WITH CHECK (member_id = public.get_member_id_by_user(auth.uid()));

-- 3. Financial Entries: Allow users to view their own payments
DROP POLICY IF EXISTS "Members view own payments" ON public.financial_entries;
CREATE POLICY "Members view own payments" ON public.financial_entries
    FOR SELECT TO authenticated
    USING (
        member_id = public.get_member_id_by_user(auth.uid())
        OR public.is_club_admin(auth.uid(), club_id) 
        OR public.has_club_role(auth.uid(), club_id, 'tesorero')
    );

-- 4. Tournament Registrations: Allow users to manage their own registrations (cancel/update)
DROP POLICY IF EXISTS "Users manage own registrations" ON public.tournament_registrations;
CREATE POLICY "Users manage own registrations" ON public.tournament_registrations
    FOR ALL TO authenticated
    USING (member_id = public.get_member_id_by_user(auth.uid()))
    WITH CHECK (member_id = public.get_member_id_by_user(auth.uid()));

-- 5. Fix common pitfalls for updates:
-- Grant write permissions only to the tables that have authenticated write policies above
GRANT UPDATE ON public.members TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scores TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournament_registrations TO authenticated;

-- Ensure SECURITY DEFINER functions exist and are robust (already done in previous fix, but reinforcing)
NOTIFY pgrst, 'reload schema';
