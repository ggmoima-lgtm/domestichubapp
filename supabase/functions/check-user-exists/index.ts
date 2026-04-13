import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { phone, email } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let phoneExists = false;
    let emailExists = false;

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length >= 6) {
        // Check profiles table with various phone formats
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .or(`phone.like.%${cleanPhone.slice(-9)}`)
          .limit(1);
        phoneExists = !!(data && data.length > 0);
      }
    }

    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      // Check profiles table first
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .ilike("email", trimmedEmail)
        .limit(1);

      if (profileData && profileData.length > 0) {
        emailExists = true;
      } else {
        // Also check auth.users for email (e.g. placeholder emails for phone-only signups)
        const { data: userData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        emailExists = userData?.users?.some((u: any) => u.email?.toLowerCase() === trimmedEmail) || false;
      }
    }

    return new Response(
      JSON.stringify({ phoneExists, emailExists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
