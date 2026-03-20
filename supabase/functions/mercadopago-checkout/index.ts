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

        // Optional local database override (useful for pointing to a staging DB while developing locally)
        const localUrl = Deno.env.get('LOCAL_SUPABASE_URL');
        const localKey = Deno.env.get('LOCAL_SUPABASE_SERVICE_ROLE_KEY');

        // If we have local overrides and we are in a local environment (localhost URL)
        if (localUrl && localKey && (supabaseUrl?.includes('localhost') || !supabaseUrl)) {
            supabaseUrl = localUrl;
            supabaseKey = localKey;
            console.log("Using local database override in Edge Function");
        }

        if (!supabaseUrl || !supabaseKey || !mpAccessToken) {
            throw new Error("Missing environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const { plan_id, club_id, is_annual } = await req.json();

        if (!plan_id || !club_id) {
            throw new Error("Missing plan_id or club_id");
        }

        // 1. Get plan details
        const { data: plan, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', plan_id)
            .single();

        if (planError || !plan) throw new Error("Plan not found");

        // 2. Get club details for price override
        const { data: club, error: clubError } = await supabase
            .from('clubs')
            .select('name, monthly_price')
            .eq('id', club_id)
            .single();

        if (clubError || !club) throw new Error("Club not found");

        // 3. Determine price
        const unitPrice = is_annual ? (plan.price_annual || (plan.price * 12 * 0.8)) : (club.monthly_price || plan.price);

        // If it's annual and we have a monthly override, we should probably scale it too, 
        // but the user said "ajustar el precio a pagar mensualmente", so we use monthly_price if monthly.
        // Let's stick to: monthly_price override for monthly, and plan.price_annual for annual unless we want to allow annual overrides too later.

        const preference = {
            items: [
                {
                    id: plan.id,
                    title: `Suscripción QuiverApp - Plan ${plan.name} (${is_annual ? 'Anual' : 'Mensual'}) - ${club.name}`,
                    unit_price: Number(unitPrice),
                    quantity: 1,
                    currency_id: 'CLP', // Adjust currency as needed (or get from settings)
                }
            ],
            back_urls: {
                success: `${req.headers.get('origin')}/billing?status=success`,
                failure: `${req.headers.get('origin')}/billing?status=failure`,
                pending: `${req.headers.get('origin')}/billing?status=pending`,
            },
            auto_return: 'approved',
            external_reference: JSON.stringify({ club_id, plan_id, is_annual }),
            notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
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
