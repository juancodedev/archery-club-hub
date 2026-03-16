import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Roles that can be assigned via this endpoint (non-privileged only)
const ALLOWED_MEMBER_ROLES = ['arquero', 'socio', 'alumno'];

console.log("Function 'create-member' loaded");

Deno.serve(async (req) => {
  console.log('--- create-member request ---');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: callerAuthError } = await adminClient.auth.getUser(token);
    if (callerAuthError || !callerUser) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();

    const {
      full_name, club_id, email, role = 'arquero',
      phone, date_of_birth, identification, address, medical_history,
      emergency_contact_name, emergency_contact_phone,
      shirt_size, windbreaker_size, display_name,
      guardian_name, guardian_phone, guardian_email,
      billing_day, grace_days,
      ifaa_number, shirt_gender, enrollment_date
    } = body;

    if (!full_name || !club_id) {
      return new Response(JSON.stringify({ error: 'Nombre y club son obligatorios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the caller is a super admin or admin of this club
    const { data: isSuper, error: isSuperError } = await adminClient.rpc('is_super_admin', { p_user_id: callerUser.id });
    const { data: isAdmin, error: isAdminError } = await adminClient.rpc('is_club_admin', { p_user_id: callerUser.id, p_club_id: club_id });

    if (isSuperError || isAdminError) {
      console.error('Error verifying permissions:', isSuperError || isAdminError);
      return new Response(JSON.stringify({ error: 'Error al verificar permisos' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!isSuper && !isAdmin) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para crear miembros en este club' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Restrict role to allowed non-privileged values
    if (typeof role !== 'string' || !ALLOWED_MEMBER_ROLES.includes(role)) {
      return new Response(JSON.stringify({ error: `Rol no permitido. Los roles válidos son: ${ALLOWED_MEMBER_ROLES.join(', ')}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Resolve email and generate identifier if needed
    const effectiveEmail = email?.trim() || null;
    const authEmail = effectiveEmail || `miembro-${crypto.randomUUID().replace(/-/g, '')}@sin-email.clubarchery.local`;

    // Fetch club's default password
    let defaultPassword: string | null = null;
    try {
      const { data: clubData } = await adminClient
        .from('clubs')
        .select('default_member_password')
        .eq('id', club_id)
        .single();
      if (clubData?.default_member_password) {
        defaultPassword = clubData.default_member_password;
        console.log('Using club default password for new member');
      }
    } catch (e) {
      console.error('Error fetching club default password:', e);
    }

    // Use club's default password or a randomly generated fallback
    const generatedPassword = defaultPassword || `Arq!${crypto.randomUUID().split('-')[0]}${Math.random().toString(36).substring(2, 6)}`;

    console.log('Creating/Recovering auth user...');
    let userId: string;

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: authEmail,
      password: generatedPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (authError) {
      if (authError.message?.includes('already been registered')) {
        console.log('User already exists in Auth, checking if they are a member...');
        // Paginate through all users to find the existing user by email
        let existingUser = null;
        let page = 1;
        const perPage = 1000;

        while (!existingUser) {
          const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers({ page, perPage });
          if (listError) throw listError;

          existingUser = users.find(u => u.email === authEmail) ?? null;

          if (users.length === 0 || users.length < perPage) break; // No more pages
          page++;
        }

        if (!existingUser) {
          throw new Error("User conflict reported but user not found in list");
        }

        userId = existingUser.id;

        // Check if this user is already a member of ANY club
        const { data: existingMember, error: checkError } = await adminClient
          .from('members')
          .select('id, club_id')
          .eq('user_id', userId)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingMember) {
          return new Response(JSON.stringify({
            error: `Ya existe un miembro registrado con el correo ${authEmail}.`
          }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        console.log('User exists in Auth but not in members. Proceeding with link.');
      } else {
        console.error('Auth error:', authError);
        throw authError;
      }
    } else {
      userId = authData.user.id;
    }

    console.log('User ID to use:', userId);

    // Map role to member_type for better classification
    const member_type = role === 'socio' ? 'socio' : 'arquero';

    console.log(`Inserting member with role ${role} and type ${member_type}...`);
    const { data: memberData, error: memberError } = await adminClient
      .from('members')
      .insert({
        user_id: userId,
        club_id,
        full_name: full_name.trim(),
        email: effectiveEmail || authEmail,
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
        enrollment_date: enrollment_date || new Date().toISOString().split('T')[0],
        billing_day: billing_day || null,
        grace_days: grace_days ?? 7,
        ifaa_number: ifaa_number || null,
        shirt_gender: shirt_gender || null,
        member_type,
      })
      .select('id')
      .single();

    if (memberError) {
      console.error('Member insert error:', memberError);
      await adminClient.auth.admin.deleteUser(userId);
      throw memberError;
    }

    const memberId = memberData.id;
    console.log('Member created:', memberId);

    console.log('Assigning role:', role);
    const { error: roleError } = await adminClient
      .from('member_roles')
      .insert({
        member_id: memberId,
        club_id,
        role,
      });

    if (roleError) {
      console.error('Role insert error:', roleError);
      await adminClient.from('members').delete().eq('id', memberId);
      await adminClient.auth.admin.deleteUser(userId);
      throw roleError;
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      member_id: memberId,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Global Error:', err);
    return new Response(JSON.stringify({
      error: err.message || 'Error interno del servidor',
      details: err.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
