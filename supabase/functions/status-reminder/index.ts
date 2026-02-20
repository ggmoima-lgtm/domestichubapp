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

    // Find helpers who haven't updated their status in 14+ days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const { data: staleHelpers, error } = await supabase
      .from("helpers")
      .select("id, user_id, full_name, updated_at, availability_status")
      .lt("updated_at", fourteenDaysAgo.toISOString())
      .in("availability_status", ["available", "interviewing"]);

    if (error) {
      console.error("Error fetching stale helpers:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reminders: string[] = [];
    const autoUnavailable: string[] = [];

    // Check for helpers who haven't responded in 28+ days (2x reminder period) → auto-set unavailable
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    for (const helper of staleHelpers || []) {
      if (!helper.user_id) continue;

      const lastUpdate = new Date(helper.updated_at);

      // If 28+ days stale, auto-set to unavailable
      if (lastUpdate <= twentyEightDaysAgo) {
        await supabase
          .from("helpers")
          .update({ availability_status: "unavailable" })
          .eq("id", helper.id);

        await supabase.from("audit_logs").insert({
          actor_id: helper.user_id,
          action: "auto_set_unavailable",
          target_type: "helper",
          target_id: helper.id,
          details: {
            last_updated: helper.updated_at,
            reason: "No response to availability reminder after 28 days",
          },
        });

        autoUnavailable.push(helper.full_name);
        continue;
      }

      // Otherwise send reminder
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("hire_updates")
        .eq("user_id", helper.user_id)
        .maybeSingle();

      if (prefs && prefs.hire_updates === false) continue;

      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("token")
        .eq("user_id", helper.user_id);

      if (tokens && tokens.length > 0) {
        console.log(`Would send reminder to ${helper.full_name} (${helper.user_id})`);
      }

      await supabase.from("audit_logs").insert({
        actor_id: helper.user_id,
        action: "status_reminder_sent",
        target_type: "helper",
        target_id: helper.id,
        details: {
          last_updated: helper.updated_at,
          current_status: helper.availability_status,
        },
      });

      reminders.push(helper.full_name);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: reminders.length,
        auto_unavailable: autoUnavailable.length,
        helpers_reminded: reminders,
        helpers_set_unavailable: autoUnavailable,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Status reminder error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
