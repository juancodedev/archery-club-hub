
-- 1. Table for Extra Charges per club
CREATE TABLE IF NOT EXISTS public.extra_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for extra_charges
ALTER TABLE public.extra_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can manage extra charges" ON public.extra_charges
    FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins can see their club extra charges" ON public.extra_charges
    FOR SELECT TO authenticated USING (public.is_club_admin(auth.uid(), club_id));

-- 2. Table for dynamic Roles (to allow custom roles)
-- We'll keep the existing member_roles but allow it to reference this table if needed, 
-- or just expand the enum. Actually, a table is better for "custom roles".
CREATE TABLE IF NOT EXISTS public.custom_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE, -- NULL means global/system role
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(club_id, name)
);

ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read roles" ON public.custom_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin manage global roles" ON public.custom_roles FOR ALL TO authenticated 
    USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Club admin manage their roles" ON public.custom_roles FOR ALL TO authenticated 
    USING (public.is_club_admin(auth.uid(), club_id));

-- 3. Update plans table to include order for landing page
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 4. Harden is_super_admin to check for specific email as backup/primary
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.super_admins WHERE user_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id AND email = 'cl.jmunoz@gmail.com'
  );
$$;

-- 5. Insert default roles for new clubs trigger or logic
-- We'll insert these into the custom_roles table for each club
INSERT INTO public.custom_roles (name, description) VALUES 
('administrador_club', 'Administrador total del club'),
('arquero', 'Miembro arquero estándar')
ON CONFLICT (club_id, name) DO NOTHING;

-- 6. Add policy for Super Admin to see everything in training and scores
CREATE POLICY "Super admin can read all training sessions" ON public.training_sessions
    FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can read all scores" ON public.scores
    FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
