
-- Fix receipts bucket INSERT policy to validate club ownership
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;

CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  public.can_view_club_finances(auth.uid(), (storage.foldername(name))[1]::uuid)
);
