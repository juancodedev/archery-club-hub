
-- 1. Fix is_super_admin function: remove hardcoded email check
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
SELECT EXISTS (
  SELECT 1 FROM public.super_admins WHERE user_id = p_user_id
);
$function$;

-- 2. Fix system_settings RLS: remove hardcoded email from "SuperAdmin system settings all"
DROP POLICY IF EXISTS "SuperAdmin system settings all" ON public.system_settings;
CREATE POLICY "SuperAdmin system settings all"
ON public.system_settings
FOR ALL
USING (is_super_admin(auth.uid()));

-- 3. Fix contact_requests RLS: remove hardcoded email from SELECT policy
DROP POLICY IF EXISTS "Club admins can see own contact requests" ON public.contact_requests;
CREATE POLICY "Club admins can see own contact requests"
ON public.contact_requests
FOR SELECT
USING (is_club_admin(auth.uid(), club_id) OR is_super_admin(auth.uid()));

-- 4. Fix contact_requests RLS: remove hardcoded email from ALL policy
DROP POLICY IF EXISTS "SuperAdmin all contact requests" ON public.contact_requests;
CREATE POLICY "SuperAdmin all contact requests"
ON public.contact_requests
FOR ALL
USING (is_super_admin(auth.uid()));
