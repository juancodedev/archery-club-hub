-- ============================================================
-- FINANCIAL SUPPORT ACCESS v1.0
-- ============================================================

-- 1. Add columns to clubs if they don't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = 'allow_superadmin_finances') THEN
    ALTER TABLE public.clubs ADD COLUMN allow_superadmin_finances BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clubs' AND column_name = 'financial_support_expires_at') THEN
    ALTER TABLE public.clubs ADD COLUMN financial_support_expires_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. Create helper function for financial access
CREATE OR REPLACE FUNCTION public.can_access_financials(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- 1. Check if user is explicit club admin, president or treasurer
  IF EXISTS (
    SELECT 1 FROM public.member_roles mr
    WHERE mr.club_id = p_club_id
      AND mr.role IN ('administrador'::public.club_role, 'presidente'::public.club_role, 'tesorero'::public.club_role)
      AND mr.member_id IN (
        SELECT id FROM public.members WHERE user_id = p_user_id
      )
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check if user is super admin AND has active support window
  -- Access is granted if allow_superadmin_finances is true AND (it has no expiration or it hasn't expired yet)
  IF public.is_super_admin(p_user_id) THEN
    RETURN EXISTS (
      SELECT 1 FROM public.clubs 
      WHERE id = p_club_id 
        AND allow_superadmin_finances = true 
        AND (financial_support_expires_at IS NULL OR financial_support_expires_at > now())
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- 3. Update RLS policies for financial_entries
DROP POLICY IF EXISTS "Financial visibility and manage" ON public.financial_entries;

CREATE POLICY "Financial visibility and manage" ON public.financial_entries
  FOR ALL TO authenticated
  USING (public.can_access_financials(auth.uid(), club_id))
  WITH CHECK (public.can_access_financials(auth.uid(), club_id));

-- 4. Grant execute on the new function
GRANT EXECUTE ON FUNCTION public.can_access_financials(UUID, UUID) TO authenticated;

-- 5. Reload cache
NOTIFY pgrst, 'reload schema';
