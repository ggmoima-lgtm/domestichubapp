
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const pinPattern = /^[0-9]{4}$/;
const blockedPins = new Set(["0000", "1111", "1234", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "4321", "1212"]);
const iterations = 210000;

function isStrongPin(pin: string) {
  if (!pinPattern.test(pin) || blockedPins.has(pin)) return false;
  const digits = pin.split("").map(Number);
  const ascending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] + 1);
  const descending = digits.every((digit, index) => index === 0 || digit === digits[index - 1] - 1);
  return !ascending && !descending;
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

async function hashPin(pin: string, salt: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations },
    key,
    256
  );
  return toBase64(new Uint8Array(bits));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";
  const confirmPin = typeof body?.confirmPin === "string" ? body.confirmPin : "";

  if (!authHeader || !body) return jsonResponse({ error: "Sign in before resetting your PIN." }, 401);
  if (!pinPattern.test(pin) || !pinPattern.test(confirmPin)) return jsonResponse({ error: "Enter a four-digit PIN." }, 422);
  if (pin !== confirmPin) return jsonResponse({ error: "The PINs do not match." }, 422);
  if (!isStrongPin(pin)) return jsonResponse({ error: "This PIN is too easy to guess." }, 422);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ error: "Server configuration missing" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey);
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await client.auth.getUser(token);
  if (userError || !userData.user) return jsonResponse({ error: "Invalid session" }, 401);

  const salt = crypto.randomUUID();
  const { error } = await client.from("profile_pin_credentials").upsert(
    {
      profile_id: userData.user.id,
      pin_hash: await hashPin(pin, salt),
      salt,
      iterations,
      updated_at: new Date().toISOString()
    },
    { onConflict: "profile_id" }
  );
  if (error) return jsonResponse({ error: "We could not save your PIN. Please try again." }, 422);

  await client.from("security_events").insert({ profile_id: userData.user.id, event_type: "pin_reset", metadata: { source: "mobile" } });
  return jsonResponse({ status: "saved" });
});

