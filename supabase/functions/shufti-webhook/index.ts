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
    console.log("Shufti webhook payload:", JSON.stringify(body));

    const { reference, event } = body;

    if (!reference || !event) {
      return new Response(JSON.stringify({ error: "Missing reference or event" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        console.log("Unhandled Shufti event:", event);
        return new Response(JSON.stringify({ success: true, ignored: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // Find helper by reference via sensitive data table
    const { data: sensitiveRecord } = await supabase
      .from("helper_sensitive_data")
      .select("helper_id")
      .eq("verification_reference_id", reference)
      .single();

    const { data: helper } = sensitiveRecord
      ? await supabase.from("helpers").select("id, user_id").eq("id", sensitiveRecord.helper_id).single()
      : { data: null };

    if (!helper) {
      console.error("No helper found for reference:", reference);
      return new Response(JSON.stringify({ error: "Helper not found for reference" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update verification status
    const { error: updateError } = await supabase
      .from("helpers")
      .update({
        verification_status: verificationStatus,
        verification_date: verificationStatus === "verified" ? new Date().toISOString() : null,
        is_verified: verificationStatus === "verified",
      })
      .eq("id", helper.id);

    if (updateError) {
      console.error("Error updating helper:", updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Award badge on verification
    if (verificationStatus === "verified") {
      try {
        await supabase.functions.invoke("badge-engine", {
          body: { helperId: helper.user_id, trigger: "verification_complete" },
        });
      } catch (err) {
        console.error("Badge engine trigger failed:", err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: verificationStatus }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Shufti webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
