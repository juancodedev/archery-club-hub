-- Migration: mercadopago_and_advanced_billing.sql
-- Description: Adds advanced billing features, grace periods, and invoice tracking.

-- 1. Update public.clubs table with new billing fields
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS student_limit_override INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_payment_due_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'total' CHECK (block_type IN ('total', 'partial'));

-- 2. Create public.club_invoices table
CREATE TABLE IF NOT EXISTS public.club_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'expired')),
    mercadopago_payment_id TEXT,
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS on club_invoices
ALTER TABLE public.club_invoices ENABLE ROW LEVEL SECURITY;

-- 4. Policies for club_invoices
-- Club admins can view their own invoices
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Club admins can view own invoices') THEN
        CREATE POLICY "Club admins can view own invoices" ON public.club_invoices 
        FOR SELECT
        USING (public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- SuperAdmin has full access
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'SuperAdmin full access invoices') THEN
        CREATE POLICY "SuperAdmin full access invoices" ON public.club_invoices 
        FOR ALL
        USING (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- 5. Helper function to check if club is overdue (including grace period)
-- This can be used in RLS or UI logic
CREATE OR REPLACE FUNCTION public.is_club_overdue(p_club_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_due_date TIMESTAMPTZ;
    v_grace_days INTEGER;
BEGIN
    SELECT next_payment_due_date, grace_period_days 
    INTO v_due_date, v_grace_days
    FROM public.clubs 
    WHERE id = p_club_id;
    
    RETURN (v_due_date IS NOT NULL AND (v_due_date + (v_grace_days || ' days')::INTERVAL) < NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
