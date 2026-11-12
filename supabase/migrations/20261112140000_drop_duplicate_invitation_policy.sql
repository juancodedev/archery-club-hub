-- 20260603000000 recreated "Admin manage invitations", which duplicates
-- "Admin manage member invitations" (20260309184000): both allow club admins
-- and super admins only. Keep the original, which also states WITH CHECK.
DROP POLICY IF EXISTS "Admin manage invitations" ON public.member_invitations;
