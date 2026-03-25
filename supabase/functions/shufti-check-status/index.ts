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

    const { helper_id } = await req.json();
    if (!helper_id) {
      return new Response(JSON.stringify({ error: "Missing helper_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the verification reference from sensitive data
    const { data: sensitiveRecord } = await supabase
      .from("helper_sensitive_data")
      .select("verification_reference_id")
      .eq("helper_id", helper_id)
      .single();

    if (!sensitiveRecord?.verification_reference_id) {
      return new Response(JSON.stringify({ error: "No verification reference found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = sensitiveRecord.verification_reference_id;

    // Poll Shufti Pro status API
    const authToken = btoa(`${shuftiClientId}:${shuftiSecretKey}`);
    const statusResponse = await fetch("https://api.shuftipro.com/status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${authToken}`,
      },
      body: JSON.stringify({ reference }),
    });

    const statusData = await statusResponse.json();

    if (!statusResponse.ok) {
      console.error("Shufti status API error:", statusData);
      return new Response(JSON.stringify({ error: "Failed to check status", details: statusData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = statusData.event;

    // Map Shufti events to our status
    let verificationStatus: string;
    switch (event) {
      case "verification.accepted":
        verificationStatus = "verified";
        break;
      case "verification.declined":
        verificationStatus = "failed";
        break;
      case "request.pending":
      case "verification.status.changed":
        verificationStatus = "pending";
        break;
      default:
        verificationStatus = "pending";
        break;
    }

    // Update helper record if status changed
    const { data: helper } = await supabase
      .from("helpers")
      .select("id, user_id, verification_status")
      .eq("id", helper_id)
      .single();

    if (helper && helper.verification_status !== verificationStatus) {
      const updatePayload: Record<string, unknown> = {
        verification_status: verificationStatus,
      };
      if (verificationStatus === "verified") {
        updatePayload.is_verified = true;
        updatePayload.verification_date = new Date().toISOString();
      }
      await supabase
        .from("helpers")
        .update(updatePayload)
        .eq("id", helper_id);

      // Audit log
      if (helper.user_id) {
        await supabase.from("audit_logs").insert({
          actor_id: helper.user_id,
          action: `identity_verification_${verificationStatus}`,
          target_type: "helper",
          target_id: helper.user_id,
          details: { reference, event, status: verificationStatus },
        });
      }
    }

    return new Response(
      JSON.stringify({ status: verificationStatus, event }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Shufti check-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
