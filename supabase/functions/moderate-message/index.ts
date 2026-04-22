import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, message_id, sender_id } = await req.json();

    if (!content || !message_id || !sender_id) {
      return new Response(
        JSON.stringify({ flagged: false, error: "Missing fields" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a message safety moderator for a domestic worker hiring platform. Analyze the message and determine if it violates any of these rules:

1. Sexual content or solicitation
2. Harassment, threats, or intimidation
3. Discrimination (race, gender, nationality, religion, etc.)
4. Salary exploitation (offering below minimum wage, unpaid work)
5. Off-platform coercion (pressuring to communicate outside the app, share personal contact info)
6. Scam behaviour (fake job offers, requesting money, phishing)

Respond ONLY with a JSON object. No markdown, no code fences.
{"flagged": true/false, "category": "category_name or null", "reason": "brief reason or null"}`,
            },
            {
              role: "user",
              content: `Analyze this message: "${content}"`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      return new Response(
        JSON.stringify({ flagged: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await response.json();
    const rawText = aiData.choices?.[0]?.message?.content?.trim() || "";
    
    let result = { flagged: false, category: null, reason: null };
    try {
      // Strip markdown fences if present
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      result = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", rawText);
    }

    // If flagged, log to audit_logs AND mark the message itself as flagged
    // so the receiver's RLS policy hides it.
    if (result.flagged) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Mark the message as flagged so receivers stop seeing it
      await fetch(`${SUPABASE_URL}/rest/v1/messages?id=eq.${message_id}`, {
        method: "PATCH",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({ moderation_status: "flagged" }),
      });

      await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          actor_id: sender_id,
          action: "message_flagged",
          target_id: message_id,
          target_type: "message",
          details: {
            category: result.category,
            reason: result.reason,
            content_preview: content.substring(0, 100),
          },
        }),
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-message error:", e);
    return new Response(
      JSON.stringify({ flagged: false, error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
