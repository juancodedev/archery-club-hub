-- Add gestor_torneos to club_role enum
ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'gestor_torneos';

-- Tournament registrations table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'confirmado', 'rechazado')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tournament_id, member_id)
);

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- Members can read registrations for tournaments in their club
CREATE POLICY "Members can read registrations" ON public.tournament_registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            JOIN public.members m ON m.club_id = t.club_id
            WHERE t.id = tournament_id AND m.user_id = auth.uid()
        )
    );

-- Members can register themselves
CREATE POLICY "Members can register themselves" ON public.tournament_registrations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_id AND m.user_id = auth.uid()
        )
    );

-- Members can cancel their own registration (delete)
CREATE POLICY "Members can cancel own registration" ON public.tournament_registrations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.id = member_id AND m.user_id = auth.uid()
        )
    );

-- Gestor torneos / admin can update registration status
CREATE POLICY "Managers can update registration status" ON public.tournament_registrations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.members m
            WHERE m.user_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM public.member_roles mr
                WHERE mr.member_id = m.id
                AND mr.role IN ('gestor_torneos', 'administrador', 'presidente')
            )
        )
    );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_tournament_registration_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_tournament_registrations_updated_at
    BEFORE UPDATE ON public.tournament_registrations
    FOR EACH ROW EXECUTE FUNCTION public.update_tournament_registration_updated_at();
