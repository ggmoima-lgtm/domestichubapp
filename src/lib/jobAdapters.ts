import { supabase } from "@/integrations/supabase/client";

// Maps the web job form's category values to active worker_categories slugs.
export const CATEGORY_SLUG_MAP: Record<string, string> = {
  nanny: "nanny",
  housekeeper: "housekeeper",
  caregiver: "elderly-caregiver",
  "all-around": "domestic-worker",
  gardener: "gardener",
};

export function slugToWebCategory(slug: string | null | undefined): string {
  if (!slug) return "";
  const entry = Object.entries(CATEGORY_SLUG_MAP).find(([, s]) => s === slug);
  return entry ? entry[0] : "";
}

export function normalizeWorkArrangement(value: string | null | undefined): string | null {
  const normalized = (value || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "live_in") return "live_in";
  if (normalized === "live_out") return "live_out";
  return null;
}

export function displayWorkArrangement(value: string | null | undefined): string {
  switch ((value || "").toLowerCase()) {
    case "live_in":
      return "live-in";
    case "live_out":
      return "live-out";
    default:
      return "";
  }
}

export function displayWorkArrangementLabel(value: string | null | undefined): string {
  switch ((value || "").toLowerCase()) {
    case "live_in":
      return "Live-in";
    case "live_out":
      return "Live-out";
    default:
      return "";
  }
}

// Resolves a web category value to a worker_categories id.
export async function resolveCategoryId(webCategory: string): Promise<string | null> {
  const slug = CATEGORY_SLUG_MAP[webCategory];
  if (!slug) return null;
  const { data } = await supabase
    .from("worker_categories")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return (data as { id: string } | null)?.id ?? null;
}

// Jobs reference employer_profiles.profile_id, which must match the signed-in
// user id for the jobs RLS policies to grant access. Backfill/repair the row.
export async function ensureEmployerProfile(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("employer_profiles")
    .select("id, profile_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (data?.id) {
    if (data.profile_id === userId) return true;
    const { error } = await supabase
      .from("employer_profiles")
      .update({ profile_id: userId } as any)
      .eq("user_id", userId);
    return !error;
  }

  const { data: inserted, error } = await supabase
    .from("employer_profiles")
    .insert({ user_id: userId, profile_id: userId } as any)
    .select("id")
    .maybeSingle();
  return Boolean(inserted) && !error;
}

// jobs.duties is a single text column; fold the legacy description,
// duty tags and category extras into it.
export function buildDutiesText(
  description: string | null,
  tags: string[],
  extras: string[] = []
): string | null {
  const parts: string[] = [];
  const trimmed = (description || "").trim();
  if (trimmed) parts.push(trimmed);
  if (tags.length > 0) parts.push(`Duties: ${tags.join(", ")}`);
  parts.push(...extras.filter(Boolean));
  return parts.length > 0 ? parts.join("\n") : null;
}
