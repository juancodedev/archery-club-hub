
-- Add new fields to members table
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS shirt_size TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS windbreaker_size TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Update validation trigger to include new fields
CREATE OR REPLACE FUNCTION public.validate_member_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(trim(NEW.full_name)) < 2 OR length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'Full name must be between 2 and 200 characters';
  END IF;
  IF NEW.email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 50 THEN
    RAISE EXCEPTION 'Phone number too long';
  END IF;
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address too long';
  END IF;
  IF NEW.identification IS NOT NULL AND length(NEW.identification) > 50 THEN
    RAISE EXCEPTION 'Identification too long';
  END IF;
  IF NEW.medical_history IS NOT NULL AND length(NEW.medical_history) > 2000 THEN
    RAISE EXCEPTION 'Medical history too long';
  END IF;
  IF NEW.guardian_name IS NOT NULL AND length(NEW.guardian_name) > 200 THEN
    RAISE EXCEPTION 'Guardian name too long';
  END IF;
  IF NEW.guardian_phone IS NOT NULL AND length(NEW.guardian_phone) > 50 THEN
    RAISE EXCEPTION 'Guardian phone too long';
  END IF;
  IF NEW.guardian_email IS NOT NULL AND NEW.guardian_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Invalid guardian email format';
  END IF;
  
  -- NEW FIELDS VALIDATION
  IF NEW.emergency_contact_name IS NOT NULL AND length(NEW.emergency_contact_name) > 200 THEN
    RAISE EXCEPTION 'Emergency contact name too long';
  END IF;
  IF NEW.emergency_contact_phone IS NOT NULL AND length(NEW.emergency_contact_phone) > 50 THEN
    RAISE EXCEPTION 'Emergency contact phone too long';
  END IF;
  IF NEW.display_name IS NOT NULL AND length(NEW.display_name) > 100 THEN
    RAISE EXCEPTION 'Display name (Nombre Pila) too long';
  END IF;

  NEW.full_name := trim(NEW.full_name);
  NEW.email := trim(NEW.email);
  RETURN NEW;
END;
$$;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
