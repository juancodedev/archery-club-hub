
-- Fix: Remove overly permissive INSERT on clubs since register_club function is SECURITY DEFINER
DROP POLICY "Authenticated can create clubs" ON public.clubs;
