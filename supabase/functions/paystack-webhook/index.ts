import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY")?.trim();
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY not configured");
    }

    const body = await req.text();

    // Verify Paystack signature using Web Crypto API — MANDATORY
    const signature = req.headers.get("x-paystack-signature");
    if (!signature) {
      console.error("Missing Paystack signature header");
      return new Response("Missing signature", { status: 401 });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(PAYSTACK_SECRET_KEY),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const hash = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    if (hash !== signature) {
      console.error("Invalid Paystack signature");
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(body);
    console.log("Paystack event:", event.event);

    if (event.event !== "charge.success") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = event.data;
    const metadata = data.metadata || {};
    const userId = metadata.user_id;
    const amountInZAR = data.amount / 100; // Convert from kobo/cents
    const paymentRef = data.reference;
    const transactionId = String(data.id);

    if (!userId) {
      console.error("No user_id in payment metadata");
      return new Response(JSON.stringify({ error: "No user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Credits come only from the metadata that initialize-payment set from
    // the credit_packages table. A payment without them is NOT credited
    // (it used to be guessed at one credit per R10, which is the wrong rate).
    const credits = Number(metadata.credits);
    const expectedCents = Number(metadata.amountCents);
    if (!Number.isInteger(credits) || credits < 1 || !Number.isFinite(expectedCents) || data.amount !== expectedCents) {
      console.error("Payment not credited: missing or mismatched package details", {
        reference: paymentRef,
        credits: metadata.credits,
        paid: data.amount,
        expected: metadata.amountCents,
      });
      return new Response(JSON.stringify({ received: true, credited: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add credits via the database function
    const { data: result, error: rpcError } = await supabaseAdmin.rpc("add_credits_after_purchase", {
      p_user_id: userId,
      p_credits: credits,
      p_amount: amountInZAR,
      p_payment_ref: paymentRef,
    });

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(JSON.stringify({ error: "Failed to add credits" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // add_credits_after_purchase returns false when this payment reference was
    // already processed (Paystack delivers webhooks more than once). Nothing
    // more to do: no second invoice update and no second email.
    if (result === false) {
      console.log("Duplicate payment notification ignored:", paymentRef);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update the invoice with transaction_id
    await supabaseAdmin
      .from("invoices")
      .update({ transaction_id: transactionId })
      .eq("payment_reference", paymentRef)
      .eq("user_id", userId);

    // Trigger invoice email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        user_id: userId,
        credits,
        amount: amountInZAR,
        payment_ref: paymentRef,
        transaction_id: transactionId,
      }),
    });

    console.log(`Payment processed: ${paymentRef}, credits: ${credits}, user: ${userId}`);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
