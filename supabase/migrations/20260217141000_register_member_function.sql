
-- Security Definer function to handle member registration in a single transaction
-- This bypasses RLS issues during the signup flow where the user might not be fully authenticated yet
CREATE OR REPLACE FUNCTION public.accept_invitation_v2(
  p_token TEXT,
  p_user_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_identification TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_medical_history TEXT DEFAULT NULL,
  p_emergency_contact_name TEXT DEFAULT NULL,
  p_emergency_contact_phone TEXT DEFAULT NULL,
  p_shirt_size TEXT DEFAULT NULL,
  p_windbreaker_size TEXT DEFAULT NULL,
  p_display_name TEXT DEFAULT NULL,
  p_guardian_name TEXT DEFAULT NULL,
  p_guardian_phone TEXT DEFAULT NULL,
  p_guardian_email TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_member_id UUID;
BEGIN
  -- 1. Validate invitation
  SELECT * INTO v_invitation FROM public.member_invitations 
  WHERE token = p_token AND used_at IS NULL AND expires_at > now();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación inválida o expirada';
  END IF;

  -- 2. Insert member
  INSERT INTO public.members (
    user_id, 
    club_id, 
    full_name, 
    email, 
    phone, 
    date_of_birth, 
    identification, 
    address, 
    medical_history,
    emergency_contact_name, 
    emergency_contact_phone,
    shirt_size, 
    windbreaker_size, 
    display_name,
    guardian_name, 
    guardian_phone, 
    guardian_email,
    status
  )
  VALUES (
    p_user_id, 
    v_invitation.club_id, 
    trim(p_full_name), 
    trim(p_email), 
    trim(p_phone), 
    p_date_of_birth,
    trim(p_identification), 
    trim(p_address), 
    trim(p_medical_history),
    trim(p_emergency_contact_name), 
    trim(p_emergency_contact_phone),
    p_shirt_size, 
    p_windbreaker_size, 
    trim(p_display_name),
    trim(p_guardian_name), 
    trim(p_guardian_phone), 
    trim(p_guardian_email),
    'activo'
  )
  RETURNING id INTO v_member_id;

  -- 3. Assign default role
  INSERT INTO public.member_roles (member_id, club_id, role)
  VALUES (v_member_id, v_invitation.club_id, 'arquero');

  -- 4. Mark invitation as used
  UPDATE public.member_invitations SET used_at = now() WHERE id = v_invitation.id;
END;
$$;

-- Grant execute to everyone
GRANT EXECUTE ON FUNCTION public.accept_invitation_v2 TO anon, authenticated;
