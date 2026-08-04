import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAX_BYTES = 50 * 1024 * 1024;

function decodeBase64(input: string): Uint8Array {
  const clean = input.includes(",") ? input.split(",").pop()! : input;
  const binary = atob(clean.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonResponse({ error: "Authentication required" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }
    const userId = userData.user.id;

    const reqTypeEarly = req.headers.get("content-type") ?? "";
    if (reqTypeEarly.includes("application/json")) {
      // Peek at the body once; reuse it below.
      const raw = await req.text();
      const parsed = raw ? JSON.parse(raw) : {};

      // Signed-URL mode: React Native uploads large videos far more reliably by
      // PUTting the file straight to a pre-signed storage URL.
      if (parsed?.mode === "signed-url" || parsed?.signedUrl === true) {
        const isVideoReq =
          parsed.kind === "video" || String(parsed.contentType ?? "").startsWith("video/");
        const bucketName = isVideoReq ? "helper-videos" : "avatars";
        const extReq = String(parsed.filename ?? (isVideoReq ? "video.mp4" : "photo.jpg"))
          .split(".")
          .pop()!
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const objectPath = `${userId}/${isVideoReq ? "intro-video" : "photo"}-${Date.now()}.${extReq}`;

        const admin2 = admin;
        const { data: signed, error: signErr } = await admin2.storage
          .from(bucketName)
          .createSignedUploadUrl(objectPath);

        if (signErr || !signed) {
          return jsonResponse({ error: signErr?.message ?? "Could not create upload URL" }, 400);
        }

        const { data: pubUrl } = admin2.storage.from(bucketName).getPublicUrl(objectPath);

        if (isVideoReq) {
          await admin2
            .from("worker_profiles")
            .update({ intro_video_path: objectPath, intro_video_url: pubUrl.publicUrl })
            .eq("profile_id", userId);
          await admin2
            .from("helpers")
            .update({ intro_video_url: pubUrl.publicUrl })
            .eq("user_id", userId);
        } else {
          await admin2
            .from("worker_profiles")
            .update({ profile_photo_path: objectPath, profile_photo_url: pubUrl.publicUrl })
            .eq("profile_id", userId);
          await admin2.from("profiles").update({ avatar_url: pubUrl.publicUrl }).eq("user_id", userId);
          await admin2.from("helpers").update({ avatar_url: pubUrl.publicUrl }).eq("user_id", userId);
        }

        return jsonResponse({
          success: true,
          mode: "signed-url",
          bucket: bucketName,
          path: objectPath,
          token: signed.token,
          signedUrl: signed.signedUrl,
          uploadUrl: `${SUPABASE_URL}/storage/v1/${signed.path ?? `object/upload/sign/${bucketName}/${objectPath}`}`,
          url: pubUrl.publicUrl,
          publicUrl: pubUrl.publicUrl,
        });
      }

      // Re-attach the already-read body for the normal base64 path below.
      req = new Request(req.url, {
        method: "POST",
        headers: req.headers,
        body: raw,
      });
    }


    let fileBytes: Uint8Array | null = null;
    let contentType = "video/mp4";
    let filename = "intro-video.mp4";
    let kind = "video";

    const reqType = req.headers.get("content-type") ?? "";
    if (reqType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return jsonResponse({ error: "No file provided" }, 400);
      fileBytes = new Uint8Array(await file.arrayBuffer());
      contentType = file.type || contentType;
      filename = file.name || filename;
      kind = String(form.get("kind") ?? kind);
    } else {
      const body = await req.json().catch(() => null);
      if (!body?.base64 && !body?.file) {
        return jsonResponse({ error: "Provide 'base64' media data" }, 400);
      }
      fileBytes = decodeBase64(body.base64 ?? body.file);
      contentType = body.contentType || contentType;
      filename = body.filename || filename;
      kind = body.kind || (contentType.startsWith("image/") ? "image" : "video");
    }

    if (!fileBytes || fileBytes.byteLength === 0) {
      return jsonResponse({ error: "Uploaded file is empty" }, 400);
    }
    if (fileBytes.byteLength > MAX_BYTES) {
      return jsonResponse({ error: "File is larger than 50MB" }, 400);
    }

    const isVideo = kind === "video" || contentType.startsWith("video/");
    const bucket = isVideo ? "helper-videos" : "avatars";
    const ext = (filename.split(".").pop() || (isVideo ? "mp4" : "jpg"))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${isVideo ? "intro-video" : "photo"}-${Date.now()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from(bucket)
      .upload(path, fileBytes, { contentType, upsert: true });

    if (uploadError) {
      console.error("upload-media: storage error", uploadError.message);
      return jsonResponse({ error: uploadError.message }, 400);
    }

    const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    if (isVideo) {
      await admin
        .from("worker_profiles")
        .update({ intro_video_path: path, intro_video_url: publicUrl })
        .eq("profile_id", userId);
      await admin.from("helpers").update({ intro_video_url: publicUrl }).eq("user_id", userId);
    } else {
      await admin
        .from("worker_profiles")
        .update({ profile_photo_path: path, profile_photo_url: publicUrl })
        .eq("profile_id", userId);
      await admin.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", userId);
      await admin.from("helpers").update({ avatar_url: publicUrl }).eq("user_id", userId);
    }

    console.log("upload-media: stored", bucket, path, fileBytes.byteLength, "bytes");
    return jsonResponse({ success: true, bucket, path, url: publicUrl, publicUrl });
  } catch (e) {
    console.error("upload-media: unexpected", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Upload failed" }, 500);
  }
});
