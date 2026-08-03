import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function decodeBase64(input: string): Uint8Array {
  const clean = input.includes(",") ? input.split(",").pop()! : input;
  const binary = atob(clean.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return jsonResponse({ error: "Missing authorization header" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }
    const userId = userData.user.id;

    let fileBytes: Uint8Array | null = null;
    let contentType = "image/jpeg";
    let filename = "profile-photo.jpg";

    const reqType = req.headers.get("content-type") ?? "";

    if (reqType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonResponse({ error: "No file provided in form data" }, 400);
      }
      fileBytes = new Uint8Array(await file.arrayBuffer());
      contentType = file.type || contentType;
      filename = file.name || filename;
    } else {
      const body = await req.json().catch(() => null);
      if (!body?.base64 && !body?.file) {
        return jsonResponse({ error: "Provide 'base64' image data" }, 400);
      }
      fileBytes = decodeBase64(body.base64 ?? body.file);
      contentType = body.contentType || contentType;
      filename = body.filename || filename;
    }

    if (!fileBytes || fileBytes.byteLength === 0) {
      return jsonResponse({ error: "Uploaded image is empty" }, 400);
    }
    if (fileBytes.byteLength > 5 * 1024 * 1024) {
      return jsonResponse({ error: "Image is larger than 5MB" }, 400);
    }
    if (!contentType.startsWith("image/")) {
      return jsonResponse({ error: "Only image files are allowed" }, 400);
    }

    const ext = (filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/profile-photo-${Date.now()}.${ext || "jpg"}`;

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(path, fileBytes, { contentType, upsert: true });

    if (uploadError) {
      console.error("upload-avatar: storage error", uploadError.message);
      return jsonResponse({ error: uploadError.message }, 400);
    }

    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = pub.publicUrl;

    await admin.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", userId);
    await admin.from("helpers").update({ avatar_url: avatarUrl }).eq("user_id", userId);
    await admin.from("employer_profiles").update({ avatar_url: avatarUrl }).eq("user_id", userId);

    console.log("upload-avatar: stored", path, fileBytes.byteLength, "bytes");
    return jsonResponse({ success: true, path, avatarUrl });
  } catch (e) {
    console.error("upload-avatar: unexpected", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Upload failed" }, 500);
  }
});
