import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const runMutation = async (
  label: string,
  operation: Promise<{ error: { message: string } | null }>,
) => {
  const { error } = await operation;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
};

const removeUserFiles = async (
  adminClient: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
) => {
  try {
    const { data: files, error } = await adminClient.storage.from(bucket).list(userId);
    if (error) throw error;

    const filePaths =
      files
        ?.filter((file) => file.name && !file.id?.endsWith("/"))
        .map((file) => `${userId}/${file.name}`) ?? [];

    if (filePaths.length > 0) {
      const { error: removeError } = await adminClient.storage.from(bucket).remove(filePaths);
      if (removeError) throw removeError;
    }
  } catch (error) {
    console.warn(`Storage cleanup skipped for ${bucket}:`, error);
  }
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
        headers: jsonHeaders,
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
        headers: jsonHeaders,
      });
    }

    const userId = user.id;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const [{ data: helpers, error: helpersError }, { data: jobPosts, error: jobPostsError }] = await Promise.all([
      adminClient.from("helpers").select("id").eq("user_id", userId),
      adminClient.from("job_posts").select("id").eq("employer_id", userId),
    ]);

    if (helpersError) throw new Error(`Failed to load helper records: ${helpersError.message}`);
    if (jobPostsError) throw new Error(`Failed to load job posts: ${jobPostsError.message}`);

    const helperIds = helpers?.map((helper) => helper.id) ?? [];
    const jobPostIds = jobPosts?.map((jobPost) => jobPost.id) ?? [];

    // Silent deletion only: do not invoke any email or SMS hooks here.

    if (helperIds.length > 0) {
      await Promise.all([
        runMutation("Deleting badge awards", adminClient.from("badge_awards").delete().in("helper_id", helperIds)),
        runMutation("Deleting video flags", adminClient.from("video_flags").delete().in("helper_id", helperIds)),
        runMutation("Deleting helper sensitive data", adminClient.from("helper_sensitive_data").delete().in("helper_id", helperIds)),
        runMutation("Deleting helper job applications", adminClient.from("job_applications").delete().in("helper_id", helperIds)),
        runMutation("Deleting profile unlocks", adminClient.from("profile_unlocks").delete().in("helper_id", helperIds)),
        runMutation("Deleting saved helpers", adminClient.from("saved_helpers").delete().in("helper_id", helperIds)),
        runMutation("Deleting reviews", adminClient.from("reviews").delete().in("helper_id", helperIds)),
        runMutation("Deleting placements", adminClient.from("placements").delete().in("helper_id", helperIds)),
        runMutation("Deleting messages", adminClient.from("messages").delete().in("helper_id", helperIds)),
      ]);

      await runMutation(
        "Deleting helper profiles",
        adminClient.from("helpers").delete().eq("user_id", userId),
      );
    }

    if (jobPostIds.length > 0) {
      await runMutation(
        "Deleting employer job applications",
        adminClient.from("job_applications").delete().in("job_id", jobPostIds),
      );
    }

    await Promise.all([
      runMutation("Deleting employer saved helpers", adminClient.from("saved_helpers").delete().eq("employer_id", userId)),
      runMutation("Deleting employer profile unlocks", adminClient.from("profile_unlocks").delete().eq("employer_id", userId)),
      runMutation("Deleting employer reviews", adminClient.from("reviews").delete().eq("employer_id", userId)),
      runMutation("Deleting employer placements", adminClient.from("placements").delete().eq("employer_id", userId)),
      runMutation("Deleting job posts", adminClient.from("job_posts").delete().eq("employer_id", userId)),
      runMutation("Deleting employer profile", adminClient.from("employer_profiles").delete().eq("user_id", userId)),
    ]);

    await Promise.all([
      runMutation("Deleting sent messages", adminClient.from("messages").delete().eq("sender_id", userId)),
      runMutation("Deleting received messages", adminClient.from("messages").delete().eq("receiver_id", userId)),
      runMutation("Deleting credit transactions", adminClient.from("credit_transactions").delete().eq("user_id", userId)),
      runMutation("Deleting credit wallet", adminClient.from("credit_wallets").delete().eq("user_id", userId)),
      runMutation("Deleting notification preferences", adminClient.from("notification_preferences").delete().eq("user_id", userId)),
      runMutation("Deleting push tokens", adminClient.from("push_tokens").delete().eq("user_id", userId)),
      runMutation("Deleting outbound blocks", adminClient.from("blocked_users").delete().eq("blocker_id", userId)),
      runMutation("Deleting inbound blocks", adminClient.from("blocked_users").delete().eq("blocked_id", userId)),
      runMutation("Deleting user reports", adminClient.from("user_reports").delete().eq("reporter_id", userId)),
      runMutation("Deleting terms acceptances", adminClient.from("terms_acceptances").delete().eq("user_id", userId)),
      runMutation("Deleting promo redemptions", adminClient.from("promo_redemptions").delete().eq("user_id", userId)),
      runMutation("Deleting OTP codes", adminClient.from("otp_codes").delete().eq("user_id", userId)),
      runMutation("Deleting user roles", adminClient.from("user_roles").delete().eq("user_id", userId)),
      runMutation("Deleting profile", adminClient.from("profiles").delete().eq("user_id", userId)),
      runMutation("Deleting audit logs", adminClient.from("audit_logs").delete().eq("actor_id", userId)),
    ]);

    await Promise.all([
      removeUserFiles(adminClient, "avatars", userId),
      removeUserFiles(adminClient, "helper-videos", userId),
      removeUserFiles(adminClient, "helper-documents", userId),
    ]);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Failed to delete account. Please contact support." }),
        { status: 500, headers: jsonHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: jsonHeaders }
    );
  } catch (error) {
    console.error("Account deletion error:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
