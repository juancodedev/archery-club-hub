
-- SaaS Plans
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    interval TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Coupons
CREATE TABLE public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER,
    discount_amount DECIMAL(10,2),
    valid_until TIMESTAMPTZ,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Update Clubs Table
ALTER TABLE public.clubs ADD COLUMN plan_id UUID REFERENCES public.plans(id);
ALTER TABLE public.clubs ADD COLUMN trial_ends_at TIMESTAMPTZ;
ALTER TABLE public.clubs ADD COLUMN coupon_id UUID REFERENCES public.coupons(id);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin can manage plans" ON public.plans FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admin can manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_super_admin(auth.uid()));

-- Insert some default plans
INSERT INTO public.plans (name, description, price, features) VALUES
('Basico', 'Para clubes pequeños', 29.99, '["Hasta 50 miembros", "Soporte básico", "Reportes mensuales"]'::jsonb),
('Pro', 'Para clubes en crecimiento', 59.99, '["Miembros ilimitados", "Soporte prioritario", "Reportes detallados", "Gestión de entrenamientos"]'::jsonb),
('Premium', 'Para grandes federaciones', 99.99, '["Todo lo de Pro", "API access", "White-labeling", "Soporte 24/7"]'::jsonb);
