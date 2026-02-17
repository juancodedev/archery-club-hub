
-- Refine storage policies for avatars to be more robust
-- Explicitly allow authenticated users and verify path structure

DROP POLICY IF EXISTS "Anyone can upload their own avatar" ON storage.objects;
CREATE POLICY "Anyone can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can update their own avatar" ON storage.objects;
CREATE POLICY "Anyone can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Anyone can delete their own avatar" ON storage.objects;
CREATE POLICY "Anyone can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Ensure public access is still there
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');
