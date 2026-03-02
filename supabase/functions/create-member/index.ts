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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Client with caller's JWT to check permissions
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for creating auth users
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get caller's identity
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const {
      full_name, club_id, email, password, role = 'arquero',
      phone, date_of_birth, identification, address, medical_history,
      emergency_contact_name, emergency_contact_phone,
      shirt_size, windbreaker_size, display_name,
      guardian_name, guardian_phone, guardian_email,
      billing_day, grace_days
    } = body;

    if (!full_name || !club_id) {
      return new Response(JSON.stringify({ error: 'Nombre y club son obligatorios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check permissions: super admin or club admin
    const { data: isSuper } = await callerClient.rpc('is_super_admin', { p_user_id: caller.id });
    const { data: isAdmin } = await callerClient.rpc('is_club_admin', { p_user_id: caller.id, p_club_id: club_id });

    if (!isSuper && !isAdmin) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para crear miembros en este club' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Resolve email
    const effectiveEmail = email?.trim() || null;
    const authEmail = effectiveEmail || `miembro-${crypto.randomUUID().replace(/-/g, '')}@sin-email.clubarchery.local`;
    const effectivePassword = password?.trim() || `Arquero${Math.floor(Math.random() * 9000 + 1000)}`;

    // Create auth user via Admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: effectivePassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      if (authError.message?.includes('already been registered') || authError.message?.includes('unique')) {
        return new Response(JSON.stringify({ error: `Ya existe un usuario registrado con el correo electrónico: ${authEmail}` }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw authError;
    }

    const userId = authData.user.id;

    // Create member record using admin client (bypasses RLS)
    const { data: memberData, error: memberError } = await adminClient
      .from('members')
      .insert({
        user_id: userId,
        club_id,
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
        status: 'activo',
        enrollment_date: new Date().toISOString().split('T')[0],
        billing_day: billing_day || null,
        grace_days: grace_days ?? 7,
      })
      .select('id')
      .single();

    if (memberError) {
      // Cleanup: delete the auth user we just created
      await adminClient.auth.admin.deleteUser(userId);
      throw memberError;
    }

    // Assign role
    const { error: roleError } = await adminClient
      .from('member_roles')
      .insert({
        member_id: memberData.id,
        club_id,
        role,
      });

    if (roleError) {
      // Cleanup
      await adminClient.from('members').delete().eq('id', memberData.id);
      await adminClient.auth.admin.deleteUser(userId);
      throw roleError;
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      member_id: memberData.id,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error creating member:', error);
    return new Response(JSON.stringify({ error: 'Error al crear el miembro. Intenta nuevamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
