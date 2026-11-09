-- The application resets passwords through the email recovery flow and no longer
-- calls admin_reset_user_password, so it should not be reachable through the API.
-- PUBLIC must be revoked too: functions are executable by PUBLIC by default, and
-- anon and authenticated inherit that grant.
REVOKE EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
