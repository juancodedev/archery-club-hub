-- SuperAdmin Finance Privacy

-- 1. Add privacy toggle to clubs table
ALTER TABLE public.clubs 
ADD COLUMN IF NOT EXISTS allow_superadmin_finances BOOLEAN DEFAULT false;

-- 2. Create a cleaner function to check finance access
CREATE OR REPLACE FUNCTION public.can_view_club_finances(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- 1. Check if user is a direct club admin or treasurer (always allowed)
    IF EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.members m ON m.id = mr.member_id
        WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id 
        AND mr.role IN ('administrador', 'presidente', 'tesorero')
    ) THEN
        RETURN true;
    END IF;

    -- 2. Check if user is a Super Admin AND the club allows it
    IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true) THEN
        RETURN EXISTS (SELECT 1 FROM public.clubs WHERE id = p_club_id AND allow_superadmin_finances = true);
    END IF;

    RETURN false;
END;
$$;

-- 3. Update RLS policies for financial_entries
DROP POLICY IF EXISTS "financial_entries_admin_all" ON public.financial_entries;
CREATE POLICY "financial_entries_admin_all" ON public.financial_entries
    FOR ALL TO authenticated
    USING (public.can_view_club_finances(auth.uid(), club_id))
    WITH CHECK (public.can_view_club_finances(auth.uid(), club_id));

-- 4. Update RLS for storage (receipts)
DROP POLICY IF EXISTS "Users can view receipts from their club" ON storage.objects;
CREATE POLICY "Users can view receipts from their club"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND 
  public.can_view_club_finances(auth.uid(), (storage.foldername(name))[1]::uuid)
);
