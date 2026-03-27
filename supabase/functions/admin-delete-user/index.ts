import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const runMutation = async (label: string, operation: Promise<{ error: { message: string } | null }>) => {
  const { error } = await operation;
  if (error) throw new Error(`${label}: ${error.message}`);
};

const removeUserFiles = async (adminClient: ReturnType<typeof createClient>, bucket: string, userId: string) => {
  try {
    const { data: files } = await adminClient.storage.from(bucket).list(userId);
    const filePaths = files?.filter(f => f.name && !f.id?.endsWith("/")).map(f => `${userId}/${f.name}`) ?? [];
    if (filePaths.length > 0) await adminClient.storage.from(bucket).remove(filePaths);
  } catch (e) { console.warn(`Storage cleanup skipped for ${bucket}:`, e); }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: jsonHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: jsonHeaders });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: caller.id, _role: "admin" });
    if (!isAdmin) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403, headers: jsonHeaders });

    const { target_user_id } = await req.json();
    if (!target_user_id) return new Response(JSON.stringify({ error: "target_user_id required" }), { status: 400, headers: jsonHeaders });

    // Prevent self-deletion
    if (target_user_id === caller.id) return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: jsonHeaders });

    const userId = target_user_id;

    const [{ data: helpers }, { data: jobPosts }] = await Promise.all([
      adminClient.from("helpers").select("id").eq("user_id", userId),
      adminClient.from("job_posts").select("id").eq("employer_id", userId),
    ]);

    const helperIds = helpers?.map(h => h.id) ?? [];
    const jobPostIds = jobPosts?.map(j => j.id) ?? [];

    if (helperIds.length > 0) {
      await Promise.all([
        runMutation("badge_awards", adminClient.from("badge_awards").delete().in("helper_id", helperIds)),
        runMutation("video_flags", adminClient.from("video_flags").delete().in("helper_id", helperIds)),
        runMutation("helper_sensitive_data", adminClient.from("helper_sensitive_data").delete().in("helper_id", helperIds)),
        runMutation("job_applications", adminClient.from("job_applications").delete().in("helper_id", helperIds)),
        runMutation("profile_unlocks", adminClient.from("profile_unlocks").delete().in("helper_id", helperIds)),
        runMutation("saved_helpers", adminClient.from("saved_helpers").delete().in("helper_id", helperIds)),
        runMutation("reviews", adminClient.from("reviews").delete().in("helper_id", helperIds)),
        runMutation("placements", adminClient.from("placements").delete().in("helper_id", helperIds)),
        runMutation("messages", adminClient.from("messages").delete().in("helper_id", helperIds)),
      ]);
      await runMutation("helpers", adminClient.from("helpers").delete().eq("user_id", userId));
    }

    if (jobPostIds.length > 0) {
      await runMutation("job_applications", adminClient.from("job_applications").delete().in("job_id", jobPostIds));
    }

    await Promise.all([
      runMutation("saved_helpers", adminClient.from("saved_helpers").delete().eq("employer_id", userId)),
      runMutation("profile_unlocks", adminClient.from("profile_unlocks").delete().eq("employer_id", userId)),
      runMutation("reviews", adminClient.from("reviews").delete().eq("employer_id", userId)),
      runMutation("placements", adminClient.from("placements").delete().eq("employer_id", userId)),
      runMutation("job_posts", adminClient.from("job_posts").delete().eq("employer_id", userId)),
      runMutation("employer_profiles", adminClient.from("employer_profiles").delete().eq("user_id", userId)),
    ]);

    await Promise.all([
      runMutation("sent_messages", adminClient.from("messages").delete().eq("sender_id", userId)),
      runMutation("received_messages", adminClient.from("messages").delete().eq("receiver_id", userId)),
      runMutation("credit_transactions", adminClient.from("credit_transactions").delete().eq("user_id", userId)),
      runMutation("credit_wallets", adminClient.from("credit_wallets").delete().eq("user_id", userId)),
      runMutation("notification_preferences", adminClient.from("notification_preferences").delete().eq("user_id", userId)),
      runMutation("push_tokens", adminClient.from("push_tokens").delete().eq("user_id", userId)),
      runMutation("blocked_users_out", adminClient.from("blocked_users").delete().eq("blocker_id", userId)),
      runMutation("blocked_users_in", adminClient.from("blocked_users").delete().eq("blocked_id", userId)),
      runMutation("user_reports", adminClient.from("user_reports").delete().eq("reporter_id", userId)),
      runMutation("terms_acceptances", adminClient.from("terms_acceptances").delete().eq("user_id", userId)),
      runMutation("promo_redemptions", adminClient.from("promo_redemptions").delete().eq("user_id", userId)),
      runMutation("otp_codes", adminClient.from("otp_codes").delete().eq("user_id", userId)),
      runMutation("user_roles", adminClient.from("user_roles").delete().eq("user_id", userId)),
      runMutation("profiles", adminClient.from("profiles").delete().eq("user_id", userId)),
      runMutation("audit_logs", adminClient.from("audit_logs").delete().eq("actor_id", userId)),
    ]);

    await Promise.all([
      removeUserFiles(adminClient, "avatars", userId),
      removeUserFiles(adminClient, "helper-videos", userId),
      removeUserFiles(adminClient, "helper-documents", userId),
    ]);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return new Response(JSON.stringify({ error: "Failed to delete auth user" }), { status: 500, headers: jsonHeaders });
    }

    // Log the action
    await adminClient.from("audit_logs").insert({
      actor_id: caller.id,
      action: "admin_delete_user",
      target_type: "user",
      target_id: userId,
      details: { deleted_by: caller.id },
    });

    return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), { status: 500, headers: jsonHeaders });
  }
});
