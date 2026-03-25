import { useState, useEffect } from "react";

let isLoading = false;
let isLoaded = false;
const callbacks: (() => void)[] = [];

export const useGoogleMaps = () => {
  const [ready, setReady] = useState(isLoaded);

  useEffect(() => {
    if (isLoaded) {
      setReady(true);
      return;
    }

    callbacks.push(() => setReady(true));

    if (isLoading) return;
    isLoading = true;

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      isLoaded = true;
      callbacks.forEach((cb) => cb());
      callbacks.length = 0;
    };
    document.head.appendChild(script);
  }, []);

  return ready;
};
