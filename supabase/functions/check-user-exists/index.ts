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
      // Check profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},phone.eq.0${cleanPhone.slice(2)}`)
        .limit(1);

      if (profileData && profileData.length > 0) {
        phoneExists = true;
      } else {
        // Check auth.users via admin API
        const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1 });
        // Search by phone in users
        const phoneVariants = [cleanPhone, `+${cleanPhone}`, `0${cleanPhone.slice(2)}`];
        const found = usersData?.users?.some((u: any) => {
          const userPhone = (u.phone || "").replace(/\D/g, "");
          return phoneVariants.some(v => v.replace(/\D/g, "") === userPhone);
        });
        // This approach is too expensive for large user bases, use profiles check primarily
      }
    }

    if (email) {
      const trimmedEmail = email.trim().toLowerCase();
      // Check profiles table
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", trimmedEmail)
        .limit(1);

      if (profileData && profileData.length > 0) {
        emailExists = true;
      } else {
        // Check auth.users
        const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        emailExists = usersData?.users?.some((u: any) => u.email?.toLowerCase() === trimmedEmail) || false;
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
