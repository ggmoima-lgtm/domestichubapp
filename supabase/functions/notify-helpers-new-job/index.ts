import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { job_id, category, location, title, employer_id } = await req.json();

    if (!job_id || !category || !title) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find helpers matching the category who are available
    let query = supabase
      .from('helpers')
      .select('id, user_id, full_name, location')
      .eq('category', category)
      .in('availability_status', ['available', 'interviewing']);

    const { data: helpers } = await query;

    if (!helpers || helpers.length === 0) {
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter helpers by location similarity if location provided
    let matchingHelpers = helpers;
    if (location) {
      const locationLower = location.toLowerCase();
      // Extract city/suburb keywords for matching
      const locationWords = locationLower.split(/[,\s]+/).filter((w: string) => w.length > 3);
      
      matchingHelpers = helpers.filter((h: any) => {
        if (!h.location) return true; // Include helpers without location set
        const helperLoc = h.location.toLowerCase();
        return locationWords.some((word: string) => helperLoc.includes(word));
      });

      // If no location matches, notify all helpers in the category
      if (matchingHelpers.length === 0) {
        matchingHelpers = helpers;
      }
    }

    // Send notification to each matching helper
    let notified = 0;
    for (const helper of matchingHelpers) {
      if (!helper.user_id || helper.user_id === employer_id) continue;

      // Check notification preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('hire_updates')
        .eq('user_id', helper.user_id)
        .maybeSingle();

      if (prefs && prefs.hire_updates === false) continue;

      // Check if helper has push tokens
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', helper.user_id);

      if (tokens && tokens.length > 0) {
        // Log notification
        await supabase.from('audit_logs').insert({
          actor_id: helper.user_id,
          action: 'new_job_notification',
          target_type: 'job_post',
          target_id: job_id,
          details: { title, category, location },
        });
        notified++;
      }
    }

    return new Response(JSON.stringify({ notified, total_matching: matchingHelpers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
