import { supabase } from "@/integrations/supabase/client";

/**
 * Worker data access layer.
 *
 * All user-facing worker READS come from the new schema:
 *   profiles + worker_profiles + worker_availability +
 *   worker_category_memberships + worker_categories
 *
 * The legacy `helpers` table is still used for:
 *   - the legacy id that links messages / applications / placements / unlocks
 *   - media & moderation fields that have no home in the new schema yet
 *     (avatar, intro video, verification, availability status)
 * and for backward-compatible WRITES only.
 */

export interface WorkerCategory {
  id: string;
  slug: string;
  name: string;
}

export interface WorkerRecord {
  /** Legacy helpers.id — still the linking key for messages/applications/placements. */
  helperId: string | null;
  /** profiles.id (== auth user id) — primary key of the new schema. */
  profileId: string;

  fullName: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;

  // worker_profiles
  status: string;
  publicArea: string | null;
  privateExactArea: string | null;
  biography: string | null;
  yearsExperience: number;
  expectedSalary: string | null;
  skillsText: string | null;
  languages: string[];
  profileCompletion: number;
  lastAvailabilityConfirmedAt: string | null;
  searchableAt: string | null;

  // worker_availability
  employmentTypes: string[];
  areasWillingToWork: string[];

  // worker_category_memberships -> worker_categories
  categories: WorkerCategory[];

  // legacy media / moderation (helpers)
  avatarUrl: string | null;
  introVideoUrl: string | null;
  isVerified: boolean;
  verificationStatus: string | null;
  availabilityStatus: string;
  availableFrom: string | null;
  videoModerationStatus: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  livingArrangement: string | null;
  hasWorkPermit: boolean | null;
  hasTools: boolean | null;
  hourlyRate: number | null;
}

type LegacyHelperRow = {
  id: string;
  user_id: string | null;
  avatar_url?: string | null;
  intro_video_url?: string | null;
  is_verified?: boolean | null;
  verification_status?: string | null;
  availability_status?: string | null;
  available_from?: string | null;
  video_moderation_status?: string | null;
  age?: number | null;
  gender?: string | null;
  nationality?: string | null;
  living_arrangement?: string | null;
  has_work_permit?: boolean | null;
  has_tools?: boolean | null;
  hourly_rate?: number | null;
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
};

const LEGACY_COLUMNS =
  "id, user_id, avatar_url, intro_video_url, is_verified, verification_status, availability_status, available_from, video_moderation_status, age, gender, nationality, living_arrangement, has_work_permit, has_tools, hourly_rate, full_name, phone, email";

function displayName(profile: any, legacy?: LegacyHelperRow | null): string {
  const composed = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  return (
    composed ||
    (profile?.full_name && profile?.surname
      ? `${profile.full_name} ${profile.surname}`.trim()
      : profile?.full_name) ||
    legacy?.full_name ||
    "Worker"
  );
}

function buildRecord(
  profile: any,
  worker: any | null,
  availability: any | null,
  categories: WorkerCategory[],
  legacy: LegacyHelperRow | null,
): WorkerRecord {
  return {
    helperId: legacy?.id ?? null,
    profileId: profile?.id ?? legacy?.user_id ?? "",

    fullName: displayName(profile, legacy),
    firstName: profile?.first_name ?? null,
    lastName: profile?.last_name ?? profile?.surname ?? null,
    email: profile?.email ?? legacy?.email ?? null,
    phone: profile?.phone_e164 ?? profile?.phone ?? legacy?.phone ?? null,
    dateOfBirth: profile?.date_of_birth ?? null,

    status: worker?.status ?? "pending_completion",
    publicArea: worker?.public_area ?? profile?.area ?? null,
    privateExactArea: worker?.private_exact_area ?? null,
    biography: worker?.biography ?? null,
    yearsExperience: worker?.years_experience ?? 0,
    expectedSalary: worker?.expected_salary ?? null,
    skillsText: worker?.skills_text ?? null,
    languages: worker?.languages ?? [],
    profileCompletion: worker?.profile_completion ?? 0,
    lastAvailabilityConfirmedAt: worker?.last_availability_confirmed_at ?? null,
    searchableAt: worker?.searchable_at ?? null,

    employmentTypes: availability?.employment_types ?? [],
    areasWillingToWork: availability?.areas_willing_to_work ?? [],

    categories,

    avatarUrl: legacy?.avatar_url ?? null,
    introVideoUrl: legacy?.intro_video_url ?? null,
    isVerified: Boolean(legacy?.is_verified),
    verificationStatus: legacy?.verification_status ?? null,
    availabilityStatus: legacy?.availability_status ?? "available",
    availableFrom: legacy?.available_from ?? null,
    videoModerationStatus: legacy?.video_moderation_status ?? null,
    age: legacy?.age ?? null,
    gender: legacy?.gender ?? null,
    nationality: legacy?.nationality ?? null,
    livingArrangement: legacy?.living_arrangement ?? null,
    hasWorkPermit: legacy?.has_work_permit ?? null,
    hasTools: legacy?.has_tools ?? null,
    hourlyRate: legacy?.hourly_rate ?? null,
  };
}

async function fetchCategoryMap(profileIds: string[]): Promise<Map<string, WorkerCategory[]>> {
  const map = new Map<string, WorkerCategory[]>();
  if (profileIds.length === 0) return map;

  const { data } = await supabase
    .from("worker_category_memberships")
    .select("worker_profile_id, category_id, worker_categories(id, slug, name)")
    .in("worker_profile_id", profileIds);

  for (const row of data || []) {
    const cat = (row as any).worker_categories;
    if (!cat) continue;
    const list = map.get((row as any).worker_profile_id) || [];
    list.push({ id: cat.id, slug: cat.slug, name: cat.name });
    map.set((row as any).worker_profile_id, list);
  }
  return map;
}

/** Read a single worker by their profile id (== auth user id). */
export async function fetchWorkerByProfileId(profileId: string): Promise<WorkerRecord | null> {
  const [{ data: profile }, { data: worker }, { data: availability }, { data: legacy }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", profileId).maybeSingle(),
      supabase.from("worker_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
      supabase
        .from("worker_availability")
        .select("*")
        .eq("worker_profile_id", profileId)
        .maybeSingle(),
      supabase.from("helpers").select(LEGACY_COLUMNS).eq("user_id", profileId).maybeSingle(),
    ]);

  if (!profile && !worker && !legacy) return null;

  const categories = (await fetchCategoryMap([profileId])).get(profileId) || [];
  return buildRecord(profile, worker, availability, categories, legacy as LegacyHelperRow | null);
}

/**
 * Read workers addressed by their legacy helper ids (messages, applications,
 * unlocks and placements still reference helpers.id).
 */
export async function fetchWorkersByHelperIds(helperIds: string[]): Promise<WorkerRecord[]> {
  if (helperIds.length === 0) return [];

  const { data: legacyRows } = await supabase
    .from("helpers")
    .select(LEGACY_COLUMNS)
    .in("id", helperIds);

  const legacy = (legacyRows || []) as LegacyHelperRow[];
  const profileIds = legacy.map((h) => h.user_id).filter(Boolean) as string[];
  if (profileIds.length === 0) {
    return legacy.map((l) => buildRecord(null, null, null, [], l));
  }

  const [{ data: profiles }, { data: workers }, { data: availabilities }, categoryMap] =
    await Promise.all([
      supabase.from("profiles").select("*").in("user_id", profileIds),
      supabase.from("worker_profiles").select("*").in("profile_id", profileIds),
      supabase.from("worker_availability").select("*").in("worker_profile_id", profileIds),
      fetchCategoryMap(profileIds),
    ]);

  const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
  const workerMap = new Map((workers || []).map((w: any) => [w.profile_id, w]));
  const availMap = new Map((availabilities || []).map((a: any) => [a.worker_profile_id, a]));

  return legacy.map((l) => {
    const pid = l.user_id || "";
    return buildRecord(
      profileMap.get(pid),
      workerMap.get(pid) ?? null,
      availMap.get(pid) ?? null,
      categoryMap.get(pid) || [],
      l,
    );
  });
}

/** Active worker categories from the new schema. */
export async function fetchWorkerCategories(): Promise<WorkerCategory[]> {
  const { data } = await supabase
    .from("worker_categories")
    .select("id, slug, name")
    .eq("is_active", true)
    .order("name");
  return (data || []) as WorkerCategory[];
}

export interface WorkerProfilePatch {
  biography?: string | null;
  years_experience?: number;
  expected_salary?: string | null;
  skills_text?: string | null;
  languages?: string[];
  public_area?: string | null;
  private_exact_area?: string | null;
  status?: string;
}

/**
 * Write worker profile edits to the new schema, mirroring to the legacy
 * `helpers` row for backward compatibility.
 */
export async function saveWorkerProfile(
  profileId: string,
  patch: WorkerProfilePatch,
  legacy?: { helperId?: string | null; fullName?: string; legacyPatch?: Record<string, any> },
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("worker_profiles")
    .upsert({ profile_id: profileId, ...patch }, { onConflict: "profile_id" });

  if (error) return { error: error.message };

  // --- backward-compatible legacy writes ---
  if (legacy?.helperId) {
    await supabase
      .from("helpers")
      .update({
        ...(legacy.fullName ? { full_name: legacy.fullName } : {}),
        ...(patch.biography !== undefined ? { bio: patch.biography } : {}),
        ...(patch.years_experience !== undefined
          ? { experience_years: patch.years_experience }
          : {}),
        ...(patch.languages !== undefined ? { languages: patch.languages } : {}),
        ...(patch.public_area !== undefined ? { location: patch.public_area } : {}),
        ...(legacy.legacyPatch || {}),
      })
      .eq("id", legacy.helperId);
  }

  if (legacy?.fullName) {
    await supabase
      .from("profiles")
      .update({ full_name: legacy.fullName })
      .eq("user_id", profileId);
  }

  return { error: null };
}
