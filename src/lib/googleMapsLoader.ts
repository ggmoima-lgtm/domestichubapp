type GoogleMapsLoaderStatus = "idle" | "loading" | "ready" | "error";

const GOOGLE_MAPS_SCRIPT_ID = "google-maps-js";
const LOAD_TIMEOUT_MS = 12000;

let status: GoogleMapsLoaderStatus = "idle";
let loadPromise: Promise<void> | null = null;
let lastError: Error | null = null;
const listeners = new Set<() => void>();

const canUseDom = () => typeof window !== "undefined" && typeof document !== "undefined";

const hasGoogleMaps = () => {
  if (!canUseDom()) return false;

  const googleMaps = (window as typeof window & { google?: typeof google }).google?.maps;
  return Boolean(googleMaps?.places || googleMaps?.importLibrary);
};

const notify = () => {
  listeners.forEach((listener) => listener());
};

const getScript = () => {
  if (!canUseDom()) return null;
  return document.getElementById(GOOGLE_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
};

const syncReadyState = () => {
  if (hasGoogleMaps()) {
    status = "ready";
    lastError = null;
  }
};

export const subscribeGoogleMapsLoader = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getGoogleMapsLoaderState = () => {
  syncReadyState();

  return {
    ready: status === "ready",
    loading: status === "loading",
    error: lastError,
  };
};

export const resetGoogleMapsLoader = () => {
  if (!canUseDom()) return;

  loadPromise = null;
  lastError = null;

  if (!hasGoogleMaps()) {
    status = "idle";
    getScript()?.remove();
  } else {
    status = "ready";
  }

  notify();
};

export const loadGoogleMaps = (apiKey: string) => {
  if (!canUseDom()) {
    return Promise.reject(new Error("Google Maps can only load in the browser"));
  }

  syncReadyState();

  if (status === "ready") {
    return Promise.resolve();
  }

  if (!apiKey) {
    status = "error";
    lastError = new Error("Missing Google Maps API key");
    notify();
    return Promise.reject(lastError);
  }

  if (loadPromise) {
    return loadPromise;
  }

  getScript()?.remove();
  status = "loading";
  lastError = null;
  notify();

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    let settled = false;

    const finalizeSuccess = () => {
      if (settled) return;
      settled = true;
      status = "ready";
      lastError = null;
      loadPromise = null;
      notify();
      resolve();
    };

    const finalizeError = (message: string, cause?: unknown) => {
      if (settled) return;
      settled = true;
      status = "error";
      lastError = cause instanceof Error ? cause : new Error(message);
      if (!(cause instanceof Error) && cause) {
        (lastError as Error & { cause?: unknown }).cause = cause;
      }
      loadPromise = null;
      notify();
      reject(lastError);
    };

    const timeoutId = window.setTimeout(() => {
      if (hasGoogleMaps()) {
        finalizeSuccess();
        return;
      }

      finalizeError("Google Maps load timed out");
    }, LOAD_TIMEOUT_MS);

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.clearTimeout(timeoutId);

      if (hasGoogleMaps()) {
        finalizeSuccess();
        return;
      }

      window.setTimeout(() => {
        if (hasGoogleMaps()) {
          finalizeSuccess();
        } else {
          finalizeError("Google Maps loaded without the Places library");
        }
      }, 0);
    };
    script.onerror = (event) => {
      window.clearTimeout(timeoutId);
      finalizeError("Failed to load Google Maps", event);
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};