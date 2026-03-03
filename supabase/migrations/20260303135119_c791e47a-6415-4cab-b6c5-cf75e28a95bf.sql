
-- Drop the obsolete get_club_default_password function
DROP FUNCTION IF EXISTS public.get_club_default_password(uuid);

-- Drop the default_member_password column from clubs table
ALTER TABLE public.clubs DROP COLUMN IF EXISTS default_member_password;
