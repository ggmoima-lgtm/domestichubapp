import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check admin role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all helpers with their reviews
    const { data: helpers, error: helpersError } = await supabaseAdmin
      .from("helpers")
      .select("id, user_id, bio, skills, languages, avatar_url, intro_video_url, experience_years, phone");

    if (helpersError) throw helpersError;

    // Fetch all badges
    const { data: badges, error: badgesError } = await supabaseAdmin
      .from("badges")
      .select("id, key");

    if (badgesError) throw badgesError;

    const badgeMap = new Map(badges.map((b: any) => [b.key, b.id]));

    let awarded = 0;
    let revoked = 0;

    for (const helper of helpers || []) {
      const { data: reviews } = await supabaseAdmin
        .from("reviews")
        .select("rating")
        .eq("helper_id", helper.id);

      const reviewCount = reviews?.length || 0;
      const avgRating = reviewCount > 0
        ? reviews!.reduce((sum: number, r: any) => sum + r.rating, 0) / reviewCount
        : 0;

      const { data: existingAwards } = await supabaseAdmin
        .from("badge_awards")
        .select("badge_id")
        .eq("helper_id", helper.id);

      const awardedBadgeIds = new Set((existingAwards || []).map((a: any) => a.badge_id));

      const rules: { badgeKey: string; condition: boolean }[] = [
        { badgeKey: "phone_verified", condition: !!helper.phone },
        { badgeKey: "highly_rated", condition: avgRating >= 4.5 && reviewCount >= 5 },
        { badgeKey: "profile_complete", condition: !!(helper.bio && helper.skills?.length > 0 && helper.avatar_url) },
        { badgeKey: "experienced", condition: (helper.experience_years || 0) >= 3 },
        { badgeKey: "video_intro", condition: !!helper.intro_video_url },
        { badgeKey: "multilingual", condition: (helper.languages?.length || 0) >= 2 },
      ];

      for (const rule of rules) {
        const badgeId = badgeMap.get(rule.badgeKey);
        if (!badgeId) continue;

        const isAwarded = awardedBadgeIds.has(badgeId);

        if (rule.condition && !isAwarded) {
          await supabaseAdmin.from("badge_awards").insert({
            helper_id: helper.id,
            badge_id: badgeId,
          });
          awarded++;
        } else if (!rule.condition && isAwarded) {
          await supabaseAdmin.from("badge_awards").delete()
            .eq("helper_id", helper.id)
            .eq("badge_id", badgeId);
          revoked++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, awarded, revoked, helpers_processed: helpers?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Badge engine error:", error);
    return new Response(
      JSON.stringify({ error: "Badge processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
