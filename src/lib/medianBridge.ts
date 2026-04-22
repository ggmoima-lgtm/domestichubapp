/**
 * Median.co JavaScript Bridge helpers.
 *
 * The Median wrapper injects a global `median` object into the WebView. We use
 * it to (a) detect whether the app is running inside the native shell and
 * (b) deep-link the user into iOS/Android system Settings when they have
 * denied a permission we need (camera, location, microphone).
 *
 * App Review specifically watches for graceful permission-denial UX, so any
 * "permission was denied" UI should offer an "Open Settings" button when we
 * are inside Median. In a regular browser the bridge is absent and these
 * functions silently no-op (callers should fall back to a generic message).
 */

type MedianBridge = {
  open?: {
    appSettings?: () => void;
  };
  permissions?: {
    status?: (
      types?: string[]
    ) => Promise<Record<string, "granted" | "denied" | "undetermined">>;
  };
};

const getBridge = (): MedianBridge | null => {
  if (typeof window === "undefined") return null;
  return (window as unknown as { median?: MedianBridge }).median ?? null;
};

/**
 * True when the app is running inside the Median.co native wrapper.
 * Use this to gate "Open Settings" buttons — they're meaningless in a
 * regular browser tab.
 */
export const isMedianApp = (): boolean => {
  const bridge = getBridge();
  return Boolean(bridge && typeof bridge.open?.appSettings === "function");
};

/**
 * Open the iOS / Android Settings page for this app so the user can grant a
 * previously-denied permission. No-op outside Median.
 */
export const openAppSettings = (): void => {
  const bridge = getBridge();
  if (bridge?.open?.appSettings) {
    try {
      bridge.open.appSettings();
    } catch (err) {
      console.warn("[medianBridge] openAppSettings failed:", err);
    }
  }
};

/**
 * Query the current status of one or more native permissions. Returns null
 * when the bridge isn't available (e.g. browser).
 *
 * Permission names follow Median's API:
 *   "Camera" | "Microphone" | "LocationWhenInUse" | "LocationAlways"
 *   | "PhotoLibrary" | "Notifications" | "Contacts"
 *   | "AppTrackingTransparency"
 */
export const getPermissionStatus = async (
  permissions: string[]
): Promise<Record<string, "granted" | "denied" | "undetermined"> | null> => {
  const bridge = getBridge();
  if (!bridge?.permissions?.status) return null;
  try {
    return await bridge.permissions.status(permissions);
  } catch (err) {
    console.warn("[medianBridge] permissions.status failed:", err);
    return null;
  }
};
