-- Migration: fix_rls_and_permissions.sql

-- 1. Grant explicit permissions to authenticated and service_role
GRANT ALL ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
GRANT ALL ON public.contact_requests TO authenticated;
GRANT ALL ON public.contact_requests TO service_role;

-- 2. Drop and recreate policies for system_settings to be more robust
DROP POLICY IF EXISTS "Public system settings read" ON public.system_settings;
DROP POLICY IF EXISTS "SuperAdmin system settings all" ON public.system_settings;

CREATE POLICY "Public system settings read" ON public.system_settings 
FOR SELECT USING (true);

-- Allow system owner and superadmins full access
CREATE POLICY "SuperAdmin system settings all" ON public.system_settings 
FOR ALL USING (
    public.is_super_admin(auth.uid()) OR 
    (SELECT email FROM public.members WHERE user_id = auth.uid()) = 'cl.jmunoz@gmail.com'
);

-- 3. Drop and recreate policies for contact_requests
DROP POLICY IF EXISTS "Club admins can see own contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "Club admins can create contact requests" ON public.contact_requests;
DROP POLICY IF EXISTS "SuperAdmin all contact requests" ON public.contact_requests;

CREATE POLICY "Club admins can see own contact requests" ON public.contact_requests 
FOR SELECT USING (
    public.is_club_admin(auth.uid(), club_id) OR 
    public.is_super_admin(auth.uid()) OR
    (SELECT email FROM public.members WHERE user_id = auth.uid()) = 'cl.jmunoz@gmail.com'
);

CREATE POLICY "Club admins can create contact requests" ON public.contact_requests 
FOR INSERT WITH CHECK (
    public.is_club_admin(auth.uid(), club_id)
);

CREATE POLICY "SuperAdmin all contact requests" ON public.contact_requests 
FOR ALL USING (
    public.is_super_admin(auth.uid()) OR
    (SELECT email FROM public.members WHERE user_id = auth.uid()) = 'cl.jmunoz@gmail.com'
);

-- 4. Ensure initial data exists if table is empty
INSERT INTO public.system_settings (mercadopago_mode, annual_discount_percentage)
SELECT 'fictitious', 20
WHERE NOT EXISTS (SELECT 1 FROM public.system_settings);

-- 5. Explicitly mark the system owner as super_admin for safety
UPDATE public.members 
SET is_super_admin = true 
WHERE email = 'cl.jmunoz@gmail.com';
