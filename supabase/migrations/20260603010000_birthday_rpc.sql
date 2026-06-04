-- ============================================================
-- SERVER-SIDE BIRTHDAY QUERY
-- ============================================================
-- Replaces client-side filtering that downloaded ALL members
-- to find today's birthdays. This RPC filters in PostgreSQL.

CREATE OR REPLACE FUNCTION public.get_todays_birthdays(p_club_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  date_of_birth DATE,
  avatar_url TEXT
)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT m.id, m.full_name, m.date_of_birth, m.avatar_url
  FROM public.members m
  WHERE m.club_id = p_club_id
    AND m.status = 'activo'
    AND m.date_of_birth IS NOT NULL
    AND EXTRACT(MONTH FROM m.date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(DAY FROM m.date_of_birth) = EXTRACT(DAY FROM CURRENT_DATE)
  ORDER BY m.full_name;
$$;

-- Allow authenticated users to call it
GRANT EXECUTE ON FUNCTION public.get_todays_birthdays(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
