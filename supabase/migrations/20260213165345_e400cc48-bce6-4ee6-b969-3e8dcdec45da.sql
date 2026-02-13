
-- FIX 1: Restrict invitation token access
-- Replace the overly permissive "Anyone can read invitation by token" policy
-- with one that only allows reading a specific invitation when the token is known
-- We use an RPC function so the public can look up an invitation by token without exposing all records

DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.member_invitations;

-- Create a security definer function to look up invitation by token
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(
  id uuid,
  club_id uuid,
  email text,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT mi.id, mi.club_id, mi.email, mi.expires_at, mi.used_at, mi.created_at
  FROM public.member_invitations mi
  WHERE mi.token = p_token
  LIMIT 1;
$$;

-- Admin can still read all invitations for their club (already covered by existing policy)
-- No public SELECT policy needed since we use the RPC function

-- FIX 2: Restrict coach access to members
-- Coaches should only see members enrolled in training sessions they created,
-- plus basic info. Replace the current SELECT policy.

DROP POLICY IF EXISTS "Members read own or admin reads club" ON public.members;

-- Users can read their own record
CREATE POLICY "Members read own record"
ON public.members
FOR SELECT
USING (user_id = auth.uid());

-- Admins can read all club members
CREATE POLICY "Admin reads club members"
ON public.members
FOR SELECT
USING (is_club_admin(auth.uid(), club_id));

-- Coaches can read members enrolled in training sessions they created
CREATE POLICY "Coach reads enrolled members"
ON public.members
FOR SELECT
USING (
  has_club_role(auth.uid(), club_id, 'entrenador'::club_role)
  AND EXISTS (
    SELECT 1 FROM public.training_enrollments te
    JOIN public.training_sessions ts ON ts.id = te.training_session_id
    WHERE te.member_id = members.id
    AND ts.created_by IN (
      SELECT m.id FROM public.members m WHERE m.user_id = auth.uid() AND m.club_id = members.club_id
    )
  )
);
