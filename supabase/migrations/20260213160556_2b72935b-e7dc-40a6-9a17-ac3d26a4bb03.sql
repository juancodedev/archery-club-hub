
-- Add fees to clubs
ALTER TABLE public.clubs ADD COLUMN inscription_fee numeric DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN monthly_fee numeric DEFAULT 0;
ALTER TABLE public.clubs ADD COLUMN logo_url text;

-- Add medical/guardian fields to members
ALTER TABLE public.members ADD COLUMN medical_history text;
ALTER TABLE public.members ADD COLUMN guardian_name text;
ALTER TABLE public.members ADD COLUMN guardian_phone text;
ALTER TABLE public.members ADD COLUMN guardian_email text;

-- Create member invitations table
CREATE TABLE public.member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at timestamp with time zone,
  created_by uuid REFERENCES public.members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;

-- Admin can create/read invitations
CREATE POLICY "Admin can manage invitations"
ON public.member_invitations FOR ALL
USING (is_club_admin(auth.uid(), club_id))
WITH CHECK (is_club_admin(auth.uid(), club_id));

-- Anyone can read invitation by token (for public registration page)
CREATE POLICY "Anyone can read invitation by token"
ON public.member_invitations FOR SELECT
USING (true);

-- Create training enrollments table
CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(training_session_id, member_id)
);

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

-- Active members can read enrollments in their club
CREATE POLICY "Active members can read enrollments"
ON public.training_enrollments FOR SELECT
USING (is_active_member(auth.uid(), club_id));

-- Active members can enroll themselves
CREATE POLICY "Active members can enroll"
ON public.training_enrollments FOR INSERT
WITH CHECK (
  is_active_member(auth.uid(), club_id) AND
  EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
);

-- Members can unenroll themselves, admin can remove anyone
CREATE POLICY "Members can unenroll or admin"
ON public.training_enrollments FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid()))
  OR is_club_admin(auth.uid(), club_id)
);

-- Admin can update club fees
CREATE POLICY "Admin can update clubs"
ON public.clubs FOR UPDATE
USING (is_club_admin(auth.uid(), id));

-- Allow entrenador to create training sessions too
DROP POLICY IF EXISTS "Admin can create sessions" ON public.training_sessions;
CREATE POLICY "Admin or entrenador can create sessions"
ON public.training_sessions FOR INSERT
WITH CHECK (is_club_admin(auth.uid(), club_id) OR has_club_role(auth.uid(), club_id, 'entrenador'::club_role));
