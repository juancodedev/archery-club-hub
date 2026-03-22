-- reset_passwords_by_club.sql
-- Ejecutar directamente en Supabase SQL Editor.
--
-- Objetivo:
-- 1) Previsualizar usuarios de un club que seran reseteados
-- 2) Resetear su password en auth.users de forma masiva
--
-- IMPORTANTE:
-- - Este script NO envia correo de recuperacion.
-- - Este script cambia la password directamente en auth.users.
-- - Deja el flujo del sistema intacto (no modifica funciones ni tablas).

-- ============================================================
-- 1) PARAMETROS (EDITAR)
-- ============================================================
-- Reemplaza los valores del INSERT antes de ejecutar.
-- Este formato SI es compatible con Supabase SQL Editor.

DROP TABLE IF EXISTS tmp_reset_password_params;
CREATE TEMP TABLE tmp_reset_password_params (
  club_id uuid NOT NULL,
  only_active boolean NOT NULL,
  use_club_default_password boolean NOT NULL,
  manual_password text,
  dry_run boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO tmp_reset_password_params (
  club_id,
  only_active,
  use_club_default_password,
  manual_password,
  dry_run
)
VALUES (
  'REEMPLAZAR_UUID_CLUB'::uuid,
  true,
  true,
  'Temporal#2026',
  true
);


-- ============================================================
-- 2) PREVIEW DE USUARIOS AFECTADOS
-- ============================================================
WITH target_members AS (
  SELECT
    m.id AS member_id,
    m.user_id,
    m.full_name,
    m.email,
    m.status
  FROM public.members m
  JOIN tmp_reset_password_params p ON p.club_id = m.club_id
  WHERE m.club_id = p.club_id
    AND m.user_id IS NOT NULL
    AND (
      p.only_active = false
      OR m.status = 'activo'
    )
)
SELECT *
FROM target_members
ORDER BY full_name;


-- ============================================================
-- 3) EJECUCION (DRY RUN / REAL)
-- ============================================================
DO $$
DECLARE
  v_club_id uuid;
  v_only_active boolean;
  v_use_default boolean;
  v_manual_password text;
  v_dry_run boolean;

  v_effective_password text;
  v_updated_count integer := 0;
BEGIN
  SELECT
    p.club_id,
    p.only_active,
    p.use_club_default_password,
    p.manual_password,
    p.dry_run
  INTO
    v_club_id,
    v_only_active,
    v_use_default,
    v_manual_password,
    v_dry_run
  FROM tmp_reset_password_params p
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'No hay parametros en tmp_reset_password_params';
  END IF;

  IF v_use_default THEN
    SELECT NULLIF(c.default_member_password, '')
      INTO v_effective_password
    FROM public.clubs c
    WHERE c.id = v_club_id;

    IF v_effective_password IS NULL THEN
      RAISE EXCEPTION 'El club % no tiene default_member_password configurado. Usa password manual o configura una por club.', v_club_id;
    END IF;
  ELSE
    v_effective_password := NULLIF(v_manual_password, '');

    IF v_effective_password IS NULL THEN
      RAISE EXCEPTION 'manual_password no puede estar vacio cuando use_club_default_password = false';
    END IF;
  END IF;

  IF v_dry_run THEN
    SELECT COUNT(*)
      INTO v_updated_count
    FROM public.members m
    WHERE m.club_id = v_club_id
      AND m.user_id IS NOT NULL
      AND (NOT v_only_active OR m.status = 'activo');

    RAISE NOTICE '[DRY RUN] Club: % | Usuarios a resetear: %', v_club_id, v_updated_count;
    RETURN;
  END IF;

  UPDATE auth.users u
  SET encrypted_password = crypt(v_effective_password, gen_salt('bf'))
  FROM public.members m
  WHERE m.user_id = u.id
    AND m.club_id = v_club_id
    AND m.user_id IS NOT NULL
    AND (NOT v_only_active OR m.status = 'activo');

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RAISE NOTICE '[OK] Club: % | Usuarios reseteados: %', v_club_id, v_updated_count;
END $$;


-- ============================================================
-- 4) VALIDACION RAPIDA (opcional)
-- ============================================================
-- Verifica usuarios del club con ultimo login para seguimiento.
SELECT
  m.full_name,
  m.email,
  m.status,
  u.last_sign_in_at
FROM public.members m
LEFT JOIN auth.users u ON u.id = m.user_id
JOIN tmp_reset_password_params p ON p.club_id = m.club_id
WHERE m.club_id = p.club_id
ORDER BY m.full_name;
