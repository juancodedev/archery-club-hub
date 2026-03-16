-- Add billing_day and grace_days columns to members table
-- These are needed by the create-member Edge Function

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS billing_day INTEGER,
  ADD COLUMN IF NOT EXISTS grace_days INTEGER DEFAULT 7;
