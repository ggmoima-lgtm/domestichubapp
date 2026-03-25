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

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

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

    // Get helper's video URL
    const { data: helper, error: helperError } = await supabaseAdmin
      .from("helpers")
      .select("id, intro_video_url, full_name, bio")
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

    // Also scan the bio text for contact info
    const bioText = helper.bio || "";
    const contactPatterns = [
      /(\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g,
      /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
      /(?:https?:\/\/)?(?:wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com)\/[^\s]+/gi,
      /@[a-zA-Z0-9_]{3,30}/g,
      /(?:https?:\/\/)?(?:www\.)?(?:facebook|fb|instagram|twitter|x|tiktok|linkedin)\.com\/[^\s]+/gi,
      /(?:call|whatsapp|text|sms|message)\s*(?:me\s*)?(?:at|on|@)?\s*[\d\s\-+().]{7,}/gi,
    ];

    let bioHasContact = false;
    let bioContactDetails = "";
    for (const pattern of contactPatterns) {
      const matches = bioText.match(pattern);
      if (matches) {
        bioHasContact = true;
        bioContactDetails += matches.join(", ") + "; ";
      }
    }

    // Use AI to analyze the video — pass as video content for Gemini
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
            content: `You are a strict video content moderator for a domestic worker platform. Your job is to detect if a helper shares personal contact information in their introduction video.

STRICTLY look for ANY of these:
- Phone numbers (spoken, shown on screen, or written on paper/cards)
- Email addresses
- WhatsApp numbers or mentions of "WhatsApp me"  
- Social media handles or usernames (Instagram, Facebook, TikTok, etc.)
- Any instructions like "call me at", "message me on", "find me on", "reach me at"
- Numbers spelled out letter by letter or digit by digit
- Any URL or website mentioned

Also check if the person shows any written text (on paper, phone screen, whiteboard, etc.) that contains contact info.

Be VERY strict — if in doubt, flag it.

Respond ONLY with this JSON:
{
  "has_contact_info": true/false,
  "confidence": "high"/"medium"/"low",
  "details": "what was found or 'No contact information detected'"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this helper introduction video for ANY personal contact information. The video URL is provided below. Check both the audio/speech AND any visible text on screen. Be strict — any phone number, email, social handle, or contact instruction should be flagged.\n\nHelper's bio text for context: "${bioText}"`
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
    } else {
      console.error("AI response error:", aiResponse.status, await aiResponse.text());
    }

    // Combine AI result with bio text scan
    const hasContactInfo = moderationResult.has_contact_info || bioHasContact;
    const combinedDetails = [
      moderationResult.details,
      bioHasContact ? `Bio text contains contact info: ${bioContactDetails}` : null,
    ].filter(Boolean).join(" | ");

    const status = hasContactInfo ? "rejected" : "approved";
    const notes = hasContactInfo
      ? `Auto-rejected: ${combinedDetails} (AI confidence: ${moderationResult.confidence})`
      : `Auto-approved: ${combinedDetails}`;

    await supabaseAdmin
      .from("helpers")
      .update({
        video_moderation_status: status,
        video_moderation_notes: notes,
      })
      .eq("id", helper.id);

    return new Response(
      JSON.stringify({ status, details: { ...moderationResult, bioHasContact, combinedDetails } }),
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
