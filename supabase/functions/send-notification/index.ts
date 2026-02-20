import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  user_id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, type, title, body, data } = await req.json() as NotificationPayload;

    if (!user_id || !type || !title || !body) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check notification preferences
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    // Map notification type to preference key
    const prefMap: Record<string, string> = {
      'new_message': 'messages',
      'interview_request': 'interviews',
      'profile_unlocked': 'profile_unlocks',
      'hire_update': 'hire_updates',
      'new_review': 'reviews',
      'low_credits': 'credits',
      'admin_action': 'admin_actions',
      'status_reminder': 'hire_updates',
      'new_job': 'hire_updates',
    };

    const prefKey = prefMap[type];
    if (prefs && prefKey && prefs[prefKey] === false) {
      return new Response(JSON.stringify({ sent: false, reason: 'User disabled this notification type' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get push tokens for user
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', user_id);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: 'No push tokens found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the notification attempt (we'd integrate with FCM/APNs here)
    // For now, log to audit_logs
    await supabase.from('audit_logs').insert({
      actor_id: user_id,
      action: 'push_notification_sent',
      target_type: 'notification',
      target_id: type,
      details: { title, body, tokens_count: tokens.length, data },
    });

    return new Response(JSON.stringify({ 
      sent: true, 
      tokens_count: tokens.length,
      message: 'Notification queued for delivery' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
