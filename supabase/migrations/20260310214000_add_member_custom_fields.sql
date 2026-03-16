-- Migration to add IFAA number and shirt gender preference to members table
ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS ifaa_number TEXT,
ADD COLUMN IF NOT EXISTS shirt_gender TEXT CHECK (shirt_gender IN ('masculino', 'femenino'));

COMMENT ON COLUMN public.members.ifaa_number IS 'International Field Archery Association member number';
COMMENT ON COLUMN public.members.shirt_gender IS 'Preferred shirt cut (masculino/femenino)';
