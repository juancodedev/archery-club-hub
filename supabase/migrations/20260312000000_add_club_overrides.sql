-- ============================================================
-- ACTUALIZACIÓN DE INVITACIONES Y TRAZABILIDAD v1.0
-- ============================================================

-- 1. Actualizar tabla de miembros para rastrear el origen (invitación)
ALTER TABLE IF EXISTS public.members 
ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES public.member_invitations(id) ON DELETE SET NULL;

-- 2. Expandir tabla de invitaciones para soportar links genéricos
ALTER TABLE IF EXISTS public.member_invitations
ADD COLUMN IF NOT EXISTS max_uses INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS invitation_type TEXT DEFAULT 'individual' CHECK (invitation_type IN ('individual', 'generic')),
ADD COLUMN IF NOT EXISTS title TEXT;

-- 3. Crear índice para búsqueda rápida por invitación
CREATE INDEX IF NOT EXISTS idx_members_invitation_id ON public.members(invitation_id);

-- 4. Actualizar RLS si es necesario (ya deberían estar habilitados por defecto, pero asegurarse de que SuperAdmin puede todo)
-- Nota: La baseline ya tiene habilitado RLS por defecto en todas las tablas de public.
