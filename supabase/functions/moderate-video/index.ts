import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONTACT_PATTERNS = [
  // Phone numbers
  /(\+?\d{1,4}[\s\-.]?)?\(?\d{2,4}\)?[\s\-.]?\d{3,4}[\s\-.]?\d{3,4}/g,
  // Email
  /[a-zA-Z0-9._%+\-]+\s*(?:at|@)\s*[a-zA-Z0-9.\-]+\s*(?:dot|\.)\s*[a-zA-Z]{2,}/gi,
  // WhatsApp mentions
  /whatsapp|whats\s*app|wa\s*me/gi,
  // Social media handles/platforms
  /(?:facebook|instagram|twitter|tiktok|telegram|signal|wechat|line)\b/gi,
  // "call me", "text me", "message me" patterns
  /(?:call|text|message|contact|reach|find)\s*me\s*(?:at|on|@)?\s*/gi,
  // Spelled out numbers (e.g. "zero eight two")
  /(?:zero|one|two|three|four|five|six|seven|eight|nine)(?:\s+(?:zero|one|two|three|four|five|six|seven|eight|nine)){5,}/gi,
];

function containsContactInfo(text: string): { found: boolean; matches: string[] } {
  const matches: string[] = [];
  for (const pattern of CONTACT_PATTERNS) {
    const found = text.match(pattern);
    if (found) matches.push(...found);
  }
  return { found: matches.length > 0, matches };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { helperId } = await req.json();
    if (!helperId) {
      return new Response(JSON.stringify({ error: "helperId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get helper's video URL
    const { data: helper, error: helperError } = await supabase
      .from("helpers")
      .select("intro_video_url, full_name")
      .eq("id", helperId)
      .single();

    if (helperError || !helper?.intro_video_url) {
      // No video, mark as approved (nothing to moderate)
      await supabase
        .from("helpers")
        .update({ video_moderation_status: "approved" })
        .eq("id", helperId);

      return new Response(JSON.stringify({ status: "no_video", moderation: "approved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update status to reviewing
    await supabase
      .from("helpers")
      .update({ video_moderation_status: "reviewing" })
      .eq("id", helperId);

    // Use Lovable AI (Gemini) to analyze the video for contact info
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
        // Extract JSON from response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          moderationResult = JSON.parse(jsonMatch[0]);
        }
      } catch {
        console.error("Failed to parse AI response:", content);
      }
    }

    // Determine final status
    const status = moderationResult.has_contact_info ? "rejected" : "approved";
    const notes = moderationResult.has_contact_info 
      ? `Auto-rejected: ${moderationResult.details} (confidence: ${moderationResult.confidence})`
      : `Auto-approved: ${moderationResult.details}`;

    await supabase
      .from("helpers")
      .update({
        video_moderation_status: status,
        video_moderation_notes: notes,
      })
      .eq("id", helperId);

    return new Response(
      JSON.stringify({ status, details: moderationResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Moderation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
