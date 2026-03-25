import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to get their ID
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get helper IDs for this user
    const { data: helpers } = await adminClient
      .from("helpers")
      .select("id")
      .eq("user_id", userId);

    const helperIds = helpers?.map((h) => h.id) || [];

    // Delete in dependency order
    // 1. Delete data linked to helper profiles
    if (helperIds.length > 0) {
      for (const helperId of helperIds) {
        await adminClient.from("badge_awards").delete().eq("helper_id", helperId);
        await adminClient.from("video_flags").delete().eq("helper_id", helperId);
        await adminClient.from("helper_sensitive_data").delete().eq("helper_id", helperId);
        await adminClient.from("job_applications").delete().eq("helper_id", helperId);
        await adminClient.from("profile_unlocks").delete().eq("helper_id", helperId);
        await adminClient.from("saved_helpers").delete().eq("helper_id", helperId);
        await adminClient.from("reviews").delete().eq("helper_id", helperId);
        await adminClient.from("placements").delete().eq("helper_id", helperId);
        await adminClient.from("messages").delete().eq("helper_id", helperId);
      }
      // Delete helper profiles
      await adminClient.from("helpers").delete().eq("user_id", userId);
    }

    // 2. Delete employer-related data
    await adminClient.from("saved_helpers").delete().eq("employer_id", userId);
    await adminClient.from("profile_unlocks").delete().eq("employer_id", userId);
    await adminClient.from("reviews").delete().eq("employer_id", userId);
    await adminClient.from("placements").delete().eq("employer_id", userId);
    await adminClient.from("job_applications").delete().in(
      "job_id",
      (await adminClient.from("job_posts").select("id").eq("employer_id", userId)).data?.map((j) => j.id) || []
    );
    await adminClient.from("job_posts").delete().eq("employer_id", userId);
    await adminClient.from("employer_profiles").delete().eq("user_id", userId);

    // 3. Delete user-level data
    await adminClient.from("messages").delete().eq("sender_id", userId);
    await adminClient.from("messages").delete().eq("receiver_id", userId);
    await adminClient.from("credit_transactions").delete().eq("user_id", userId);
    await adminClient.from("credit_wallets").delete().eq("user_id", userId);
    await adminClient.from("notification_preferences").delete().eq("user_id", userId);
    await adminClient.from("push_tokens").delete().eq("user_id", userId);
    await adminClient.from("blocked_users").delete().eq("blocker_id", userId);
    await adminClient.from("blocked_users").delete().eq("blocked_id", userId);
    await adminClient.from("user_reports").delete().eq("reporter_id", userId);
    await adminClient.from("terms_acceptances").delete().eq("user_id", userId);
    await adminClient.from("promo_redemptions").delete().eq("user_id", userId);
    await adminClient.from("otp_codes").delete().eq("user_id", userId);
    await adminClient.from("user_roles").delete().eq("user_id", userId);
    await adminClient.from("profiles").delete().eq("user_id", userId);
    await adminClient.from("audit_logs").delete().eq("actor_id", userId);

    // 4. Delete storage files
    try {
      const { data: avatarFiles } = await adminClient.storage
        .from("avatars")
        .list(userId);
      if (avatarFiles?.length) {
        await adminClient.storage
          .from("avatars")
          .remove(avatarFiles.map((f) => `${userId}/${f.name}`));
      }
    } catch (_) { /* ignore storage errors */ }

    // 5. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
