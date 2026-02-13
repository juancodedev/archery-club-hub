
-- Extension to handle subscription logic
CREATE TYPE public.subscription_status AS ENUM ('activo', 'pendiente', 'bloqueado');

-- Add subscription fields to clubs
ALTER TABLE public.clubs ADD COLUMN subscription_status subscription_status NOT NULL DEFAULT 'activo';
ALTER TABLE public.clubs ADD COLUMN subscription_end_date DATE;
ALTER TABLE public.clubs ADD COLUMN monthly_price DECIMAL(10,2) DEFAULT 29.99;

-- Add super_admin flag to members
ALTER TABLE public.members ADD COLUMN is_super_admin BOOLEAN NOT NULL DEFAULT false;

-- Create a system function to check super admin status
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true
  );
$$;

-- Update RLS for Super Admin to manage everything
-- Clubs
CREATE POLICY "Super admin can do everything on clubs" ON public.clubs
  FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Members (Super admin can see all members)
CREATE POLICY "Super admin can see all members" ON public.members
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can update all members" ON public.members
  FOR UPDATE TO authenticated USING (public.is_super_admin(auth.uid()));

-- Update function to include subscription check in member fetching if needed
-- But we'll handle the block in the frontend logic for now by checking club status.

-- Seed a super admin (this would normally be done manually or via setup script)
-- Assuming we want to make the first user a super admin for testing purposes
-- UPDATE public.members SET is_super_admin = true WHERE email = 'YOUR_EMAIL_HERE';
