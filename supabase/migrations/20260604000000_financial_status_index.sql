-- ============================================================
-- INDEX SUPPORT FOR FINANCIAL STATUS QUERY
-- ============================================================
-- Supports the optimized AdminPage query that filters by
-- club_id + payment_year + category instead of fetching ALL entries.

CREATE INDEX IF NOT EXISTS idx_financial_entries_club_year_category
  ON public.financial_entries(club_id, payment_year DESC, category);

NOTIFY pgrst, 'reload schema';
