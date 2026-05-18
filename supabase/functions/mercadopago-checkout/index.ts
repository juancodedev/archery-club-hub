import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        let supabaseUrl = Deno.env.get('SUPABASE_URL');
        let supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');

        // Trusted app URL for back_urls (never derived from request headers)
        const appUrl = Deno.env.get('APP_URL');
        if (!appUrl) {
            throw new Error("Missing APP_URL environment variable");
        }

        // Optional local database override (useful for pointing to a staging DB while developing locally)
        const localUrl = Deno.env.get('LOCAL_SUPABASE_URL');
        const localKey = Deno.env.get('LOCAL_SUPABASE_SERVICE_ROLE_KEY');

        // If we have local overrides and we are in a local environment (localhost URL)
        if (localUrl && localKey && (supabaseUrl?.includes('localhost') || !supabaseUrl)) {
            supabaseUrl = localUrl;
            supabaseKey = localKey;
        }

        if (!supabaseUrl || !supabaseKey || !mpAccessToken) {
            throw new Error("Missing environment variables");
        }

        // Verify caller identity via JWT before performing any privileged operations
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'No autenticado' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Token inválido' }), {
                status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { plan_id, club_id, is_annual } = await req.json();

        if (!plan_id || !club_id) {
            throw new Error("Missing plan_id or club_id");
        }

        // Verify the caller is an admin of the given club or a super admin
        const { data: isSuperAdmin, error: superAdminErr } = await supabaseAdmin.rpc('is_super_admin', { p_user_id: user.id });
        const { data: isClubAdmin, error: clubAdminErr } = await supabaseAdmin.rpc('is_club_admin', { p_user_id: user.id, p_club_id: club_id });

        if (superAdminErr || clubAdminErr) {
            return new Response(JSON.stringify({ error: 'Error al verificar permisos' }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (!isSuperAdmin && !isClubAdmin) {
            return new Response(JSON.stringify({ error: 'No tienes permisos para este club' }), {
                status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 1. Get plan details
        const { data: plan, error: planError } = await supabaseAdmin
            .from('plans')
            .select('*')
            .eq('id', plan_id)
            .single();

        if (planError || !plan) throw new Error("Plan not found");

        // 2. Get club details for price override
        const { data: club, error: clubError } = await supabaseAdmin
            .from('clubs')
            .select('name, monthly_price')
            .eq('id', club_id)
            .single();

        if (clubError || !club) throw new Error("Club not found");

        // 3. Determine price
        const unitPrice = is_annual ? (plan.price_annual || (plan.price * 12 * 0.8)) : (club.monthly_price || plan.price);

        const preference = {
            items: [
                {
                    id: plan.id,
                    title: `Suscripción QuiverApp - Plan ${plan.name} (${is_annual ? 'Anual' : 'Mensual'}) - ${club.name}`,
                    unit_price: Number(unitPrice),
                    quantity: 1,
                    currency_id: 'CLP',
                }
            ],
            back_urls: {
                success: `${appUrl}/billing?status=success`,
                failure: `${appUrl}/billing?status=failure`,
                pending: `${appUrl}/billing?status=pending`,
            },
            auto_return: 'approved',
            external_reference: JSON.stringify({ club_id, plan_id, is_annual }),
            // Use the resolved supabaseUrl so webhooks point to the correct environment
            notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
        };

        const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${mpAccessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preference),
        });

        const mpData = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error("Mercado Pago Error:", mpData);
            throw new Error(mpData.message || "Error creating MP preference");
        }

        return new Response(JSON.stringify({ init_point: mpData.init_point }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
