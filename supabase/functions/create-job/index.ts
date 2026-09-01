import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item)).filter(Boolean);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function workArrangement(value: string): string {
  const normalized = value.toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "live_in") return "live_in";
  if (normalized === "live_out") return "live_out";
  return "remote_not_applicable";
}

function parseSalaryRange(value: string): { min: number | null; max: number | null } {
  if (/negotiable|discuss/i.test(value)) return { min: null, max: null };
  const amounts = value
    .match(/\d[\d\s,.]*/g)
    ?.map((part) => Number(part.replace(/[^\d.]/g, "")))
    .filter((amount) => Number.isFinite(amount) && amount > 0) ?? [];

  return {
    min: amounts[0] ?? null,
    max: amounts[1] ?? amounts[0] ?? null
  };
}

function required(value: unknown, label: string, errors: string[]): string {
  const text = asText(value);
  if (!text) errors.push(label);
  return text;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader) return jsonResponse({ error: "Please sign in to continue." }, 401);

  const missing: string[] = [];
  const title = required(body?.title, "Enter a job title.", missing);
  const publicArea = required(body?.publicArea, "Enter the approximate area.", missing);
  const privateExactAddress = required(body?.privateExactAddress, "Enter the private exact address.", missing);
  const startDate = required(body?.startDate, "Select a start date.", missing);
  const salaryRange = required(body?.salaryRange, "Enter the salary/rate or select Negotiable.", missing);
  const duties = required(body?.duties, "Enter the duties.", missing);
  const employmentType = required(body?.employmentType, "Select an employment type.", missing);
  const categoryIdOrSlug = asText(body?.categoryId);
  const categorySlug = asText(body?.categorySlug);
  const categoryIds = asTextArray(body?.categoryIds);
  const categorySlugs = asTextArray(body?.categorySlugs);
  if (!categoryIdOrSlug && !categorySlug && categoryIds.length === 0 && categorySlugs.length === 0) missing.push("Select at least one worker category.");

  if (missing.length > 0) {
    return jsonResponse({ error: "Please complete the required fields.", errors: missing }, 400);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || Number.isNaN(new Date(`${startDate}T00:00:00Z`).getTime())) {
    return jsonResponse({ error: "Enter the start date as YYYY-MM-DD.", errors: ["Enter the start date as YYYY-MM-DD."] }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Job posting is not ready yet." }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return jsonResponse({ error: "Please sign in to continue." }, 401);

  const employerProfileId = userData.user.id;
  const { data: employerProfile } = await client
    .from("employer_profiles")
    .select("profile_id")
    .eq("profile_id", employerProfileId)
    .maybeSingle();

  if (!employerProfile) {
    return jsonResponse({ error: "Please complete your employer profile before posting a job." }, 403);
  }

  const idCandidates = [...new Set([...categoryIds, categoryIdOrSlug].filter(isUuid))];
  const slugCandidates = [...new Set([
    ...categorySlugs,
    categorySlug,
    isUuid(categoryIdOrSlug) ? "" : categoryIdOrSlug
  ].map(asText).filter(Boolean))];
  const selectedCategories: Array<{ id: string; slug: string; name: string }> = [];

  if (idCandidates.length > 0) {
    const { data, error } = await client
      .from("worker_categories")
      .select("id, slug, name")
      .eq("is_active", true)
      .in("id", idCandidates);
    if (error) {
      return jsonResponse({ error: "Select a worker category.", errors: ["Select a worker category."] }, 400);
    }
    selectedCategories.push(...(data ?? []));
  }

  const resolvedSlugs = new Set(selectedCategories.map((category) => category.slug));
  const remainingSlugCandidates = slugCandidates.filter((slug) => !resolvedSlugs.has(slug));

  if (remainingSlugCandidates.length > 0) {
    const { data, error } = await client
      .from("worker_categories")
      .select("id, slug, name")
      .eq("is_active", true)
      .in("slug", remainingSlugCandidates);
    if (error) {
      return jsonResponse({ error: "Select a worker category.", errors: ["Select a worker category."] }, 400);
    }
    selectedCategories.push(...(data ?? []));
  }

  const uniqueCategories = Array.from(new Map(selectedCategories.map((category) => [category.id, category])).values());
  const category = uniqueCategories[0];
  if (!category?.id) {
    return jsonResponse({ error: "Select a worker category.", errors: ["Select a worker category."] }, 400);
  }

  const salary = parseSalaryRange(salaryRange);
  const { data: job, error: insertError } = await client
    .from("jobs")
    .insert({
      employer_profile_id: employerProfileId,
      category_id: category.id,
      title,
      status: "draft",
      employment_type: employmentType,
      work_arrangement: workArrangement(asText(body?.workArrangement)),
      public_area: publicArea,
      private_exact_address: privateExactAddress,
      start_date: startDate,
      salary_min: salary.min,
      salary_max: salary.max,
      duties
    })
    .select("id, title, status, public_area")
    .single();

  if (insertError) {
    console.error("create-job insert failed", {
      employerProfileId,
      code: insertError.code,
      message: insertError.message
    });
    return jsonResponse({ error: "We couldn't create this job. Please check the form and try again." }, 500);
  }

  if (uniqueCategories.length > 1) {
    const { error: detailError } = await client
      .from("job_category_details")
      .upsert({
        job_id: job.id,
        detail: {
          selectedCategories: uniqueCategories.map((item) => ({
            id: item.id,
            slug: item.slug,
            name: item.name
          }))
        }
      });

    if (detailError) {
      console.error("create-job category detail insert failed", {
        jobId: job.id,
        code: detailError.code,
        message: detailError.message
      });
    }
  }

  return jsonResponse({
    status: "created",
    job,
    employerProfileId,
    publishViaRpc: "publish_job"
  });
});
