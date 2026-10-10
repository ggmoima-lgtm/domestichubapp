import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const autocompleteUrl = "https://places.googleapis.com/v1/places:autocomplete";
const detailsUrl = "https://places.googleapis.com/v1/places";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalise(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
}

interface AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

function componentText(components: AddressComponent[], ...types: string[]): string {
  for (const type of types) {
    const match = components.find((component) => component.types?.includes(type));
    if (match?.longText) return match.longText;
  }
  return "";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  // Require a signed-in user so this paid Google lookup is not an open public proxy.
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const authUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!token || !authUrl || !anonKey) return jsonResponse({ error: "Please sign in to continue." }, 401);
  const { data: authData, error: authError } = await createClient(authUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  }).auth.getUser(token);
  if (authError || !authData?.user) return jsonResponse({ error: "Please sign in to continue." }, 401);

  const body = await request.json().catch(() => null);
  const action = asText(body?.action);
  const sessionToken = asText(body?.sessionToken).slice(0, 64);

  const apiKey =
    Deno.env.get("GOOGLE_PLACES_API_KEY") ??
    Deno.env.get("GOOGLE_MAPS_API_KEY") ??
    Deno.env.get("VITE_GOOGLE_MAPS_API_KEY");
  if (!apiKey) {
    return jsonResponse({ error: "Place lookup is not available right now.", code: "not_configured" }, 503);
  }

  if (action === "autocomplete") {
    const input = asText(body?.input).slice(0, 80);
    if (input.length < 3) return jsonResponse({ suggestions: [] });

    const response = await fetch(autocompleteUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.placeId",
          "suggestions.placePrediction.text.text",
          "suggestions.placePrediction.structuredFormat.mainText.text",
          "suggestions.placePrediction.structuredFormat.secondaryText.text"
        ].join(",")
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["za"],
        includedPrimaryTypes: ["(regions)"],
        languageCode: "en",
        regionCode: "za",
        ...(sessionToken ? { sessionToken } : {})
      })
    });

    if (!response.ok) {
      console.error("[resolve-place] autocomplete failed", { status: response.status });
      return jsonResponse({ error: "Place lookup is not available right now.", code: "upstream_error" }, 502);
    }

    const data = await response.json().catch(() => ({}));
    const suggestions = (Array.isArray(data?.suggestions) ? data.suggestions : [])
      .map((item: Record<string, any>) => item?.placePrediction)
      .filter((prediction: Record<string, any> | undefined) => prediction?.placeId)
      .slice(0, 5)
      .map((prediction: Record<string, any>) => ({
        placeId: String(prediction.placeId),
        label: asText(prediction.text?.text),
        main: asText(prediction.structuredFormat?.mainText?.text) || asText(prediction.text?.text),
        secondary: asText(prediction.structuredFormat?.secondaryText?.text)
      }));

    return jsonResponse({ suggestions });
  }

  if (action === "details") {
    const placeId = asText(body?.placeId);
    if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) return jsonResponse({ error: "A valid place is required." }, 400);

    const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
    const response = await fetch(`${detailsUrl}/${encodeURIComponent(placeId)}${query}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,types,addressComponents"
      }
    });

    if (!response.ok) {
      console.error("[resolve-place] details failed", { status: response.status });
      return jsonResponse({ error: "Place lookup is not available right now.", code: "upstream_error" }, 502);
    }

    const place = await response.json().catch(() => ({}));
    const components: AddressComponent[] = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
    const types: string[] = Array.isArray(place?.types) ? place.types : [];
    const displayName = asText(place?.displayName?.text);

    const isAreaItself = types.some((type) => ["sublocality", "sublocality_level_1", "neighborhood"].includes(type));
    const suburb =
      componentText(components, "sublocality_level_1", "sublocality", "neighborhood") ||
      (isAreaItself ? displayName : "");
    const locality = componentText(components, "locality") || (types.includes("locality") ? displayName : "");
    const province = componentText(components, "administrative_area_level_1");

    let city: { id: string; name: string; provinceId: string; provinceName: string } | null = null;
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && serviceRoleKey && (locality || suburb)) {
      const client = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data: cities } = await client
        .from("sa_cities")
        .select("id, name, province_id, sa_provinces(name)");

      const rows = (cities ?? []).map((row: Record<string, any>) => {
        const provinceRelation = Array.isArray(row.sa_provinces) ? row.sa_provinces[0] : row.sa_provinces;
        return { id: String(row.id), name: String(row.name), provinceId: String(row.province_id), provinceName: String(provinceRelation?.name ?? "") };
      });

      const provinceKey = normalise(province);
      const candidates = [locality, suburb].filter(Boolean);
      for (const candidate of candidates) {
        const haystack = normalise(candidate);
        const matches = rows.filter((row) => {
          if (province && normalise(row.provinceName) !== provinceKey) return false;
          return haystack.includes(normalise(row.name));
        });
        const distinct = new Set(matches.map((row) => row.id));
        if (distinct.size === 1) {
          city = matches[0];
          break;
        }
      }
    }

    return jsonResponse({
      place: {
        suburb: suburb || displayName,
        locality,
        province,
        city
      }
    });
  }

  return jsonResponse({ error: "Unknown action." }, 400);
});