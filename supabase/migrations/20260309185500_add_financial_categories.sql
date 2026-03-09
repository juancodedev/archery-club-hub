-- ============================================================
-- ADD FINANCIAL CATEGORIES
-- ============================================================

-- Create financial_categories table
CREATE TABLE IF NOT EXISTS public.financial_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(club_id, name, type)
);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage club financial categories"
    ON public.financial_categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.member_roles
            WHERE member_roles.member_id IN (
                SELECT id FROM public.members WHERE user_id = auth.uid()
            )
            AND member_roles.club_id = financial_categories.club_id
            AND member_roles.role IN ('administrador', 'presidente', 'tesorero')
        )
        OR 
        (SELECT is_super_admin FROM public.members WHERE user_id = auth.uid() LIMIT 1) = true
    );

CREATE POLICY "Members can view club financial categories"
    ON public.financial_categories
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.members
            WHERE user_id = auth.uid()
            AND club_id = financial_categories.club_id
        )
        OR 
        (SELECT is_super_admin FROM public.members WHERE user_id = auth.uid() LIMIT 1) = true
    );

-- Insert default categories for existing clubs
INSERT INTO public.financial_categories (club_id, name, type)
SELECT id, cat, 'income'
FROM public.clubs, UNNEST(ARRAY['Membresía', 'Otros Pagos', 'Torneo', 'Venta Equipamiento', 'Capacitación']) cat
ON CONFLICT DO NOTHING;

INSERT INTO public.financial_categories (club_id, name, type)
SELECT id, cat, 'expense'
FROM public.clubs, UNNEST(ARRAY['Mantenimiento', 'Alquiler', 'Equipamiento', 'Premiación', 'Servicios', 'Insumos']) cat
ON CONFLICT DO NOTHING;
