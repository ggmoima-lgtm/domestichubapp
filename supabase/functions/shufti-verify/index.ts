import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const shuftiClientId = Deno.env.get("SHUFTI_CLIENT_ID");
    const shuftiSecretKey = Deno.env.get("SHUFTI_SECRET_KEY");

    if (!shuftiClientId || !shuftiSecretKey) {
      return new Response(JSON.stringify({ error: "Shufti Pro credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { user_id, helper_id } = await req.json();
    if (!user_id || !helper_id) {
      return new Response(JSON.stringify({ error: "Missing user_id or helper_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get helper details for the verification request
    const { data: helper } = await supabase
      .from("helpers")
      .select("full_name, email")
      .eq("id", helper_id)
      .single();

    if (!helper) {
      return new Response(JSON.stringify({ error: "Helper not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `DH-${user_id}-${Date.now()}`;

    // Build Shufti Pro verification request
    const webhookUrl = `${supabaseUrl}/functions/v1/shufti-webhook`;

    const payload = {
      reference,
      callback_url: webhookUrl,
      email: helper.email,
      country: "ZA",
      verification_mode: "any",
      face: {},
      document: {
        supported_types: ["id_card", "passport", "driving_license"],
        name: { first_name: helper.full_name.split(" ")[0], last_name: helper.full_name.split(" ").slice(1).join(" ") || "" },
      },
    };

    // Call Shufti Pro API
    const authToken = btoa(`${shuftiClientId}:${shuftiSecretKey}`);
    const shuftiResponse = await fetch("https://api.shuftipro.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const shuftiData = await shuftiResponse.json();

    if (!shuftiResponse.ok) {
      console.error("Shufti API error:", shuftiData);
      return new Response(JSON.stringify({ error: "Shufti verification request failed", details: shuftiData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store reference for webhook matching
    await supabase
      .from("helpers")
      .update({
        verification_status: "pending",
        verification_reference_id: reference,
      })
      .eq("id", helper_id);

    return new Response(
      JSON.stringify({
        verification_url: shuftiData.verification_url,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Shufti verify error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
