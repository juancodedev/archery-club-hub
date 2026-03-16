
-- 1. Enable RLS on extra_charges and add policies
ALTER TABLE public.extra_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extra_charges_select" ON public.extra_charges
FOR SELECT USING (public.is_super_admin(auth.uid()) OR public.is_club_admin(auth.uid(), club_id));

CREATE POLICY "extra_charges_manage" ON public.extra_charges
FOR ALL USING (public.is_super_admin(auth.uid()) OR public.is_club_admin(auth.uid(), club_id))
WITH CHECK (public.is_super_admin(auth.uid()) OR public.is_club_admin(auth.uid(), club_id));

-- 2. Restrict system_settings SELECT to super admins only
DROP POLICY IF EXISTS "Public system settings read" ON public.system_settings;
CREATE POLICY "Super admin reads system settings" ON public.system_settings
FOR SELECT USING (public.is_super_admin(auth.uid()));

-- 3. Restrict avatars bucket to authenticated users only
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated can view avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

-- 4. Fix public_clubs_view - recreate as SECURITY INVOKER
DROP VIEW IF EXISTS public.public_clubs_view;
CREATE VIEW public.public_clubs_view WITH (security_invoker = true) AS
SELECT id, name, city, country, logo_url, inscription_fee, monthly_fee
FROM public.clubs;
GRANT SELECT ON public.public_clubs_view TO anon, authenticated;

-- 5. Add scores ends validation trigger (using trigger instead of CHECK for flexibility)
CREATE OR REPLACE FUNCTION public.validate_score_ends()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF jsonb_typeof(NEW.ends) != 'array' THEN
    RAISE EXCEPTION 'El campo ends debe ser un array JSON';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_score_ends_trigger
BEFORE INSERT OR UPDATE ON public.scores
FOR EACH ROW
EXECUTE FUNCTION public.validate_score_ends();
