-- Migration: mercadopago_and_advanced_billing.sql
-- Description: Adds advanced billing features, grace periods, and invoice tracking.

-- 1. Update public.clubs table with new billing fields
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS student_limit_override INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_payment_due_date TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'total' CHECK (block_type IN ('total', 'partial'));

-- Backfill existing rows so NULLs don't bypass business logic
UPDATE public.clubs SET
    grace_period_days = COALESCE(grace_period_days, 0),
    block_type = COALESCE(block_type, 'total')
WHERE grace_period_days IS NULL OR block_type IS NULL;

-- 2. Create public.club_invoices table
CREATE TABLE IF NOT EXISTS public.club_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'expired')),
    mercadopago_payment_id TEXT UNIQUE,
    billing_period_start TIMESTAMPTZ,
    billing_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index to enforce idempotency for (club, billing period)
CREATE UNIQUE INDEX IF NOT EXISTS club_invoices_club_period_unique
    ON public.club_invoices (club_id, billing_period_start, billing_period_end);

-- 3. Enable RLS on club_invoices
ALTER TABLE public.club_invoices ENABLE ROW LEVEL SECURITY;

-- 4. Policies for club_invoices (idempotent: check by both name and table)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy
        WHERE polname = 'Club admins can view own invoices'
          AND polrelid = 'public.club_invoices'::regclass
    ) THEN
        CREATE POLICY "Club admins can view own invoices" ON public.club_invoices 
        FOR SELECT
        USING (public.is_club_admin(auth.uid(), club_id) OR public.is_super_admin(auth.uid()));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy
        WHERE polname = 'SuperAdmin full access invoices'
          AND polrelid = 'public.club_invoices'::regclass
    ) THEN
        CREATE POLICY "SuperAdmin full access invoices" ON public.club_invoices 
        FOR ALL
        USING (public.is_super_admin(auth.uid()));
    END IF;
END $$;

-- 5. Helper function to check if club is overdue (including grace period)
CREATE OR REPLACE FUNCTION public.is_club_overdue(p_club_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_due_date TIMESTAMPTZ;
    v_grace_days INTEGER;
BEGIN
    SELECT next_payment_due_date, COALESCE(grace_period_days, 0)
    INTO v_due_date, v_grace_days
    FROM public.clubs 
    WHERE id = p_club_id;
    
    RETURN (v_due_date IS NOT NULL AND (v_due_date + (v_grace_days || ' days')::INTERVAL) < NOW());
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp;

-- Restrict access: only authenticated users should call this; revoke from anon
REVOKE EXECUTE ON FUNCTION public.is_club_overdue(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_club_overdue(UUID) TO authenticated;

-- 6. SECURITY DEFINER RPC so the webhook edge function (service role) can update
--    subscription fields without being blocked by the protect_subscription_status trigger.
--    Only callable by service_role (revoked from authenticated/anon).
CREATE OR REPLACE FUNCTION public.update_club_subscription_after_payment(
    p_club_id UUID,
    p_plan_id UUID,
    p_subscription_end_date TIMESTAMPTZ,
    p_last_payment_date TIMESTAMPTZ,
    p_next_payment_due_date TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.clubs SET
        subscription_status = 'activo',
        subscription_end_date = p_subscription_end_date,
        plan_id = p_plan_id,
        last_payment_date = p_last_payment_date,
        next_payment_due_date = p_next_payment_due_date
    WHERE id = p_club_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- Revoke from all roles; only service_role (bypasses RLS/grants) may call this
REVOKE EXECUTE ON FUNCTION public.update_club_subscription_after_payment(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
