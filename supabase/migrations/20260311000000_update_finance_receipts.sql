-- Migration to add multiple receipt support to financial entries
ALTER TABLE public.financial_entries ADD COLUMN IF NOT EXISTS receipt_urls JSONB DEFAULT '[]'::jsonb;

-- Migrate existing receipt_url to the new receipt_urls array
UPDATE public.financial_entries 
SET receipt_urls = jsonb_build_array(receipt_url)
WHERE receipt_url IS NOT NULL AND (receipt_urls IS NULL OR jsonb_array_length(receipt_urls) = 0);

COMMENT ON COLUMN public.financial_entries.receipt_urls IS 'Array of URLs for receipts/evidence files.';
