-- Migration: 20260312000000_add_club_overrides.sql
-- Description: Adds student_limit_override to clubs table for manual exceptions.

ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS student_limit_override INTEGER;

COMMENT ON COLUMN public.clubs.student_limit_override IS 'Manual override for student limit, bypassing the plan limit if set.';

-- Ensure SuperAdmin can manage this column (RLS policies should already cover this, but being explicit)
-- Policies for clubs usually allow ALL for super_admin already.
