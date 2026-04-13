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

   if (digits.length === 10 && digits.startsWith("0")) {
     candidates.add(digits.slice(1));
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

   if (countryDigits && digits.length === 9) {
     candidates.add(`${countryDigits}${digits}`);
   }

  if (countryDigits && digits.length === 10 && digits.startsWith("0")) {
    candidates.add(`${countryDigits}${digits.slice(1)}`);
  }

  return [...candidates].filter((candidate) => candidate.length >= 9 && candidate.length <= 15);
};

const findFirstMatchingPhoneRecord = async (
  client: any,
  table: "profiles" | "helpers",
  phoneCandidates: string[],
) => {
  const uniqueCandidates = [...new Set(phoneCandidates)];

  const { data: exactMatch } = await client
    .from(table)
    .select("user_id, email, phone")
    .in("phone", uniqueCandidates)
    .limit(1)
    .maybeSingle();

  if (exactMatch) {
    return exactMatch;
  }

  const suffixes = [...new Set(
    uniqueCandidates
      .map((candidate) => candidate.slice(-9))
      .filter((candidate) => candidate.length === 9)
  )];

  if (suffixes.length === 0) {
    return null;
  }

  const { data: looseMatch } = await client
    .from(table)
    .select("user_id, email, phone")
    .or(suffixes.map((candidate) => `phone.like.%${candidate}`).join(","))
    .limit(1)
    .maybeSingle();

  return looseMatch ?? null;
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
      return new Response(JSON.stringify({ error: "Phone number not found. Please check the number or sign up." }), {
        status: 404,
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

    // Step 1: Check if the phone number exists in profiles
    const profile = await findFirstMatchingPhoneRecord(serviceClient, "profiles", phoneCandidates);

    // If no profile found, also check helpers table
    let helperProfile = null;
    if (!profile) {
      helperProfile = await findFirstMatchingPhoneRecord(serviceClient, "helpers", phoneCandidates);
    }

    const foundProfile = profile || helperProfile;

    // If no profile found at all, return a clear "not found" message
    if (!foundProfile) {
      // Also check if any placeholder email exists in auth
      let foundAnyAuth = false;
      for (const candidate of phoneCandidates) {
        const placeholderEmail = `${candidate}@helper.domestichub.co.za`;
        const { data: userData } = await serviceClient.auth.admin.listUsers({ 
          page: 1, 
          perPage: 1 
        });
        // Quick check via getUserById won't work, try sign in to see
        const { error } = await authClient.auth.signInWithPassword({ 
          email: placeholderEmail, 
          password 
        });
        if (!error) {
          foundAnyAuth = true;
          // Actually succeeded - get the session
          const { data } = await authClient.auth.signInWithPassword({ 
            email: placeholderEmail, 
            password 
          });
          if (data?.session) {
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
      }

      return new Response(JSON.stringify({ error: "Phone number not found. Please check the number or sign up." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Phone exists - now try to authenticate
    const candidateEmails = new Set<string>();

    if (foundProfile.email?.trim()) {
      candidateEmails.add(foundProfile.email.trim());
    }

    if (foundProfile.user_id) {
      const { data: userData } = await serviceClient.auth.admin.getUserById(foundProfile.user_id);
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

    // Phone exists but password is wrong
    return new Response(JSON.stringify({ error: "Incorrect password. Please try again or reset your password." }), {
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
