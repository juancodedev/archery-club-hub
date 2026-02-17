-- Finance Management and Security Updates

-- 1. Update is_club_admin to support superadmins
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Los Super Admins son administradores de cualquier club
    IF EXISTS (SELECT 1 FROM public.members WHERE user_id = p_user_id AND is_super_admin = true) THEN
        RETURN true;
    END IF;

    -- Verificar rol administrativo en el club
    RETURN EXISTS (
        SELECT 1 FROM public.member_roles mr
        JOIN public.members m ON m.id = mr.member_id
        WHERE m.user_id = p_user_id 
        AND mr.club_id = p_club_id 
        AND mr.role IN ('administrador', 'presidente')
    );
END;
$$;

-- 2. Create financial_entries table
CREATE TABLE IF NOT EXISTS public.financial_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Enable RLS
ALTER TABLE public.financial_entries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for financial_entries
DROP POLICY IF EXISTS "financial_entries_admin_all" ON public.financial_entries;
CREATE POLICY "financial_entries_admin_all" ON public.financial_entries
    FOR ALL TO authenticated
    USING (
        public.is_club_admin(auth.uid(), club_id) 
        OR public.has_club_role(auth.uid(), club_id, 'tesorero')
    )
    WITH CHECK (
        public.is_club_admin(auth.uid(), club_id) 
        OR public.has_club_role(auth.uid(), club_id, 'tesorero')
    );

-- 5. Grant access
GRANT ALL ON public.financial_entries TO authenticated;

-- 6. Storage Bucket for Receipts
-- Note: This is usually done via SQL or Supabase Dashboard. 
-- In migrations, we can try to use storage schema if it's available.
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for receipts bucket
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
CREATE POLICY "Authenticated users can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'receipts');

DROP POLICY IF EXISTS "Users can view receipts from their club" ON storage.objects;
CREATE POLICY "Users can view receipts from their club"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'receipts' AND (
    public.is_club_admin(auth.uid(), (storage.foldername(name))[1]::uuid) OR
    public.has_club_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'tesorero')
  )
);
-- Note: Folder name logic assumes we store images as club_id/filename
