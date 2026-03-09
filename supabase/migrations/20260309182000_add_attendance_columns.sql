-- ============================================================
-- ADD ATTENDANCE COLUMNS TO TRAINING_SESSIONS
-- ============================================================

ALTER TABLE public.training_sessions 
  ADD COLUMN IF NOT EXISTS attendance_token TEXT,
  ADD COLUMN IF NOT EXISTS attendance_token_expires TIMESTAMPTZ;

-- Reload cache
NOTIFY pgrst, 'reload schema';
