import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const e164Pattern = /^\+[1-9][0-9]{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedRoles = new Set(["worker", "employer"]);
const documentationDeclarations = new Set([
  "valid_sa_id",
  "passport_work_authorisation",
  "other_lawful_documentation",
  "no_documentation",
  "prefer_not_to_disclose",
]);
const workArrangements = new Set([
  "full_time",
  "part_time",
  "once_off",
  "contract",
  "live_in",
  "live_out",
]);
const workerProfileStatuses = new Set(["pending_completion", "active_available"]);
const policyVersion = "launch-2026-07";

function isAdult(dateOfBirth: string) {
  const dob = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(dob.getTime())) return false;

  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 18;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asTextArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(asText).filter(Boolean);
}

function databaseErrorMessage(message: string) {
  if (message.includes("profiles_phone_unique")) {
    return "This mobile number is already registered. Sign in with that account or use another number.";
  }

  if (message.includes("idx_profiles_email_unique_lower")) {
    return "This email address is already registered. Sign in with that account or use another email.";
  }

  return message;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  if (!authHeader || !body) {
    return jsonResponse({ error: "Authenticated onboarding request required" }, 400);
  }

  const firstName = asText(body.firstName);
  const lastName = asText(body.lastName);
  const phoneE164 = asText(body.phoneE164);
  const email = asText(body.email).toLowerCase();
  const dateOfBirth = asText(body.dateOfBirth);
  const categorySlugs = asTextArray(body.categorySlugs);
  const selectedWorkArrangements = asTextArray(body.workArrangements);
  const areasWillingToWork = asTextArray(body.areasWillingToWork);
  const biography = asText(body.biography);
  const skills = asTextArray(body.skills);
  const languages = asTextArray(body.languages);
  const salaryRange = asText(body.salaryRange);
  const documentationDeclaration = asText(body.documentationDeclaration);
  const publicArea = asText(body.publicArea);
  const privateExactAddress = asText(body.privateExactAddress);
  const yearsExperience = Number(body.yearsExperience ?? 0);
  const requestedWorkerStatus = asText(body.workerProfileStatus);

  const errors: string[] = [];
  if (!allowedRoles.has(body.role)) errors.push("Invalid role.");
  if (!firstName) errors.push("First name is required.");
  if (!lastName) errors.push("Last name is required.");
  if (!e164Pattern.test(phoneE164)) {
    errors.push("Mobile number must be in international format, for example +27821234567.");
  }
  if (!emailPattern.test(email)) errors.push("A valid email address is required.");
  if (!isAdult(dateOfBirth)) errors.push("Domestic Hub is only available to adults aged 18 or older.");
  if (!body.acceptedTerms || !body.acceptedPrivacy || !body.acceptedAcceptableUse) {
    errors.push("All launch legal policies must be accepted.");
  }

  if (body.role === "worker") {
    if (categorySlugs.length === 0) errors.push("Choose at least one worker category.");
    if (selectedWorkArrangements.length === 0) errors.push("Choose at least one work preference.");
    if (selectedWorkArrangements.some((item) => !workArrangements.has(item))) {
      errors.push("One of the selected work preferences is not supported.");
    }
    if (areasWillingToWork.length === 0) errors.push("Enter at least one work area.");
    if (!Number.isInteger(yearsExperience) || yearsExperience < 0) {
      errors.push("Years of experience must be zero or more.");
    }
    if (!biography) errors.push("Short biography is required.");
    if (!documentationDeclarations.has(documentationDeclaration)) {
      errors.push("Choose your documentation declaration.");
    }
    if (!body.documentationDeclarationAccepted) errors.push("Confirm the documentation declaration.");
    if (requestedWorkerStatus && !workerProfileStatuses.has(requestedWorkerStatus)) {
      errors.push("Worker profile status is not supported.");
    }
  }

  if (body.role === "employer") {
    if (!publicArea) errors.push("General residential area is required.");
    if (!privateExactAddress) errors.push("Private exact address is required.");
  }

  if (errors.length > 0) {
    return jsonResponse({ error: "Validation failed", errors }, 422);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration missing" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey);

  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error } = await client.auth.getUser(token);
  if (error || !userData.user) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  const profileId = userData.user.id;
  const now = new Date().toISOString();

  const { error: profileError } = await client.from("profiles").upsert(
    {
      id: profileId,
      user_id: profileId,
      primary_role: body.role,
      role: body.role,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`.trim(),
      surname: lastName,
      email,
      phone: phoneE164,
      phone_e164: phoneE164,
      date_of_birth: dateOfBirth,
      email_verified_at: userData.user.email_confirmed_at ?? now,
      phone_verified_at: userData.user.phone_confirmed_at ?? now,
      accepted_terms_version: policyVersion,
      accepted_privacy_version: policyVersion,
      accepted_acceptable_use_version: policyVersion,
      age_checked_at: now,
      role_assigned_at: now,
      status: "active",
    },
    { onConflict: "id" },
  );

  if (profileError) {
    return jsonResponse({ error: databaseErrorMessage(profileError.message) }, 422);
  }

  if (body.role === "worker") {
    const workerStatus = requestedWorkerStatus || "active_available";
    const isSearchable = workerStatus === "active_available";
    const normalizedSlugs = [
      ...new Set(
        categorySlugs.map((slug) =>
          slug.toLowerCase().trim().replace(/[\s-]+/g, "_"),
        ),
      ),
    ];

    const { data: existingCategories, error: categoryError } = await client
      .from("worker_categories")
      .select("id, slug")
      .in("slug", normalizedSlugs);

    if (categoryError) return jsonResponse({ error: categoryError.message }, 422);

    let categories = existingCategories ?? [];
    const missing = normalizedSlugs.filter(
      (slug) => !categories.some((category) => category.slug === slug),
    );

    if (missing.length > 0) {
      console.log("complete-onboarding: creating missing worker categories", missing);
      const { data: created, error: createCategoryError } = await client
        .from("worker_categories")
        .insert(
          missing.map((slug) => ({
            slug,
            name: slug
              .split("_")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" "),
            is_active: true,
          })),
        )
        .select("id, slug");

      if (createCategoryError) {
        return jsonResponse({ error: createCategoryError.message }, 422);
      }
      categories = [...categories, ...(created ?? [])];
    }


    const { error: workerProfileError } = await client.from("worker_profiles").upsert(
      {
        profile_id: profileId,
        status: workerStatus,
        public_area: areasWillingToWork[0],
        private_exact_area: areasWillingToWork.join(", "),
        biography,
        years_experience: yearsExperience,
        expected_salary: salaryRange,
        skills_text: skills.join(", "),
        languages,
        profile_completion: 100,
        documentation_declaration: documentationDeclaration,
        documentation_declared_at: now,
        documentation_terms_version: policyVersion,
        last_availability_confirmed_at: now,
        searchable_at: isSearchable ? now : null,
      },
      { onConflict: "profile_id" },
    );

    if (workerProfileError) return jsonResponse({ error: workerProfileError.message }, 422);

    const { error: availabilityError } = await client.from("worker_availability").upsert(
      {
        worker_profile_id: profileId,
        employment_types: selectedWorkArrangements,
        areas_willing_to_work: areasWillingToWork,
        updated_at: now,
      },
      { onConflict: "worker_profile_id" },
    );

    if (availabilityError) return jsonResponse({ error: availabilityError.message }, 422);

    const { error: deleteMembershipError } = await client
      .from("worker_category_memberships")
      .delete()
      .eq("worker_profile_id", profileId);

    if (deleteMembershipError) return jsonResponse({ error: deleteMembershipError.message }, 422);

    const memberships = (categories ?? []).map((category) => ({
      worker_profile_id: profileId,
      category_id: category.id,
    }));
    const { error: membershipError } = await client
      .from("worker_category_memberships")
      .insert(memberships);
    if (membershipError) return jsonResponse({ error: membershipError.message }, 422);
  }

  if (body.role === "employer") {
    const { error: employerProfileError } = await client.from("employer_profiles").upsert(
      {
        profile_id: profileId,
        user_id: profileId,
        public_area: publicArea,
        private_exact_address: privateExactAddress,
      },
      { onConflict: "profile_id" },
    );

    if (employerProfileError) return jsonResponse({ error: employerProfileError.message }, 422);
    await client.rpc("ensure_employer_wallet", { employer: profileId });
  }

  const pendingWorker = body.role === "worker" && requestedWorkerStatus === "pending_completion";

  const completedSteps =
    body.role === "worker"
      ? ["account", "worker_category", "work_preferences", "experience", "documentation_declaration", "publish"]
      : ["account", "location", "profile", "legal_acceptance", "review"];

  const { error: onboardingError } = await client.from("onboarding_sessions").upsert(
    {
      profile_id: profileId,
      role: body.role,
      status: pendingWorker ? "in_progress" : "completed",
      current_step: pendingWorker ? "create_pin" : "completed",
      completed_steps: completedSteps,
      draft: body,
      completed_at: pendingWorker ? null : now,
    },
    { onConflict: "profile_id" },
  );

  if (onboardingError) return jsonResponse({ error: onboardingError.message }, 422);

  return jsonResponse({
    status: "saved",
    profileId,
    role: body.role,
  });
});
