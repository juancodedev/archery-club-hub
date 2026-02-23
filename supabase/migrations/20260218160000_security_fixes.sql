-- Migration: 20260218160000_security_fixes.sql

-- 1. Enable RLS on all tables in public schema
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.division_change_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Drop Insecure Policies (Fixing "Member Personal Data Exposed" & "Invitation Tokens Accessible")
DROP POLICY IF EXISTS "Registration can insert members" ON public.members;
DROP POLICY IF EXISTS "Registration can insert clubs" ON public.clubs;
DROP POLICY IF EXISTS "Anyone with token can update invitation" ON public.member_invitations;
DROP POLICY IF EXISTS "View invite token" ON public.member_invitations;
DROP POLICY IF EXISTS "Club creation allow" ON public.clubs; 
DROP POLICY IF EXISTS "Authenticated can create clubs" ON public.clubs;

-- 3. Secure Member Invitations
-- Revoke all access from anon. Access is done via RPC get_invitation_by_token (Security Definer).
-- Authenticated users (Admins) can see invitations.
DROP POLICY IF EXISTS "Admins can view invitations" ON public.member_invitations;
CREATE POLICY "Admins can view invitations" ON public.member_invitations
  FOR SELECT TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- 4. Secure Clubs (Fixing "Club Contact Information Publicly Accessible")
-- Revoke SELECT on clubs from anon (by not granting/creating policy for them).
-- Create a secure view for anon access.
CREATE OR REPLACE VIEW public.public_clubs_view AS
  SELECT id, name, city, country, inscription_fee, monthly_fee, logo_url
  FROM public.clubs;

GRANT SELECT ON public.public_clubs_view TO anon, authenticated;

-- Ensure authenticated users can still read clubs via table (e.g. admins)
DROP POLICY IF EXISTS "Public clubs read" ON public.clubs;
DROP POLICY IF EXISTS "Authenticated users can read clubs" ON public.clubs;
CREATE POLICY "Authenticated users can read clubs" ON public.clubs
  FOR SELECT TO authenticated
  USING (true);

-- 5. Grant Permissions (Fixing 42501 errors if grants were missing)
GRANT ALL ON public.member_invitations TO authenticated;
GRANT ALL ON public.clubs TO authenticated;
GRANT ALL ON public.members TO authenticated;
