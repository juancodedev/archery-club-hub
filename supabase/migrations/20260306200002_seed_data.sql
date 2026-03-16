-- ============================================================
-- SEED DATA v1.0
-- ============================================================

-- 1. SaaS Plans
INSERT INTO public.plans (name, description, price, features, display_order) VALUES
('Basico', 'Para clubes pequeños', 29.99, '["Hasta 50 miembros", "Soporte básico", "Reportes mensuales"]'::jsonb, 1),
('Pro', 'Para clubes en crecimiento', 59.99, '["Miembros ilimitados", "Soporte prioritario", "Reportes detallados", "Gestión de entrenamientos"]'::jsonb, 2),
('Premium', 'Para grandes federaciones', 99.99, '["Todo lo de Pro", "API access", "White-labeling", "Soporte 24/7"]'::jsonb, 3)
ON CONFLICT DO NOTHING;

-- 2. System Divisions (World Archery standard)
INSERT INTO public.divisions (name, abbreviation, description, is_system, active) VALUES
  ('Recurvo', 'RC', 'Arco recurvo olímpico', true, true),
  ('Compuesto', 'CO', 'Arco compuesto con mira y estabilizadores', true, true),
  ('Arco Desnudo', 'BB', 'Barebow - sin mira ni estabilizadores', true, true),
  ('Longbow', 'LB', 'Arco tradicional largo', true, true),
  ('Recurvo Junior', 'RCJ', 'Arco recurvo - categoría junior', true, true),
  ('Compuesto Junior', 'COJ', 'Arco compuesto - categoría junior', true, true),
  ('Recurvo Cadete', 'RCC', 'Arco recurvo - categoría cadete', true, true),
  ('Compuesto Cadete', 'COC', 'Arco compuesto - categoría cadete', true, true),
  ('Recurvo Masculino', 'RCM', 'Arco recurvo - rama masculina', true, true),
  ('Recurvo Femenino', 'RCF', 'Arco recurvo - rama femenina', true, true),
  ('Compuesto Masculino', 'COM', 'Arco compuesto - rama masculina', true, true),
  ('Compuesto Femenino', 'COF', 'Arco compuesto - rama femenina', true, true)
ON CONFLICT (name, club_id) DO NOTHING;

-- 3. System Tournament Types
INSERT INTO public.tournament_types (name, description, arrows_per_end, ends_per_round, distance_meters, target_size_cm, is_indoor, is_system, active) VALUES
  ('Indoor 18m', 'Torneo indoor a 18 metros con cara de 40cm (3 zonas)', 3, 20, 18, 40, true, true, true),
  ('Indoor 18m (5 flechas)', 'Torneo indoor a 18 metros - 5 flechas por serie', 5, 12, 18, 40, true, true, true),
  ('Outdoor 70m', 'Torneo outdoor a 70 metros con cara de 122cm', 6, 12, 70, 122, false, true, true),
  ('Outdoor 60m', 'Torneo outdoor a 60 metros', 6, 12, 60, 122, false, true, true),
  ('Outdoor 50m', 'Torneo outdoor a 50 metros', 6, 12, 50, 122, false, true, true),
  ('Outdoor 30m', 'Torneo outdoor a 30 metros', 6, 12, 30, 80, false, true, true),
  ('Field Archery', 'Tiro de campo - recorrido en terreno natural', 3, 24, NULL, NULL, false, true, true),
  ('3D Archery', 'Tiro 3D - figuras de animales', 1, 30, NULL, NULL, false, true, true),
  ('Entrenamiento Libre', 'Sesión de entrenamiento sin formato específico', 6, 10, NULL, NULL, false, true, true)
ON CONFLICT (name, club_id) DO NOTHING;
