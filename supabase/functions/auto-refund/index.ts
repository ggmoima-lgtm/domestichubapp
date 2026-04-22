import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Internal-only guard: auto-refund moves money back to wallets, so it must
// only run from a trusted server context (cron job or service-role caller).
// Browser clients (anon/authenticated JWTs) are rejected.
function isInternalCaller(req: Request): boolean {
  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const serviceRole = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  return Boolean(serviceRole) && token === serviceRole;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!isInternalCaller(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find helpers who were hired in the last 48 hours
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

    // Get recent placements (active, created in the last 48h)
    const { data: recentPlacements, error: placementError } = await supabase
      .from("placements")
      .select("id, helper_id, employer_id, hired_at")
      .eq("status", "active")
      .gte("hired_at", fortyEightHoursAgo.toISOString());

    if (placementError) {
      console.error("Error fetching placements:", placementError);
      return new Response(JSON.stringify({ error: placementError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refunds: string[] = [];

    for (const placement of recentPlacements || []) {
      // Find employers who unlocked this helper's profile within 48h before hired_at
      const unlockWindowStart = new Date(placement.hired_at);
      unlockWindowStart.setHours(unlockWindowStart.getHours() - 48);

      const { data: unlocks } = await supabase
        .from("profile_unlocks")
        .select("id, employer_id, amount_paid")
        .eq("helper_id", placement.helper_id)
        .neq("employer_id", placement.employer_id) // Refund OTHER employers, not the one who hired
        .gte("unlocked_at", unlockWindowStart.toISOString())
        .lte("unlocked_at", placement.hired_at);

      for (const unlock of unlocks || []) {
        // Check if already refunded (via audit_logs)
        const { data: existingRefund } = await supabase
          .from("audit_logs")
          .select("id")
          .eq("action", "auto_refund_hired_48h")
          .eq("target_id", unlock.id)
          .limit(1);

        if (existingRefund && existingRefund.length > 0) continue;

        // Refund 1 credit
        const { data: wallet } = await supabase
          .from("credit_wallets")
          .select("balance")
          .eq("user_id", unlock.employer_id)
          .maybeSingle();

        const newBalance = (wallet?.balance || 0) + 1;

        await supabase
          .from("credit_wallets")
          .upsert({ user_id: unlock.employer_id, balance: newBalance });

        await supabase.from("credit_transactions").insert({
          user_id: unlock.employer_id,
          amount: 1,
          type: "refund",
          description: `Auto-refund: Helper hired within 48h of unlock`,
          balance_after: newBalance,
          reference_id: unlock.id,
        });

        // Log the refund
        await supabase.from("audit_logs").insert({
          actor_id: unlock.employer_id,
          action: "auto_refund_hired_48h",
          target_type: "profile_unlock",
          target_id: unlock.id,
          details: {
            helper_id: placement.helper_id,
            placement_id: placement.id,
            credits_refunded: 1,
          },
        });

        refunds.push(unlock.employer_id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        refunds_processed: refunds.length,
        employers_refunded: refunds,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Auto-refund error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});