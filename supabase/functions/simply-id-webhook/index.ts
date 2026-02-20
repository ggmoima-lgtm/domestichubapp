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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // SimplyID webhook payload structure
    const {
      reference_id,
      status, // "verified" | "failed" | "pending"
      user_id, // helper's user_id passed during redirect
      verification_type, // "id" | "passport"
    } = body;

    if (!reference_id || !status || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map status
    const verificationStatus = status === "verified" ? "verified" : status === "failed" ? "failed" : "pending";

    // Update helper's verification status
    const { error: updateError } = await supabase
      .from("helpers")
      .update({
        verification_status: verificationStatus,
        verification_reference_id: reference_id,
        verification_date: verificationStatus === "verified" ? new Date().toISOString() : null,
        is_verified: verificationStatus === "verified",
      })
      .eq("user_id", user_id);

    if (updateError) {
      console.error("Error updating helper verification:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log the verification event
    await supabase.from("audit_logs").insert({
      actor_id: user_id,
      action: `identity_verification_${verificationStatus}`,
      target_type: "helper",
      target_id: user_id,
      details: {
        reference_id,
        verification_type: verification_type || "unknown",
        status: verificationStatus,
      },
    });

    // If verified, trigger badge engine to award verification badge
    if (verificationStatus === "verified") {
      try {
        await supabase.functions.invoke("badge-engine", {
          body: { helperId: user_id, trigger: "verification_complete" },
        });
      } catch (err) {
        console.error("Badge engine trigger failed:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: verificationStatus }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("SimplyID webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});