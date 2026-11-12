-- Let coaches (entrenador) create and edit their club's tournaments.
-- TournamentsPage already shows coaches the "create tournament" button, but
-- only club admins and tournament managers could write tournaments, so saving
-- failed. Coaches get INSERT and UPDATE only: deleting a tournament cascades
-- to its registrations, and the app has no delete action. Registrations stay
-- with admins and tournament managers ("Admin manage tournaments" is unchanged).
DROP POLICY IF EXISTS "Coach create tournaments" ON public.tournaments;
CREATE POLICY "Coach create tournaments" ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (public.has_club_role(auth.uid(), club_id, 'entrenador'));

DROP POLICY IF EXISTS "Coach edit tournaments" ON public.tournaments;
CREATE POLICY "Coach edit tournaments" ON public.tournaments FOR UPDATE TO authenticated
  USING (public.has_club_role(auth.uid(), club_id, 'entrenador'))
  WITH CHECK (public.has_club_role(auth.uid(), club_id, 'entrenador'));
