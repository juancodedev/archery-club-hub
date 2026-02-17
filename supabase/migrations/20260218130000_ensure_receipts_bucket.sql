-- Ensure receipts storage bucket exists and is correctly configured

INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS Policies for the receipts bucket (refined)
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Users can view receipts from their club" ON storage.objects;
CREATE POLICY "Users can view receipts from their club"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND 
  public.can_view_club_finances(auth.uid(), (storage.foldername(name))[1]::uuid)
);

DROP POLICY IF EXISTS "Users can delete their club receipts" ON storage.objects;
CREATE POLICY "Users can delete their club receipts"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'receipts' AND 
  public.can_view_club_finances(auth.uid(), (storage.foldername(name))[1]::uuid)
);
