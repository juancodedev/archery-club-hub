-- ============================================================
-- ADD TRAINING TYPES AND METADATA TO TRAINING_SESSIONS
-- ============================================================

-- Create Enum for training types if not exists
DO $$ BEGIN
    CREATE TYPE public.training_type AS ENUM ('libre', 'estandar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add columns to training_sessions
ALTER TABLE public.training_sessions 
  ADD COLUMN IF NOT EXISTS training_type public.training_type DEFAULT 'libre',
  ADD COLUMN IF NOT EXISTS rounds_config JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS weather TEXT,
  ADD COLUMN IF NOT EXISTS wind_direction TEXT,
  ADD COLUMN IF NOT EXISTS wind_speed TEXT,
  ADD COLUMN IF NOT EXISTS bow_info TEXT,
  ADD COLUMN IF NOT EXISTS arrow_info TEXT,
  ADD COLUMN IF NOT EXISTS arrow_numbers BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS location TEXT;

-- Update existing records to 'libre' (already handled by default but safe to ensure)
UPDATE public.training_sessions SET training_type = 'libre' WHERE training_type IS NULL;

-- Reload cache
NOTIFY pgrst, 'reload schema';
