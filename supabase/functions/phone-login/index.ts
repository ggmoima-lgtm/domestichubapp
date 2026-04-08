import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PhoneLoginSchema = z.object({
  phone: z.string().min(6).max(32),
  password: z.string().min(6).max(128),
  countryCode: z.string().min(1).max(8).optional(),
});

const normalizePhoneCandidates = (phone: string, countryCode?: string) => {
  const digits = phone.replace(/\D/g, "");
  const countryDigits = countryCode?.replace(/\D/g, "") ?? "";
  const candidates = new Set<string>();

  if (digits) {
    candidates.add(digits);
  }

  if (digits.length === 9) {
    candidates.add(`0${digits}`);
  }

  if (countryDigits && digits.startsWith(countryDigits)) {
    const withoutCountryCode = digits.slice(countryDigits.length);

    if (withoutCountryCode) {
      candidates.add(withoutCountryCode);
    }

    if (withoutCountryCode.length === 9) {
      candidates.add(`0${withoutCountryCode}`);
    }
  }

  if (countryDigits && digits.length === 10 && digits.startsWith("0")) {
    candidates.add(`${countryDigits}${digits.slice(1)}`);
  }

  return [...candidates].filter((candidate) => candidate.length >= 9 && candidate.length <= 15);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = PhoneLoginSchema.safeParse(await req.json());

    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, password, countryCode } = parsed.data;
    const phoneCandidates = normalizePhoneCandidates(phone, countryCode);

    if (phoneCandidates.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid login credentials" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: profile } = await serviceClient
      .from("profiles")
      .select("user_id, email, phone")
      .in("phone", phoneCandidates)
      .limit(1)
      .maybeSingle();

    const candidateEmails = new Set<string>();

    if (profile?.email?.trim()) {
      candidateEmails.add(profile.email.trim());
    }

    if (profile?.user_id) {
      const { data: userData } = await serviceClient.auth.admin.getUserById(profile.user_id);
      const authEmail = userData.user?.email?.trim();

      if (authEmail) {
        candidateEmails.add(authEmail);
      }
    }

    for (const candidate of phoneCandidates) {
      candidateEmails.add(`${candidate}@helper.domestichub.co.za`);
    }

    for (const email of candidateEmails) {
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });

      if (!error && data.session) {
        return new Response(
          JSON.stringify({
            success: true,
            session: {
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at,
              expires_in: data.session.expires_in,
              token_type: data.session.token_type,
              user: data.session.user,
            },
            user: data.user,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Invalid login credentials" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("phone-login error:", error);

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});