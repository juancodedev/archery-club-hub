-- Who can create tournaments in a club. Run with `supabase test db`.
BEGIN;
SELECT plan(13);

INSERT INTO public.clubs (id, name) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Club A'),
  ('00000000-0000-0000-0000-0000000000c2', 'Club B');

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'coach@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'manager@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'treasurer@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'archer@test.local');

INSERT INTO public.members (id, user_id, club_id, full_name) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'Coach'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'Manager'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c1', 'Treasurer'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000c1', 'Archer');

INSERT INTO public.member_roles (member_id, club_id, role) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'entrenador'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'gestor_torneos'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000c1', 'tesorero'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000c1', 'arquero');

CREATE FUNCTION pg_temp.act_as(p_user uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

SET LOCAL ROLE authenticated;

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
SELECT lives_ok(
  $$INSERT INTO public.tournaments (club_id, name, start_date, end_date) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Coach cup', '2027-01-10', '2027-01-10')$$,
  'a coach creates a tournament in their club');
SELECT lives_ok(
  $$UPDATE public.tournaments SET name = 'Coach cup 2' WHERE name = 'Coach cup'$$,
  'a coach edits it');
SELECT is((SELECT name FROM public.tournaments WHERE club_id = '00000000-0000-0000-0000-0000000000c1'), 'Coach cup 2', 'the edit was saved');
SELECT throws_ok(
  $$INSERT INTO public.tournaments (club_id, name, start_date, end_date) VALUES ('00000000-0000-0000-0000-0000000000c2', 'Other club', '2027-01-10', '2027-01-10')$$,
  '42501', NULL, 'a coach cannot create a tournament in another club');

SELECT is_empty(
  $$DELETE FROM public.tournaments WHERE name = 'Coach cup 2' RETURNING id$$,
  'a coach cannot delete a tournament');

RESET ROLE;
SELECT is((SELECT count(*) FROM public.tournaments WHERE name = 'Coach cup 2'), 1::bigint, 'the tournament is still there');
INSERT INTO public.tournaments (club_id, name, start_date, end_date)
  VALUES ('00000000-0000-0000-0000-0000000000c2', 'Club B open', '2027-01-20', '2027-01-20');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');

SELECT is_empty(
  $$UPDATE public.tournaments SET name = 'Taken' WHERE name = 'Club B open' RETURNING id$$,
  'a coach cannot edit another club''s tournament');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.tournaments WHERE name = 'Club B open'), 1::bigint, 'the other club''s tournament is unchanged');
SET LOCAL ROLE authenticated;
SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
SELECT throws_ok(
  $$UPDATE public.tournaments SET club_id = '00000000-0000-0000-0000-0000000000c2' WHERE name = 'Coach cup 2'$$,
  '42501', NULL, 'a coach cannot move a tournament to another club');

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
SELECT lives_ok(
  $$INSERT INTO public.tournaments (club_id, name, start_date, end_date) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Manager cup', '2027-02-10', '2027-02-10')$$,
  'a tournament manager still creates tournaments');

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
SELECT throws_ok(
  $$INSERT INTO public.tournaments (club_id, name, start_date, end_date) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Treasurer cup', '2027-03-10', '2027-03-10')$$,
  '42501', NULL, 'a treasurer cannot create tournaments');

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a4');
SELECT throws_ok(
  $$INSERT INTO public.tournaments (club_id, name, start_date, end_date) VALUES ('00000000-0000-0000-0000-0000000000c1', 'Archer cup', '2027-04-10', '2027-04-10')$$,
  '42501', NULL, 'an archer cannot create tournaments');

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
SELECT isnt_empty(
  $$DELETE FROM public.tournaments WHERE name = 'Manager cup' RETURNING id$$,
  'a tournament manager can still delete tournaments');

SELECT * FROM finish();
ROLLBACK;
