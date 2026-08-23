/**
 * Guarded PWA service-worker registration.
 * Follows the PWA skill: never register in dev, iframe, or Lovable preview hosts.
 */
export async function registerPWA(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const hostname = window.location.hostname;
  const isPreviewOrDev =
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev");

  const isIframe = window.self !== window.top;
  const swOff = new URLSearchParams(window.location.search).get("sw") === "off";
  const shouldRegister =
    import.meta.env.PROD && !isPreviewOrDev && !isIframe && !swOff;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const appSWs = registrations.filter((r) =>
    r.scope.endsWith("/") && r.scope.includes(window.location.origin)
  );

  if (!shouldRegister) {
    await Promise.all(appSWs.map((r) => r.unregister()));
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch (err) {
    console.error("PWA service worker registration failed:", err);
  }
}
