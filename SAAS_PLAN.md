# Plan de Implementación SaaS y Multi-tenant: QuiverApp

Este documento detalla la arquitectura, el esquema de base de datos y la configuración necesaria para el funcionamiento del modelo SaaS de QuiverApp.

## 1. Arquitectura del Sistema
El sistema utiliza un modelo **Multi-tenant con Esquema Compartido**. Cada club reside en la misma base de datos pero está aislado mediante **Row Level Security (RLS)**.

### Roles de Usuario
- **Super Administrador**: Acceso global a todos los clubes, gestión de planes, cargos extra y usuarios.
- **Administrador de Club**: Gestión total de los miembros y configuración de su propio club.
- **Arquero**: Acceso a perfil personal y registro de puntajes.

---

## 2. Esquema de Base de Datos FINAL (Nuclear Reset)

Ejecuta este SQL en el Editor de Supabase para recrear la estructura **completa** y corregida:

```sql
-- 1. LIMPIEZA TOTAL DEL ESQUEMA
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;

-- 2. TIPOS DE DATOS ENUM
CREATE TYPE public.subscription_status AS ENUM ('activo', 'pendiente', 'bloqueado');
CREATE TYPE public.club_role AS ENUM ('administrador', 'presidente', 'entrenador', 'arquero', 'socio');
CREATE TYPE public.member_status AS ENUM ('activo', 'inactivo');

-- 3. TABLAS DEL NÚCLEO SAAS
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABLAS DEL CLUB Y NEGOCIO
CREATE TABLE public.clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city TEXT,
    country TEXT,
    contact_email TEXT,
    subscription_status public.subscription_status NOT NULL DEFAULT 'activo',
    subscription_end_date DATE,
    monthly_price DECIMAL(10,2) DEFAULT 29.99,
    plan_id UUID REFERENCES public.plans(id),
    inscription_fee DECIMAL(10,2) DEFAULT 0,
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    logo_url text,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    identification TEXT,
    phone TEXT,
    address TEXT,
    medical_history text,
    guardian_name text,
    guardian_phone text,
    guardian_email text,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    status public.member_status DEFAULT 'activo',
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, club_id)
);

CREATE TABLE public.member_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    role public.club_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(member_id, role)
);

CREATE TABLE public.member_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  email text,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '48 hours'),
  used_at timestamp with time zone,
  created_by uuid REFERENCES public.members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    division TEXT,
    target_type TEXT,
    detail TEXT,
    created_by UUID REFERENCES public.members(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  enrolled_at timestamp with time zone NOT NULL DEFAULT now(),
  attended BOOLEAN DEFAULT false,
  UNIQUE(training_session_id, member_id)
);

CREATE TABLE public.scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    training_session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
    event_name TEXT,
    score_date DATE NOT NULL DEFAULT CURRENT_DATE,
    division TEXT,
    target_type TEXT,
    detail TEXT,
    ends JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_score INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.extra_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    charge_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SEGURIDAD RLS Y FUNCIONES (Robusto)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Función is_super_admin (Vital para todas las tablas)
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.super_admins WHERE user_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM auth.users WHERE id = p_user_id AND email = 'cl.jmunoz@gmail.com'
    );
$$;

-- Función is_club_admin
CREATE OR REPLACE FUNCTION public.is_club_admin(p_user_id UUID, p_club_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_roles mr
    JOIN public.members m ON m.id = mr.member_id
    WHERE m.user_id = p_user_id AND mr.club_id = p_club_id AND mr.role IN ('administrador', 'presidente')
  );
$$;

-- RLS para Planes
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "SuperAdmin plans" ON public.plans FOR ALL USING (public.is_super_admin(auth.uid()));

-- RLS para SuperAdmins
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "SuperAdmin self view" ON public.super_admins FOR SELECT USING (public.is_super_admin(auth.uid()));

-- RLS para Clubes
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth clubs select" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "SuperAdmin clubs all" ON public.clubs FOR ALL USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Club creation allow" ON public.clubs FOR INSERT WITH CHECK (true);

-- RLS para Miembros
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members select" ON public.members FOR SELECT 
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()) OR public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "Members manage" ON public.members FOR ALL 
  USING (public.is_super_admin(auth.uid()) OR public.is_club_admin(auth.uid(), club_id));

-- RLS para Invitaciones
ALTER TABLE public.member_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Manage invites" ON public.member_invitations FOR ALL 
  USING (public.is_super_admin(auth.uid()) OR public.is_club_admin(auth.uid(), club_id));
CREATE POLICY "View invite token" ON public.member_invitations FOR SELECT USING (true);

-- 6. DATOS INICIALES
INSERT INTO public.plans (name, description, price, features, display_order) VALUES 
('Básico', 'Clubes pequeños', 19.99, '["50 miembros"]'::jsonb, 1),
('Pro', 'Clubes medianos', 39.99, '["Ilimitado", "Reportes"]'::jsonb, 2),
('Elite', 'Federaciones', 79.99, '["Multi-club"]'::jsonb, 3);

-- Seed del Super Admin
INSERT INTO public.super_admins (user_id)
SELECT id FROM auth.users WHERE email = 'cl.jmunoz@gmail.com'
ON CONFLICT DO NOTHING; 
```
