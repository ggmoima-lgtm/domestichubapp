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

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const extractComponent = (
  components: any[],
  type: string
): string => {
  return components.find((c: any) => c.types.includes(type))?.long_name || "";
};

const LocationAutocomplete = ({ value, onChange, placeholder }: LocationAutocompleteProps) => {
  const mapsReady = useGoogleMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(value?.formatted_address || "");
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);
  const sessionTokenRef = useRef<any>(null);

  useEffect(() => {
    if (value?.formatted_address) {
      setDisplayValue(value.formatted_address);
    }
  }, [value?.formatted_address]);

  useEffect(() => {
    if (!mapsReady || !(window as any).google) return;
    const g = (window as any).google;
    autocompleteServiceRef.current = new g.maps.places.AutocompleteService();
    const div = document.createElement("div");
    placesServiceRef.current = new g.maps.places.PlacesService(div);
    sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
  }, [mapsReady]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setDisplayValue(val);

      if (!val || val.length < 2 || !autocompleteServiceRef.current) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: val,
          componentRestrictions: { country: "za" },
          types: ["geocode"],
          sessionToken: sessionTokenRef.current,
        },
        (predictions: any[] | null, status: string) => {
          if (status === "OK" && predictions) {
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    },
    []
  );

  const selectPrediction = useCallback(
    (prediction: Prediction) => {
      if (!placesServiceRef.current) return;
      const g = (window as any).google;

      placesServiceRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ["geometry", "address_components", "formatted_address", "place_id"],
          sessionToken: sessionTokenRef.current,
        },
        (place: any, status: string) => {
          if (status === "OK" && place) {
            const components = place.address_components || [];
            const locationData: LocationData = {
              latitude: place.geometry?.location?.lat() || 0,
              longitude: place.geometry?.location?.lng() || 0,
              suburb:
                extractComponent(components, "sublocality_level_1") ||
                extractComponent(components, "sublocality") ||
                extractComponent(components, "neighborhood") ||
                extractComponent(components, "locality"),
              city: extractComponent(components, "locality") || extractComponent(components, "administrative_area_level_2"),
              province: extractComponent(components, "administrative_area_level_1"),
              country: extractComponent(components, "country"),
              formatted_address: place.formatted_address || prediction.description,
              place_id: place.place_id || prediction.place_id,
            };
            onChange(locationData);
            setDisplayValue(
              locationData.suburb && locationData.city
                ? `${locationData.suburb}, ${locationData.city}`
                : locationData.formatted_address
            );
            sessionTokenRef.current = new g.maps.places.AutocompleteSessionToken();
          }
          setSuggestions([]);
          setShowSuggestions(false);
        }
      );
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
      (pos) => {
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
              const locationData: LocationData = {
                latitude,
                longitude,
                suburb:
                  extractComponent(components, "sublocality_level_1") ||
                  extractComponent(components, "sublocality") ||
                  extractComponent(components, "neighborhood") ||
                  extractComponent(components, "locality"),
                city: extractComponent(components, "locality") || extractComponent(components, "administrative_area_level_2"),
                province: extractComponent(components, "administrative_area_level_1"),
                country: extractComponent(components, "country"),
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
          placeholder={placeholder || "Search your area..."}
          className="rounded-xl h-12 pl-9 pr-12"
          autoComplete="off"
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
              key={s.place_id}
              type="button"
              className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectPrediction(s)}
            >
              <MapPin size={14} className="mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {s.structured_formatting.main_text}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.structured_formatting.secondary_text}
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
