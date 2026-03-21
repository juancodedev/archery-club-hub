import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify the Mercado Pago webhook signature.
 * MP sends: x-signature header with format "ts=<timestamp>,v1=<hmac>"
 * and x-request-id header.
 * The signed payload is: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
async function verifyMercadoPagoSignature(req: Request, rawBody: string): Promise<boolean> {
    const secret = Deno.env.get('MP_WEBHOOK_SECRET');
    if (!secret) {
        // Fail closed: reject the request if the secret is not configured
        return false;
    }

    const xSignature = req.headers.get('x-signature');
    const xRequestId = req.headers.get('x-request-id');

    if (!xSignature || !xRequestId) return false;

    const parts: Record<string, string> = {};
    for (const part of xSignature.split(',')) {
        const [k, v] = part.split('=');
        if (k && v) parts[k.trim()] = v.trim();
    }

    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    let dataId: string | undefined;
    try {
        const parsed = JSON.parse(rawBody);
        dataId = parsed?.data?.id ?? parsed?.id;
    } catch {
        return false;
    }

    if (!dataId) return false;

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const msgData = encoder.encode(manifest);

    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const sigHex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    return sigHex === v1;
}

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

        const rawBody = await req.text();

        // Verify the request actually comes from Mercado Pago
        const isValid = await verifyMercadoPagoSignature(req, rawBody);
        if (!isValid) {            console.error("Invalid Mercado Pago webhook signature");
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        const body = JSON.parse(rawBody);

        const paymentId = body.data?.id || body.id;
        const topic = body.type || body.topic;

        if (topic === 'payment' && paymentId) {
            // Idempotency check: skip if we already processed this payment
            const { data: existingInvoice } = await supabase
                .from('club_invoices')
                .select('id')
                .eq('mercadopago_payment_id', paymentId.toString())
                .maybeSingle();

            if (existingInvoice) {
                return new Response(JSON.stringify({ received: true, duplicate: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                });
            }

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

                // 4. Update club via RPC to bypass the protect_subscription_status trigger
                const { error: updateErr } = await supabase.rpc('update_club_subscription_after_payment', {
                    p_club_id: club_id,
                    p_plan_id: plan_id,
                    p_subscription_end_date: newEndDate.toISOString(),
                    p_last_payment_date: new Date().toISOString(),
                    p_next_payment_due_date: newEndDate.toISOString(),
                });

                if (updateErr) throw updateErr;

                // 5. Record invoice (non-fatal: club subscription already updated)
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
