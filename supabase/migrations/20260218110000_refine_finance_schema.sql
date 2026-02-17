-- Refine financial_entries for membership-linked payments

-- 1. Add columns to financial_entries
ALTER TABLE public.financial_entries 
ADD COLUMN IF NOT EXISTS member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_month INTEGER CHECK (payment_month >= 1 AND payment_month <= 12),
ADD COLUMN IF NOT EXISTS payment_year INTEGER;

-- 2. Add index for performance when filtering by member or period
CREATE INDEX IF NOT EXISTS idx_financial_entries_member_period 
ON public.financial_entries(member_id, payment_year, payment_month);

-- 3. Update RLS policies to ensure consistency
-- We already have "financial_entries_admin_all" which uses public.is_club_admin(auth.uid(), club_id).
-- This is correct as only admins/treasurers should manage these entries.

-- 4. Correct created_by reference if it was pointing to auth.users but we need it to be consistent
-- financial_entries.created_by is UUID REFERENCES auth.users(id), which is fine for tracking the authenticated user.
