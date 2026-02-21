import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { helperId } = await req.json();
    if (!helperId) {
      return new Response(JSON.stringify({ error: "helperId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller owns this helper profile or is admin
    const isOwner = helperId === userId;

    if (!isOwner) {
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    // Get helper's video URL (helperId here is user_id)
    const { data: helper, error: helperError } = await supabaseAdmin
      .from("helpers")
      .select("id, intro_video_url, full_name")
      .eq("user_id", helperId)
      .single();

    if (helperError || !helper?.intro_video_url) {
      await supabaseAdmin
        .from("helpers")
        .update({ video_moderation_status: "approved" })
        .eq("user_id", helperId);

      return new Response(JSON.stringify({ status: "no_video", moderation: "approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to reviewing
    await supabaseAdmin
      .from("helpers")
      .update({ video_moderation_status: "reviewing" })
      .eq("id", helper.id);

    // Use Lovable AI to analyze the video for contact info
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a video content moderator. Your job is to analyze video content and detect if the speaker shares any personal contact information. 

Look for:
- Phone numbers (spoken or shown on screen)
- Email addresses
- WhatsApp numbers or mentions
- Social media handles (Instagram, Facebook, TikTok, etc.)
- Any instructions like "call me at", "message me on", "find me on"
- Spelled-out phone numbers

Respond with a JSON object only:
{
  "has_contact_info": true/false,
  "confidence": "high"/"medium"/"low",
  "details": "description of what was found or 'No contact information detected'"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this helper introduction video. Does the speaker share any personal contact information (phone numbers, email, WhatsApp, social media handles)? Check both spoken words and any text shown on screen."
              },
              {
                type: "image_url",
                image_url: { url: helper.intro_video_url }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
      }),
    });

    let moderationResult = { has_contact_info: false, confidence: "low", details: "AI analysis unavailable" };

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          moderationResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error("Failed to parse AI response:", content);
      }
    }

    const status = moderationResult.has_contact_info ? "rejected" : "approved";
    const notes = moderationResult.has_contact_info
      ? `Auto-rejected: ${moderationResult.details} (confidence: ${moderationResult.confidence})`
      : `Auto-approved: ${moderationResult.details}`;

    await supabaseAdmin
      .from("helpers")
      .update({
        video_moderation_status: status,
        video_moderation_notes: notes,
      })
      .eq("id", helper.id);

    return new Response(
      JSON.stringify({ status, details: moderationResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(JSON.stringify({ error: "Moderation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
