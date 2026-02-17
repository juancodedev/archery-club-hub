-- Migration: subscription_plans_and_billing.sql

-- 1. Update public.plans table
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS price_annual DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 100;

-- 2. Update public.clubs table
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';

-- 3. Create public.system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mercadopago_mode TEXT DEFAULT 'fictitious',
    mercadopago_public_key TEXT,
    annual_discount_percentage INTEGER DEFAULT 20,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure only one row in system_settings
CREATE OR REPLACE FUNCTION public.single_row_system_settings()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT COUNT(*) FROM public.system_settings) >= 1 THEN
        RAISE EXCEPTION 'Only one row is allowed in system_settings';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create public.contact_requests table
CREATE TABLE IF NOT EXISTS public.contact_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Security - RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

-- Policies for system_settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Public system settings read') THEN
        CREATE POLICY "Public system settings read" ON public.system_settings FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'SuperAdmin system settings all') THEN
        CREATE POLICY "SuperAdmin system settings all" ON public.system_settings FOR ALL USING (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- Policies for contact_requests
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Club admins can see own contact requests') THEN
        CREATE POLICY "Club admins can see own contact requests" ON public.contact_requests FOR SELECT
          USING (public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Club admins can create contact requests') THEN
        CREATE POLICY "Club admins can create contact requests" ON public.contact_requests FOR INSERT
          WITH CHECK (public.is_club_admin(auth.uid(), club_id));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'SuperAdmin all contact requests') THEN
        CREATE POLICY "SuperAdmin all contact requests" ON public.contact_requests FOR ALL
          USING (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- 6. Initial Data
INSERT INTO public.system_settings (mercadopago_mode, annual_discount_percentage)
VALUES ('fictitious', 20)
ON CONFLICT DO NOTHING;

-- Update existing plans with some defaults
UPDATE public.plans SET price_annual = 240, student_limit = 100 WHERE name ILIKE 'Pro%';
UPDATE public.plans SET price_annual = 480, student_limit = 500 WHERE name ILIKE 'Business%';
UPDATE public.plans SET student_limit = 10 WHERE name ILIKE 'Básico%' OR name ILIKE 'Gratuito%';
