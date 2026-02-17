-- Sistema de notificaciones para cambio automático de división

-- Tabla de notificaciones de cambio de división
CREATE TABLE public.division_change_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  old_division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL,
  new_division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  change_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.division_change_notifications ENABLE ROW LEVEL SECURITY;

-- RLS para notificaciones
CREATE POLICY "Members can read own division notifications" ON public.division_change_notifications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND m.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.is_club_admin(auth.uid(), m.club_id))
  );

CREATE POLICY "Admin can manage division notifications" ON public.division_change_notifications FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.is_club_admin(auth.uid(), m.club_id))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.members m WHERE m.id = member_id AND public.is_club_admin(auth.uid(), m.club_id))
  );

-- Función para calcular división apropiada por edad
CREATE OR REPLACE FUNCTION public.calculate_division_by_age(
  p_birth_date DATE,
  p_gender TEXT DEFAULT NULL,
  p_bow_type TEXT DEFAULT 'recurvo'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_age INTEGER;
  v_division_id UUID;
BEGIN
  -- Calcular edad
  v_age := EXTRACT(YEAR FROM AGE(CURRENT_DATE, p_birth_date));
  
  -- Lógica de asignación de división (simplificada)
  -- En producción, esto debería ser más sofisticado
  IF v_age < 15 THEN
    -- Cadete
    SELECT id INTO v_division_id FROM public.divisions 
    WHERE LOWER(name) LIKE '%cadete%' 
    AND LOWER(name) LIKE '%' || LOWER(p_bow_type) || '%'
    AND is_system = true
    LIMIT 1;
  ELSIF v_age < 18 THEN
    -- Junior
    SELECT id INTO v_division_id FROM public.divisions 
    WHERE LOWER(name) LIKE '%junior%' 
    AND LOWER(name) LIKE '%' || LOWER(p_bow_type) || '%'
    AND is_system = true
    LIMIT 1;
  ELSE
    -- Senior - considerar género si está disponible
    IF p_gender IS NOT NULL THEN
      SELECT id INTO v_division_id FROM public.divisions 
      WHERE LOWER(name) LIKE '%' || LOWER(p_bow_type) || '%'
      AND (
        (p_gender = 'M' AND LOWER(name) LIKE '%masculino%')
        OR (p_gender = 'F' AND LOWER(name) LIKE '%femenino%')
      )
      AND is_system = true
      LIMIT 1;
    END IF;
    
    -- Si no hay división específica por género, usar genérica
    IF v_division_id IS NULL THEN
      SELECT id INTO v_division_id FROM public.divisions 
      WHERE LOWER(name) = LOWER(p_bow_type)
      AND is_system = true
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN v_division_id;
END;
$$;

-- Función para actualizar divisiones automáticamente
CREATE OR REPLACE FUNCTION public.auto_update_member_divisions()
RETURNS TABLE(member_id UUID, old_division_name TEXT, new_division_name TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  member_record RECORD;
  new_division_id UUID;
  old_division_id UUID;
BEGIN
  -- Buscar miembros cuya división expira hoy
  FOR member_record IN
    SELECT DISTINCT 
      m.id as member_id,
      m.full_name,
      m.date_of_birth,
      md.division_id as current_division_id,
      md.valid_until,
      d.name as current_division_name
    FROM public.members m
    JOIN public.member_divisions md ON md.member_id = m.id
    JOIN public.divisions d ON d.id = md.division_id
    WHERE md.valid_until = CURRENT_DATE
    AND m.date_of_birth IS NOT NULL
  LOOP
    -- Calcular nueva división basada en edad
    new_division_id := public.calculate_division_by_age(
      member_record.date_of_birth,
      NULL, -- TODO: agregar campo gender a members si se necesita
      'recurvo' -- TODO: detectar tipo de arco del miembro
    );
    
    IF new_division_id IS NOT NULL AND new_division_id != member_record.current_division_id THEN
      -- Actualizar la división actual marcándola como finalizada
      UPDATE public.member_divisions
      SET valid_until = CURRENT_DATE
      WHERE member_id = member_record.member_id
      AND division_id = member_record.current_division_id;
      
      -- Crear nueva entrada con la nueva división
      INSERT INTO public.member_divisions (
        member_id,
        division_id,
        is_primary,
        valid_from,
        valid_until
      ) VALUES (
        member_record.member_id,
        new_division_id,
        true,
        CURRENT_DATE + 1,
        CURRENT_DATE + INTERVAL '1 year'
      );
      
      -- Crear notificación
      INSERT INTO public.division_change_notifications (
        member_id,
        old_division_id,
        new_division_id,
        change_date,
        reason
      ) VALUES (
        member_record.member_id,
        member_record.current_division_id,
        new_division_id,
        CURRENT_DATE,
        'Cambio automático por cumplimiento de edad'
      );
      
      -- Retornar información del cambio
      RETURN QUERY
      SELECT 
        member_record.member_id,
        member_record.current_division_name,
        d.name
      FROM public.divisions d
      WHERE d.id = new_division_id;
    END IF;
  END LOOP;
END;
$$;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION public.acknowledge_division_notification(p_notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.division_change_notifications
  SET acknowledged_at = now()
  WHERE id = p_notification_id
  AND EXISTS (
    SELECT 1 FROM public.members m 
    WHERE m.id = division_change_notifications.member_id 
    AND m.user_id = auth.uid()
  );
END;
$$;

-- Índices para performance
CREATE INDEX idx_division_notifications_member_id ON public.division_change_notifications(member_id);
CREATE INDEX idx_division_notifications_unread ON public.division_change_notifications(member_id, acknowledged_at) WHERE acknowledged_at IS NULL;

-- Comentarios
COMMENT ON TABLE public.division_change_notifications IS 'Notificaciones de cambios automáticos o manuales de división';
COMMENT ON FUNCTION public.calculate_division_by_age IS 'Calcula la división apropiada según edad del arquero';
COMMENT ON FUNCTION public.auto_update_member_divisions IS 'Función para ejecutar diariamente - actualiza divisiones que expiran';
COMMENT ON FUNCTION public.acknowledge_division_notification IS 'Marca una notificación de cambio de división como leída';
