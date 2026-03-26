import { useCallback, useEffect, useState } from "react";

import {
  getGoogleMapsLoaderState,
  loadGoogleMaps,
  resetGoogleMapsLoader,
  subscribeGoogleMapsLoader,
} from "@/lib/googleMapsLoader";

export const useGoogleMaps = () => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const [state, setState] = useState(() => getGoogleMapsLoaderState());

  useEffect(() => {
    const syncState = () => setState(getGoogleMapsLoaderState());
    const unsubscribe = subscribeGoogleMapsLoader(syncState);

    syncState();
    loadGoogleMaps(apiKey).catch((err) => {
      console.error("[useGoogleMaps] Failed to load Google Maps script:", err);
    });

    return unsubscribe;
  }, [apiKey]);

  const retry = useCallback(() => {
    resetGoogleMapsLoader();
    loadGoogleMaps(apiKey).catch((err) => {
      console.error("[useGoogleMaps] Retry failed:", err);
    });
  }, [apiKey]);

  return {
    ready: state.ready,
    loading: state.loading,
    error: state.error,
    retry,
  };
};
