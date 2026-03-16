
-- Protect subscription_status from being directly updated by club admins
-- Only super admins should be able to change subscription status
CREATE OR REPLACE FUNCTION public.protect_subscription_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If subscription_status is being changed
  IF OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    -- Only allow super admins to change it
    IF NOT public.is_super_admin(auth.uid()) THEN
      -- Revert the subscription_status change, keep other updates
      NEW.subscription_status := OLD.subscription_status;
    END IF;
  END IF;
  
  -- Also protect subscription_end_date
  IF OLD.subscription_end_date IS DISTINCT FROM NEW.subscription_end_date THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      NEW.subscription_end_date := OLD.subscription_end_date;
    END IF;
  END IF;

  -- Also protect plan_id changes by non-super-admins
  IF OLD.plan_id IS DISTINCT FROM NEW.plan_id THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      NEW.plan_id := OLD.plan_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_club_subscription
BEFORE UPDATE ON public.clubs
FOR EACH ROW
EXECUTE FUNCTION public.protect_subscription_status();
