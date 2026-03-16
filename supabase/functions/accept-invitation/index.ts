import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      token, user_id, full_name, email, password, phone,
      date_of_birth, identification, address, medical_history,
      emergency_contact_name, emergency_contact_phone,
      shirt_size, windbreaker_size, display_name,
      guardian_name, guardian_phone, guardian_email,
      ifaa_number, shirt_gender,
    } = body;

    if (!token || !full_name) {
      return new Response(JSON.stringify({ error: 'Token y nombre son obligatorios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate invitation
    const { data: invRows, error: invError } = await adminClient
      .from('member_invitations')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (invError || !invRows || invRows.length === 0) {
      return new Response(JSON.stringify({ error: 'Invitación inválida o expirada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const invitation = invRows[0];

    // Check if invitation is already used (for individual) or reached max_uses (for generic)
    if (invitation.invitation_type === 'individual' && invitation.used_at) {
      return new Response(JSON.stringify({ error: 'Esta invitación ya ha sido utilizada' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (invitation.invitation_type === 'generic') {
      const { count, error: countError } = await adminClient
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('invitation_id', invitation.id);

      if (countError) throw countError;
      if (count !== null && count >= (invitation.max_uses || 1)) {
        return new Response(JSON.stringify({ error: 'Esta invitación ha alcanzado su límite de usos' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    let effectiveUserId = user_id || null;
    const effectiveEmail = email?.trim() || null;

    // Placeholder emails generated internally always match this pattern.
    const PLACEHOLDER_EMAIL_PATTERN = /^miembro-[0-9a-f]{32}@sin-email\.clubarchery\.local$/;

    // If no user_id provided, only allow placeholder (no-email) flows to avoid account squatting.
    // A real email without user_id means the caller could confirm accounts for emails they don't own.
    if (!effectiveUserId) {
      const isRealEmail = effectiveEmail && !PLACEHOLDER_EMAIL_PATTERN.test(effectiveEmail);

      // Reject if a real email is provided without user_id – the user must sign up first
      if (isRealEmail) {
        return new Response(
          JSON.stringify({ error: 'El usuario debe completar el registro antes de aceptar la invitación.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Only placeholder/no-email members reach here (e.g. minors without an email account).
      // Always generate a fresh unique placeholder for the Auth account; the member record stores
      // effectiveEmail (null for no-email flows) separately.
      const authEmail = `miembro-${crypto.randomUUID().replace(/-/g, '')}@sin-email.clubarchery.local`;
      const authPassword = password?.trim() || `Invitado${Math.floor(Math.random() * 9000 + 1000)}`;

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password: authPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });

      if (authError) {
        throw authError;
      }
      effectiveUserId = authData.user.id;
    }

    const role = body.role || 'arquero';
    const member_type = role === 'socio' ? 'socio' : 'arquero';

    // Create member record
    const { data: memberData, error: memberError } = await adminClient
      .from('members')
      .insert({
        user_id: effectiveUserId,
        club_id: invitation.club_id,
        full_name: full_name.trim(),
        email: effectiveEmail,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
        identification: identification || null,
        address: address || null,
        medical_history: medical_history || null,
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        shirt_size: shirt_size || null,
        windbreaker_size: windbreaker_size || null,
        display_name: display_name || null,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        guardian_email: guardian_email || null,
        ifaa_number: ifaa_number || null,
        shirt_gender: shirt_gender || null,
        status: 'activo',
        member_type,
        invitation_id: invitation.id,
      })
      .select('id')
      .single();

    if (memberError) {
      // Cleanup auth user if we created it
      if (!user_id) await adminClient.auth.admin.deleteUser(effectiveUserId);
      throw memberError;
    }

    // Assign role
    await adminClient.from('member_roles').insert({
      member_id: memberData.id,
      club_id: invitation.club_id,
      role: role,
    });

    // Mark invitation as used (if individual)
    if (invitation.invitation_type === 'individual') {
      await adminClient.from('member_invitations').update({ used_at: new Date().toISOString() }).eq('id', invitation.id);
    } else {
      // For generic, we might want to mark it as used only when it reaches max_uses
      const { count } = await adminClient
        .from('members')
        .select('*', { count: 'exact', head: true })
        .eq('invitation_id', invitation.id);

      if (count !== null && count >= (invitation.max_uses || 1)) {
        await adminClient.from('member_invitations').update({ used_at: new Date().toISOString() }).eq('id', invitation.id);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      member_id: memberData.id,
      user_id: effectiveUserId,
      is_placeholder: !user_id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return new Response(JSON.stringify({ error: 'Error al procesar la invitación. Intenta nuevamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
