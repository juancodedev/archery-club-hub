
-- Enum for club roles
CREATE TYPE public.club_role AS ENUM ('arquero', 'socio', 'entrenador', 'presidente', 'administrador');

-- Enum for member status
CREATE TYPE public.member_status AS ENUM ('activo', 'inactivo');

-- Clubs table (tenants)
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  country TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Members table
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  identification TEXT,
  date_of_birth DATE,
  phone TEXT,
  email TEXT NOT NULL,
  address TEXT,
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  member_type TEXT DEFAULT 'arquero',
  status member_status NOT NULL DEFAULT 'activo',
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, club_id)
);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Member roles table (separate from members, per security requirements)
CREATE TABLE public.member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  role club_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(member_id, role)
);
ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

-- Training sessions
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  division TEXT,
  target_type TEXT,
  detail TEXT,
  created_by UUID REFERENCES public.members(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

-- Scores table (ends stored as JSONB array)
CREATE TABLE public.scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  event_name TEXT,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  division TEXT,
  target_type TEXT,
  detail TEXT,
  ends JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Helper functions (security definer to avoid RLS recursion)

CREATE OR REPLACE FUNCTION public.get_member_for_user(p_user_id UUID)
RETURNS TABLE(member_id UUID, member_club_id UUID, member_status member_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, club_id, status FROM public.members WHERE user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_club_role(p_user_id UUID, p_club_id UUID, p_role club_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    JOIN public.members m ON m.id = mr.member_id
    WHERE m.user_id = p_user_id AND mr.club_id = p_club_id AND mr.role = p_role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    JOIN public.members m ON m.id = mr.member_id
    WHERE m.user_id = p_user_id AND mr.club_id = p_club_id AND mr.role IN ('administrador', 'presidente')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_member(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members WHERE user_id = p_user_id AND club_id = p_club_id AND status = 'activo'
  );
$$;

-- RLS Policies

-- Clubs: anyone authenticated can read
CREATE POLICY "Anyone can read clubs" ON public.clubs FOR SELECT TO authenticated USING (true);
-- Clubs: insert allowed for signup flow (will be done via edge function in production)
CREATE POLICY "Authenticated can create clubs" ON public.clubs FOR INSERT TO authenticated WITH CHECK (true);

-- Members: own data or admin of same club
CREATE POLICY "Members read own or admin reads club" ON public.members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_club_role(auth.uid(), club_id, 'entrenador')
  );
CREATE POLICY "Admin can insert members" ON public.members FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id) OR user_id = auth.uid());
CREATE POLICY "Admin can update members" ON public.members FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id) OR user_id = auth.uid());
CREATE POLICY "Admin can delete members" ON public.members FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- Member roles
CREATE POLICY "Read own or admin reads club roles" ON public.member_roles FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_club_role(auth.uid(), club_id, 'entrenador')
  );
CREATE POLICY "Admin can manage roles" ON public.member_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can update roles" ON public.member_roles FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can delete roles" ON public.member_roles FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- Training sessions
CREATE POLICY "Active club members can read sessions" ON public.training_sessions FOR SELECT TO authenticated
  USING (public.is_active_member(auth.uid(), club_id));
CREATE POLICY "Admin can create sessions" ON public.training_sessions FOR INSERT TO authenticated
  WITH CHECK (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can update sessions" ON public.training_sessions FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can delete sessions" ON public.training_sessions FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- Scores
CREATE POLICY "Read own scores or entrenador/admin" ON public.scores FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR public.is_club_admin(auth.uid(), club_id)
    OR public.has_club_role(auth.uid(), club_id, 'entrenador')
  );
CREATE POLICY "Active members can insert own scores" ON public.scores FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid() AND m.status = 'activo')
  );
CREATE POLICY "Admin can update scores" ON public.scores FOR UPDATE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Admin can delete scores" ON public.scores FOR DELETE TO authenticated
  USING (public.is_club_admin(auth.uid(), club_id));

-- Updated_at trigger for members
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to register a club + admin member in one transaction
CREATE OR REPLACE FUNCTION public.register_club(
  p_club_name TEXT,
  p_city TEXT,
  p_country TEXT,
  p_contact_email TEXT,
  p_admin_name TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_club_id UUID;
  v_member_id UUID;
BEGIN
  INSERT INTO public.clubs (name, city, country, contact_email)
  VALUES (p_club_name, p_city, p_country, p_contact_email)
  RETURNING id INTO v_club_id;

  INSERT INTO public.members (user_id, club_id, full_name, email, status)
  VALUES (p_user_id, v_club_id, p_admin_name, p_contact_email, 'activo')
  RETURNING id INTO v_member_id;

  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, v_club_id, 'administrador');

  RETURN v_club_id;
END;
$$;
