import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req: { method: string; headers: { get: (arg0: string) => string | null; }; json: () => PromiseLike<{ member_id: string }> | { member_id: string }; }) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { member_id } = await req.json();
    if (!member_id || typeof member_id !== 'string') {
      return new Response(JSON.stringify({ error: 'member_id requerido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get member details
    const { data: member, error: memberError } = await supabaseAdmin
      .from('members')
      .select('user_id, club_id')
      .eq('id', member_id)
      .single();

    if (memberError || !member) {
      return new Response(JSON.stringify({ error: 'Miembro no encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify caller is admin of the club or super admin
    const { data: isSuper } = await supabaseAdmin.rpc('is_super_admin', { p_user_id: user.id });
    const { data: isAdmin } = await supabaseAdmin.rpc('is_club_admin', { p_user_id: user.id, p_club_id: member.club_id });

    if (!isSuper && !isAdmin) {
      return new Response(JSON.stringify({ error: 'No tienes permisos' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Delete member roles first
    const { error: rolesError } = await supabaseAdmin.from('member_roles').delete().eq('member_id', member_id);
    if (rolesError) throw rolesError;

    // Delete member divisions
    const { error: divisionsError } = await supabaseAdmin.from('member_divisions').delete().eq('member_id', member_id);
    if (divisionsError) throw divisionsError;

    // Delete division change notifications
    const { error: divNotifError } = await supabaseAdmin.from('division_change_notifications').delete().eq('member_id', member_id);
    if (divNotifError) throw divNotifError;

    // Nullify or delete other references to avoid constraint errors
    // Invitations created by this member
    const { error: invitationsError } = await supabaseAdmin.from('member_invitations').update({ created_by: null }).eq('created_by', member_id);
    if (invitationsError) throw invitationsError;

    // Training sessions created by this member
    const { error: trainingSessionsError } = await supabaseAdmin.from('training_sessions').update({ created_by: null }).eq('created_by', member_id);
    if (trainingSessionsError) throw trainingSessionsError;

    // Tournaments created by this member
    const { error: tournamentsError } = await supabaseAdmin.from('tournaments').update({ created_by: null }).eq('created_by', member_id);
    if (tournamentsError) throw tournamentsError;

    // Tournament registrations for this member (delete them as the member is being deleted)
    const { error: tournRegError } = await supabaseAdmin.from('tournament_registrations').delete().eq('member_id', member_id);
    if (tournRegError) throw tournRegError;

    // Training enrollments
    const { error: enrollmentsError } = await supabaseAdmin.from('training_enrollments').delete().eq('member_id', member_id);
    if (enrollmentsError) throw enrollmentsError;

    // Scores
    const { error: scoresError } = await supabaseAdmin.from('scores').delete().eq('member_id', member_id);
    if (scoresError) throw scoresError;

    // Financial entries for this member
    const { error: financialError } = await supabaseAdmin.from('financial_entries').delete().eq('member_id', member_id);
    if (financialError) throw financialError;

    // Delete member record
    const { error: deleteError } = await supabaseAdmin.from('members').delete().eq('id', member_id);
    if (deleteError) throw deleteError;

    // Delete auth user if exists (prevents orphaned accounts)
    if (member.user_id) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(member.user_id);
      if (authDeleteError) {
        console.error('Failed to delete auth user (non-fatal):', authDeleteError.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('delete-member error:', error);
    return new Response(JSON.stringify({ error: 'Error interno del servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
