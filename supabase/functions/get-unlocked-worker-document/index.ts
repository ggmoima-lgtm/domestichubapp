import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

// Authorizes via get_employer_unlocked_document_access() (owner, or an
// employer with an active unlock), finds the file in whichever bucket
// really holds it, and signs a short-lived link with the service role.
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = request.headers.get("Authorization");
  const body = await request.json().catch(() => null);
  const documentId = typeof body?.documentId === "string" ? body.documentId.trim() : "";

  if (!authHeader || !documentId) {
    return jsonResponse({ error: "Authenticated documentId request required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration missing" }, 500);
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) {
    return jsonResponse({ error: "Please sign in again to view this document." }, 401);
  }

  const { data, error: rpcError } = await client
    .rpc("get_employer_unlocked_document_access", { document: documentId })
    .maybeSingle();

  if (rpcError) {
    console.error("get-unlocked-worker-document access check failed", {
      documentId,
      callerId: userData.user.id,
      message: rpcError.message
    });
    if (/denied/i.test(rpcError.message)) {
      return jsonResponse({ error: "Unlock this worker's profile to view their documents." }, 403);
    }
    if (/not found/i.test(rpcError.message)) {
      return jsonResponse({ error: "This document is no longer available." }, 404);
    }
    return jsonResponse({ error: "We couldn't open this document right now. Please try again." }, 422);
  }

  const storedPath = typeof data?.storage_path === "string" ? data.storage_path : "";
  if (!storedPath) {
    return jsonResponse({ error: "This document is no longer available." }, 404);
  }

  const knownBuckets = ["helper-documents", "avatars", "worker-documents"];
  const [firstSegment, ...remainder] = storedPath.split("/");
  const hasBucketPrefix = remainder.length > 0 && knownBuckets.includes(firstSegment);
  const objectPath = hasBucketPrefix ? remainder.join("/") : storedPath;
  const bucketCandidates = [...new Set([...(hasBucketPrefix ? [firstSegment] : []), "helper-documents", "avatars"])];

  const storageClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  let signedUrl = "";
  for (const bucketId of bucketCandidates) {
    const { data: signed, error: signError } = await storageClient.storage
      .from(bucketId)
      .createSignedUrl(objectPath, 60 * 10);
    if (!signError && signed?.signedUrl) {
      signedUrl = signed.signedUrl;
      break;
    }
  }

  if (!signedUrl) {
    console.error("get-unlocked-worker-document could not sign the file in any bucket", {
      documentId,
      bucketCandidates
    });
    return jsonResponse({ error: "This document is no longer available." }, 404);
  }

  return jsonResponse({ status: "processed", signedUrl });
});
