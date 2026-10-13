Deno.serve((request) => {
  const url = new URL(request.url);
  const reference = (url.searchParams.get("reference") || url.searchParams.get("trxref") || "").slice(0, 100);
  const returnTo = url.searchParams.get("returnTo") || "";

  const params = new URLSearchParams();
  if (/^[A-Za-z0-9._-]+$/.test(reference)) params.set("reference", reference);
  if (/^\/employer\/[A-Za-z0-9/_?=&%.-]*$/.test(returnTo)) params.set("returnTo", returnTo);

  return new Response(null, {
    status: 302,
    headers: { Location: `domestichub://employer/credits/result?${params.toString()}` }
  });
});
