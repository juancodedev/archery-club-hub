-- Row-level security decides which rows a caller can write, not which columns.
-- "Members update own" and "Admin can manage members" therefore let API users
-- change columns that grant privileges, including is_super_admin.
--
-- This function is deliberately not SECURITY DEFINER: current_user must stay the
-- caller's role. It is 'authenticated' or 'anon' for API requests, 'service_role'
-- for edge functions, and the owner inside SECURITY DEFINER functions. Only API
-- users are restricted, so registration and invitation flows keep working.
CREATE OR REPLACE FUNCTION public.protect_member_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  v_caller_id := auth.uid();

  IF public.is_super_admin(v_caller_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.is_super_admin IS TRUE THEN
      RAISE EXCEPTION 'No tienes permisos para asignar el rol de super administrador'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Linking a new row to an existing account would let a club admin reach that
    -- account through admin_reset_user_password. Accounts are linked by
    -- create_member_account_by_admin and the invitation flows, which bypass this.
    IF NEW.user_id IS NOT NULL THEN
      RAISE EXCEPTION 'No tienes permisos para vincular un socio a una cuenta existente'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
  END IF;

  IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
    RAISE EXCEPTION 'No tienes permisos para modificar el rol de super administrador'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.club_id IS DISTINCT FROM OLD.club_id THEN
    RAISE EXCEPTION 'No tienes permisos para cambiar el club de un socio'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'No tienes permisos para cambiar la cuenta vinculada a un socio'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.is_club_admin(v_caller_id, OLD.club_id) THEN
    RAISE EXCEPTION 'No tienes permisos para cambiar el estado de un socio'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_member_privileged_columns ON public.members;
CREATE TRIGGER protect_member_privileged_columns
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_member_privileged_columns();
