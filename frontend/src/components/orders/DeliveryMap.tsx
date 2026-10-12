import { useEffect, useRef, useState } from "react";
import type { DeliveryLocation } from "@/services/logisticsService";

type MapInstance = {
  panTo: (position: DeliveryLocation) => void;
  addListener: (
    event: string,
    callback: (event: { latLng?: { toJSON: () => DeliveryLocation } }) => void,
  ) => { remove: () => void };
};
type MarkerInstance = {
  position: DeliveryLocation | { toJSON: () => DeliveryLocation };
  map: MapInstance | null;
  addListener: (event: string, callback: () => void) => { remove: () => void };
};
type MapsSdk = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  marker: { AdvancedMarkerElement: new (options: Record<string, unknown>) => MarkerInstance };
  Geocoder: new () => {
    geocode: (input: {
      location: DeliveryLocation;
    }) => Promise<{ results: Array<{ formatted_address: string }> }>;
  };
};
let sdkPromise: Promise<MapsSdk> | undefined;
function loadMaps(key: string) {
  if (!sdkPromise)
    sdkPromise = new Promise<MapsSdk>((resolve, reject) => {
      const existing = (window as unknown as { google?: { maps: MapsSdk } }).google?.maps;
      if (existing?.marker) {
        resolve(existing);
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&v=weekly`;
      script.async = true;
      script.onload = () => {
        const sdk = (window as unknown as { google?: { maps: MapsSdk } }).google?.maps;
        if (sdk) resolve(sdk);
        else reject(new Error("Map could not be loaded."));
      };
      script.onerror = () => {
        sdkPromise = undefined;
        script.remove();
        reject(new Error("Map could not be loaded."));
      };
      document.head.appendChild(script);
    });
  return sdkPromise;
}
export function DeliveryMap({
  position,
  onChange,
  onSuggest,
}: {
  position?: DeliveryLocation | undefined;
  onChange?: ((value: DeliveryLocation) => void) | undefined;
  onSuggest?: ((value: string) => void) | undefined;
}) {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<MapInstance | null>(null);
  const marker = useRef<MarkerInstance | null>(null);
  const callbacks = useRef({ onChange, onSuggest });
  callbacks.current = { onChange, onSuggest };
  const initial = useRef(position);
  initial.current = position;
  const [error, setError] = useState("");
  const key = import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined;
  useEffect(() => {
    if (!key || !element.current) return;
    let active = true;
    const listeners: Array<{ remove: () => void }> = [];
    void loadMaps(key)
      .then((sdk) => {
        if (!active || !element.current) return;
        const center = initial.current ?? { lat: 6.5244, lng: 3.3792 };
        map.current = new sdk.Map(element.current, {
          center,
          zoom: initial.current ? 16 : 9,
          mapId: import.meta.env["VITE_GOOGLE_MAPS_MAP_ID"] ?? "DEMO_MAP_ID",
          streetViewControl: false,
          mapTypeControl: false,
        });
        marker.current = new sdk.marker.AdvancedMarkerElement({
          map: map.current,
          ...(initial.current ? { position: initial.current } : {}),
          gmpDraggable: !!callbacks.current.onChange,
          title: "Delivery destination",
        });
        const select = (value: DeliveryLocation) => {
          if (marker.current) marker.current.position = value;
          callbacks.current.onChange?.(value);
          void new sdk.Geocoder()
            .geocode({ location: value })
            .then(({ results }) => {
              if (active && results[0]) callbacks.current.onSuggest?.(results[0].formatted_address);
            })
            .catch(() => {});
        };
        if (callbacks.current.onChange) {
          listeners.push(
            map.current.addListener("click", (event) => {
              if (event.latLng) select(event.latLng.toJSON());
            }),
          );
          listeners.push(
            marker.current.addListener("dragend", () => {
              const value = marker.current?.position;
              if (value) select("toJSON" in value ? value.toJSON() : value);
            }),
          );
        }
      })
      .catch(() => {
        if (active) setError("The map is unavailable. Enter your address manually.");
      });
    return () => {
      active = false;
      listeners.forEach((listener) => listener.remove());
      if (marker.current) marker.current.map = null;
      map.current = null;
    };
  }, [key]);
  useEffect(() => {
    if (position && marker.current) {
      marker.current.position = position;
      map.current?.panTo(position);
    }
  }, [position]);
  useEffect(() => {
    if (!key || !position || !callbacks.current.onSuggest) return;
    let active = true;
    void loadMaps(key)
      .then((sdk) => new sdk.Geocoder().geocode({ location: position }))
      .then(({ results }) => {
        if (active && results[0]) callbacks.current.onSuggest?.(results[0].formatted_address);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [key, position]);
  if (!key)
    return (
      <p className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
        Interactive map is not connected yet. Enter your confirmed address manually.
      </p>
    );
  return (
    <div className="mt-3">
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div
        ref={element}
        aria-label="Delivery destination map"
        className="h-64 w-full overflow-hidden rounded-lg bg-muted"
      />
    </div>
  );
}
