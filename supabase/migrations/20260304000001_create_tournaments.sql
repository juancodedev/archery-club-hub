-- Migration to create the tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    location TEXT,
    tournament_type_id UUID REFERENCES public.tournament_types(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.members(id)
);

-- Enable RLS
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone in the club can read tournaments" ON public.tournaments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.members 
            WHERE members.club_id = tournaments.club_id 
            AND members.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage tournaments" ON public.tournaments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.member_roles mr
            JOIN public.members m ON m.id = mr.member_id
            WHERE m.user_id = auth.uid() 
            AND mr.club_id = tournaments.club_id 
            AND mr.role IN ('administrador', 'presidente', 'entrenador')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.member_roles mr
            JOIN public.members m ON m.id = mr.member_id
            WHERE m.user_id = auth.uid() 
            AND mr.club_id = tournaments.club_id 
            AND mr.role IN ('administrador', 'presidente', 'entrenador')
        )
    );
