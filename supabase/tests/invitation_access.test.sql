-- Access checks for member invitations.
--
-- The full migration history does not replay on an empty database, so this test
-- recreates the parts it needs as they stand in production:
-- - the member_invitations table and its RLS policies
-- - the get_invitation_by_token RPC
-- - stub accept_invitation_v2 overloads with their API grants
-- - small stubs for auth.uid(), is_club_admin and is_super_admin
-- It then applies the migration under test and checks who can read what.
--
-- Run it against a throwaway Postgres:
--   docker run -d --name inv-test -e POSTGRES_PASSWORD=test postgres:18
--   docker cp supabase inv-test:/supabase
--   docker exec inv-test psql -U postgres -v ON_ERROR_STOP=1 \
--     -v migration=/supabase/migrations/20261112120000_close_invitation_token_exposure.sql \
--     -f /supabase/tests/invitation_access.test.sql
--   docker rm -f inv-test

\set ON_ERROR_STOP on
\set QUIET on

BEGIN;

-- Supabase environment ---------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Production state before the migration ----------------------------------------
CREATE TABLE public.member_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;
-- Supabase grants table privileges to the API roles by default; RLS decides rows.
GRANT ALL ON public.member_invitations TO anon, authenticated;

CREATE TABLE public.test_club_admins (user_id UUID, club_id UUID);
CREATE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.test_club_admins WHERE user_id = p_user_id AND club_id = p_club_id)
$$;
CREATE FUNCTION public.is_super_admin(p_user_id UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$ SELECT false $$;

CREATE POLICY "Admins can view invitations" ON public.member_invitations
  FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin manage member invitations" ON public.member_invitations
  FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admin manage invitations" ON public.member_invitations
  FOR ALL TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Anyone can view invitation by token" ON public.member_invitations
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(id uuid, club_id uuid, email text, expires_at timestamptz, used_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public' AS $$
  SELECT mi.id, mi.club_id, mi.email, mi.expires_at, mi.used_at, mi.created_at
  FROM public.member_invitations mi WHERE mi.token = p_token LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- Two overloads, as the two migrations that defined accept_invitation_v2 left them.
CREATE FUNCTION public.accept_invitation_v2(p_token TEXT, p_full_name TEXT, p_user_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
CREATE FUNCTION public.accept_invitation_v2(p_token TEXT, p_full_name TEXT, p_user_id UUID, p_password TEXT, p_email TEXT)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER AS $$ SELECT '{}'::jsonb $$;
GRANT EXECUTE ON FUNCTION public.accept_invitation_v2(TEXT, TEXT, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation_v2(TEXT, TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

-- Fixtures ----------------------------------------------------------------------
INSERT INTO public.test_club_admins VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', 'c1111111-0000-0000-0000-000000000001');
INSERT INTO public.member_invitations (club_id, token, email) VALUES
  ('c1111111-0000-0000-0000-000000000001', 'token-club-1', 'new@club1.test'),
  ('c2222222-0000-0000-0000-000000000002', 'token-club-2', 'new@club2.test');

-- Migration under test ----------------------------------------------------------
\i :migration

-- Checks --------------------------------------------------------------------------
CREATE FUNCTION pg_temp.check(ok boolean, name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok THEN RAISE NOTICE 'ok - %', name;
  ELSE RAISE EXCEPTION 'not ok - %', name; END IF;
END $$;
GRANT EXECUTE ON FUNCTION pg_temp.check(boolean, text) TO anon, authenticated;

SET LOCAL ROLE anon;
SELECT pg_temp.check((SELECT count(*) FROM public.member_invitations) = 0,
  'an anonymous caller cannot list invitations or their tokens');
SELECT pg_temp.check((SELECT email FROM public.get_invitation_by_token('token-club-1')) = 'new@club1.test',
  'the join page still reads one invitation by its token');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', true);
SELECT pg_temp.check((SELECT count(*) FROM public.member_invitations) = 0,
  'a signed-in member who is not a club admin cannot list invitations');
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', true);
SELECT pg_temp.check(
  (SELECT array_agg(token) FROM public.member_invitations) = ARRAY['token-club-1'],
  'a club admin still lists the invitations of their own club only');
RESET ROLE;

SELECT pg_temp.check(NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN (VALUES ('anon'), ('authenticated')) r(role)
    WHERE n.nspname = 'public' AND p.proname = 'accept_invitation_v2'
      AND has_function_privilege(r.role, p.oid, 'EXECUTE')),
  'no accept_invitation_v2 overload is executable by anon or authenticated');

ROLLBACK;
