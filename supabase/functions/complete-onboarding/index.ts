import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.24.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const WorkerSchema = z.object({
  role: z.literal("worker"),
  full_name: z.string().min(1, "Full name is required").max(120),
  surname: z.string().max(120).optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().min(6, "Phone is required").max(32),
  category: z.string().min(1, "Category is required"),
  service_type: z.enum(["domestic", "gardening", "both"]).optional(),
  experience_years: z.number().int().min(0).max(80).optional(),
  hourly_rate: z.number().min(0).max(100000).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  availability: z.string().max(200).optional().nullable(),
  availability_status: z
    .enum(["available", "interviewing", "hired_platform", "hired_external", "unavailable"])
    .optional(),
  available_from: z.string().optional().nullable(),
  skills: z.array(z.string()).optional(),
  skills_domestic: z.array(z.string()).optional(),
  skills_gardening: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  has_work_permit: z.boolean().optional(),
  has_tools: z.boolean().optional(),
  intro_video_url: z.string().url().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
  age: z.number().int().min(18, "Must be 18 or older").max(100).optional(),
  gender: z.string().max(40).optional().nullable(),
  nationality: z.string().max(80).optional().nullable(),
  living_arrangement: z.string().max(80).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  area: z.string().max(120).optional().nullable(),
});

const EmployerSchema = z.object({
  role: z.literal("employer"),
  full_name: z.string().min(1, "Full name is required").max(120),
  surname: z.string().max(120).optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable(),
  phone: z.string().min(6, "Phone is required").max(32),
  avatar_url: z.string().url().optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  type_of_need: z.enum(["full-time", "part-time", "live-in", "live-out"]).optional().nullable(),
  category: z.string().optional().nullable(),
  availability: z.array(z.string()).optional(),
  custom_notes: z.string().max(2000).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  formatted_address: z.string().max(300).optional().nullable(),
  suburb: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  province: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  place_id: z.string().max(200).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

const BodySchema = z.discriminatedUnion("role", [WorkerSchema, EmployerSchema]);

const flattenErrors = (err: z.ZodError) =>
  err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Authentication required. Please sign in and try again." }, 401);
  }
  const token = authHeader.slice("Bearer ".length);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return json({ error: "Your session has expired. Please sign in again." }, 401);
  }
  const userId = claimsData.claims.sub as string;
  const userEmail = (claimsData.claims.email as string | undefined) ?? null;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "Validation failed", errors: [{ path: "", message: "Invalid JSON body" }] }, 400);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return json({ error: "Validation failed", errors: flattenErrors(parsed.error) }, 400);
  }
  const input = parsed.data;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const profileRole = input.role === "worker" ? "helper" : "employer";
  const effectiveEmail = input.email ?? userEmail ?? "";

  // 1) Upsert into profiles (unique on user_id)
  const { error: profileErr } = await admin
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        full_name: input.full_name,
        surname: input.surname ?? null,
        phone: input.phone,
        email: effectiveEmail,
        role: profileRole,
        onboarding_completed: true,
        city: (input as any).city ?? null,
        area: (input as any).area ?? null,
      },
      { onConflict: "user_id" },
    );

  if (profileErr) {
    console.error("profiles upsert error", profileErr);
    return json({ error: "Failed to save profile", errors: [{ path: "profiles", message: profileErr.message }] }, 400);
  }

  if (input.role === "worker") {
    // Find existing helper for this user
    const { data: existing, error: findErr } = await admin
      .from("helpers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (findErr) {
      console.error("helpers lookup error", findErr);
      return json({ error: "Failed to load helper record", errors: [{ path: "helpers", message: findErr.message }] }, 400);
    }

    const helperPayload: Record<string, unknown> = {
      user_id: userId,
      full_name: input.full_name,
      email: effectiveEmail,
      phone: input.phone,
      category: input.category,
      service_type: input.service_type ?? "domestic",
      experience_years: input.experience_years ?? 0,
      hourly_rate: input.hourly_rate ?? null,
      bio: input.bio ?? null,
      availability: input.availability ?? null,
      availability_status: input.availability_status ?? "available",
      available_from: input.available_from ?? null,
      skills: input.skills ?? [],
      skills_domestic: input.skills_domestic ?? [],
      skills_gardening: input.skills_gardening ?? [],
      languages: input.languages ?? [],
      has_work_permit: input.has_work_permit ?? false,
      has_tools: input.has_tools ?? false,
      intro_video_url: input.intro_video_url ?? null,
      avatar_url: input.avatar_url ?? null,
      age: input.age ?? null,
      gender: input.gender ?? null,
      nationality: input.nationality ?? null,
      living_arrangement: input.living_arrangement ?? null,
      location: input.location ?? null,
    };

    let helperId: string;
    if (existing?.id) {
      const { data, error } = await admin
        .from("helpers")
        .update(helperPayload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) {
        console.error("helpers update error", error);
        return json({ error: "Failed to save helper details", errors: [{ path: "helpers", message: error.message }] }, 400);
      }
      helperId = data.id;
    } else {
      const { data, error } = await admin
        .from("helpers")
        .insert(helperPayload)
        .select("id")
        .single();
      if (error) {
        console.error("helpers insert error", error);
        return json({ error: "Failed to save helper details", errors: [{ path: "helpers", message: error.message }] }, 400);
      }
      helperId = data.id;
    }

    return json({ status: "saved", profileId: helperId, role: "worker" });
  }

  // Employer
  const employerPayload: Record<string, unknown> = {
    user_id: userId,
    full_name: input.full_name,
    email: effectiveEmail,
    avatar_url: input.avatar_url ?? null,
    date_of_birth: input.date_of_birth ?? null,
    type_of_need: input.type_of_need ?? null,
    category: input.category ?? null,
    availability: input.availability ?? [],
    custom_notes: input.custom_notes ?? null,
    location: input.location ?? null,
    formatted_address: input.formatted_address ?? null,
    suburb: input.suburb ?? null,
    city: input.city ?? null,
    province: input.province ?? null,
    country: input.country ?? null,
    place_id: input.place_id ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };

  const { data: empRow, error: empErr } = await admin
    .from("employer_profiles")
    .upsert(employerPayload, { onConflict: "user_id" })
    .select("id")
    .single();

  if (empErr) {
    console.error("employer_profiles upsert error", empErr);
    return json({ error: "Failed to save employer profile", errors: [{ path: "employer_profiles", message: empErr.message }] }, 400);
  }

  return json({ status: "saved", profileId: empRow.id, role: "employer" });
});
