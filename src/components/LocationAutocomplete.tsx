import { useState, useRef, useEffect, useCallback } from "react";
import { useGoogleMaps } from "@/hooks/useGoogleMaps";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Locate, Loader2 } from "lucide-react";

export interface LocationData {
  latitude: number;
  longitude: number;
  suburb: string;
  city: string;
  province: string;
  country: string;
  formatted_address: string;
  place_id: string;
}

interface LocationAutocompleteProps {
  value: LocationData | null;
  onChange: (location: LocationData) => void;
  placeholder?: string;
}

interface SuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const extractComponent = (
  components: any[],
  type: string
): string => {
  return components.find((c: any) => c.types.includes(type))?.longText || "";
};

const LocationAutocomplete = ({ value, onChange, placeholder }: LocationAutocompleteProps) => {
  const mapsReady = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(value?.formatted_address || "");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [servicesReady, setServicesReady] = useState(false);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<any>(null);

  useEffect(() => {
    if (value?.formatted_address) {
      setDisplayValue(value.formatted_address);
    }
  }, [value?.formatted_address]);

  useEffect(() => {
    if (!mapsReady || !(window as any).google) return;
    
    const initPlaces = async () => {
      try {
        const g = (window as any).google;
        const placesLib = await g.maps.importLibrary("places");
        placesLibRef.current = placesLib;
        sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        setServicesReady(true);
        console.log("[LocationAutocomplete] New Places API ready");
      } catch (err) {
        console.error("[LocationAutocomplete] Failed to init Places:", err);
      }
    };
    initPlaces();
  }, [mapsReady]);

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setDisplayValue(val);

      if (!val || val.length < 2 || !placesLibRef.current) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const { AutocompleteSuggestion } = placesLibRef.current;
        const request: any = {
          input: val,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["za"],
          includedPrimaryTypes: ["geocode"],
        };

        const { suggestions: results } = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        
        const mapped: SuggestionItem[] = results
          .filter((s: any) => s.placePrediction)
          .map((s: any) => ({
            placeId: s.placePrediction.placeId,
            mainText: s.placePrediction.mainText?.text || s.placePrediction.text?.text || "",
            secondaryText: s.placePrediction.secondaryText?.text || "",
          }));

        console.log("[LocationAutocomplete] Got", mapped.length, "suggestions");
        setSuggestions(mapped);
        setShowSuggestions(mapped.length > 0);
      } catch (err) {
        console.error("[LocationAutocomplete] Fetch error:", err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    },
    []
  );

  const selectPrediction = useCallback(
    async (suggestion: SuggestionItem) => {
      if (!placesLibRef.current) return;

      try {
        const { Place, AutocompleteSessionToken } = placesLibRef.current;
        const place = new Place({ id: suggestion.placeId });
        
        await place.fetchFields({
          fields: ["location", "addressComponents", "formattedAddress", "id"],
        });

        const components = place.addressComponents || [];
        const locationData: LocationData = {
          latitude: place.location?.lat() || 0,
          longitude: place.location?.lng() || 0,
          suburb:
            extractComponent(components, "sublocality_level_1") ||
            extractComponent(components, "sublocality") ||
            extractComponent(components, "neighborhood") ||
            extractComponent(components, "locality"),
          city: extractComponent(components, "locality") || extractComponent(components, "administrative_area_level_2"),
          province: extractComponent(components, "administrative_area_level_1"),
          country: extractComponent(components, "country"),
          formatted_address: place.formattedAddress || suggestion.mainText,
          place_id: place.id || suggestion.placeId,
        };

        onChange(locationData);
        setDisplayValue(
          locationData.suburb && locationData.city
            ? `${locationData.suburb}, ${locationData.city}`
            : locationData.formatted_address
        );

        // Reset session token
        sessionTokenRef.current = new AutocompleteSessionToken();
      } catch (err) {
        console.error("[LocationAutocomplete] Place details error:", err);
      }

      setSuggestions([]);
      setShowSuggestions(false);
    },
    [onChange]
  );

  const handleDetectLocation = useCallback(async () => {
    if (!navigator.geolocation) return;

    if ("permissions" in navigator) {
      const perm = await navigator.permissions.query({ name: "geolocation" });
      if (perm.state === "prompt") {
        setShowPermissionPrompt(true);
        return;
      }
    }

    doGeolocate();
  }, []);

  const doGeolocate = useCallback(() => {
    setDetectingLocation(true);
    setShowPermissionPrompt(false);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        if (!mapsReady || !(window as any).google) {
          setDetectingLocation(false);
          return;
        }

        const g = (window as any).google;
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results: any[] | null, status: string) => {
            setDetectingLocation(false);
            if (status === "OK" && results && results[0]) {
              const place = results[0];
              const components = place.address_components || [];
              const extractLegacy = (comps: any[], type: string) =>
                comps.find((c: any) => c.types.includes(type))?.long_name || "";
              
              const locationData: LocationData = {
                latitude,
                longitude,
                suburb:
                  extractLegacy(components, "sublocality_level_1") ||
                  extractLegacy(components, "sublocality") ||
                  extractLegacy(components, "neighborhood") ||
                  extractLegacy(components, "locality"),
                city: extractLegacy(components, "locality") || extractLegacy(components, "administrative_area_level_2"),
                province: extractLegacy(components, "administrative_area_level_1"),
                country: extractLegacy(components, "country"),
                formatted_address: place.formatted_address || "",
                place_id: place.place_id || "",
              };
              onChange(locationData);
              setDisplayValue(
                locationData.suburb && locationData.city
                  ? `${locationData.suburb}, ${locationData.city}`
                  : locationData.formatted_address
              );
            }
          }
        );
      },
      () => {
        setDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [mapsReady, onChange]);

  return (
    <div className="relative space-y-2">
      {showPermissionPrompt && (
        <div className="bg-accent/20 border border-accent rounded-xl p-4 space-y-3">
          <p className="text-sm text-foreground font-medium">
            Domestic Hub works best with your location enabled.
          </p>
          <p className="text-xs text-muted-foreground">
            Turn on location to automatically detect your area.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={doGeolocate} className="flex-1">
              Allow
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowPermissionPrompt(false)} className="flex-1">
              Not Now
            </Button>
          </div>
        </div>
      )}

      <div className="relative">
        <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10" />
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={!servicesReady ? "Loading Google Maps..." : (placeholder || "Search your area...")}
          className="rounded-xl h-12 pl-9 pr-12"
          autoComplete="off"
          disabled={!servicesReady}
        />
        <button
          type="button"
          onClick={handleDetectLocation}
          disabled={detectingLocation}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-muted transition-colors text-primary"
          title="Detect my location"
        >
          {detectingLocation ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Locate size={18} />
          )}
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectPrediction(s)}
            >
              <MapPin size={14} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {s.mainText}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.secondaryText}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
