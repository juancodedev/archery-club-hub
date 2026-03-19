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
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN');

        if (!supabaseUrl || !supabaseKey || !mpAccessToken) {
            throw new Error("Missing environment variables");
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Mercado Pago sends webhooks in different formats depending on the topic
        // For payments, it usually contains 'data.id' or 'id'
        const body = await req.json();
        console.log("MP Webhook received:", body);

        const paymentId = body.data?.id || body.id;
        const topic = body.type || body.topic;

        if (topic === 'payment' && paymentId) {
            // 1. Fetch payment details from Mercado Pago
            const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
                headers: { 'Authorization': `Bearer ${mpAccessToken}` }
            });

            if (!mpResponse.ok) throw new Error("Error fetching payment from MP");

            const paymentData = await mpResponse.json();
            const { status, external_reference, transaction_amount } = paymentData;

            if (status === 'approved' && external_reference) {
                const { club_id, plan_id, is_annual } = JSON.parse(external_reference);

                // 2. Fetch current club data
                const { data: club, error: clubErr } = await supabase
                    .from('clubs')
                    .select('subscription_end_date')
                    .eq('id', club_id)
                    .single();

                if (clubErr || !club) throw new Error("Club not found in DB");

                // 3. Calculate new end date
                const baseDate = (club.subscription_end_date && new Date(club.subscription_end_date) > new Date())
                    ? new Date(club.subscription_end_date)
                    : new Date();

                const newEndDate = new Date(baseDate);
                if (is_annual) {
                    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                } else {
                    newEndDate.setMonth(newEndDate.getMonth() + 1);
                }

                // 4. Update club
                const { error: updateErr } = await supabase
                    .from('clubs')
                    .update({
                        subscription_status: 'activo',
                        subscription_end_date: newEndDate.toISOString(),
                        plan_id,
                        last_payment_date: new Date().toISOString(),
                        next_payment_due_date: newEndDate.toISOString(),
                    })
                    .eq('id', club_id);

                if (updateErr) throw updateErr;

                // 5. Record invoice
                const { error: invoiceErr } = await supabase
                    .from('club_invoices')
                    .insert({
                        club_id,
                        amount: transaction_amount,
                        status: 'paid',
                        mercadopago_payment_id: paymentId.toString(),
                        billing_period_start: baseDate.toISOString(),
                        billing_period_end: newEndDate.toISOString(),
                    });

                if (invoiceErr) console.error("Error creating invoice record:", invoiceErr);

                console.log(`Club ${club_id} updated successfully to status activo`);
            }
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Webhook Error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
