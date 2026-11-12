-- Who can read and create member invitations. Run with `supabase test db`.
BEGIN;
SELECT plan(9);

SELECT policies_are('public', 'member_invitations', ARRAY['Admin manage member invitations'],
  'only the club admin policy guards invitations');

INSERT INTO public.clubs (id, name) VALUES
  ('00000000-0000-0000-0000-0000000000c1', 'Club A'),
  ('00000000-0000-0000-0000-0000000000c2', 'Club B');

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-0000-0000-0000000000a1', 'admin@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'archer@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'root@test.local');

INSERT INTO public.members (id, user_id, club_id, full_name) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000c1', 'Admin'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c1', 'Archer');
INSERT INTO public.members (id, user_id, club_id, full_name, is_super_admin) VALUES
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000c2', 'Root', true);

INSERT INTO public.member_roles (member_id, club_id, role) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1', 'administrador'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000c1', 'arquero');

INSERT INTO public.member_invitations (club_id, email) VALUES
  ('00000000-0000-0000-0000-0000000000c2', 'other-club@test.local');

CREATE FUNCTION pg_temp.act_as(p_user uuid) RETURNS void LANGUAGE sql AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

SET LOCAL ROLE authenticated;

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
SELECT lives_ok(
  $$INSERT INTO public.member_invitations (club_id, email) VALUES ('00000000-0000-0000-0000-0000000000c1', 'new@test.local')$$,
  'a club admin creates an invitation');
SELECT is((SELECT count(*) FROM public.member_invitations), 1::bigint, 'a club admin sees only their club''s invitations');
SELECT throws_ok(
  $$INSERT INTO public.member_invitations (club_id, email) VALUES ('00000000-0000-0000-0000-0000000000c2', 'x@test.local')$$,
  '42501', NULL, 'a club admin cannot invite into another club');
SELECT isnt_empty(
  $$UPDATE public.member_invitations SET email = 'renamed@test.local' WHERE email = 'new@test.local' RETURNING id$$,
  'a club admin edits their club''s invitation');
SELECT isnt_empty(
  $$DELETE FROM public.member_invitations WHERE email = 'renamed@test.local' RETURNING id$$,
  'a club admin deletes their club''s invitation');

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a2');
SELECT is((SELECT count(*) FROM public.member_invitations), 0::bigint, 'an archer sees no invitations');
SELECT throws_ok(
  $$INSERT INTO public.member_invitations (club_id, email) VALUES ('00000000-0000-0000-0000-0000000000c1', 'y@test.local')$$,
  '42501', NULL, 'an archer cannot create invitations');

SELECT pg_temp.act_as('00000000-0000-0000-0000-0000000000a3');
SELECT is((SELECT count(*) FROM public.member_invitations), 1::bigint, 'a super admin sees invitations of every club');

SELECT * FROM finish();
ROLLBACK;
