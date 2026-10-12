import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Truck } from "lucide-react";
import {
  getLogisticsProviders,
  requestDeliveryQuotes,
  type LogisticsAddress,
  type QuoteShipment,
  type DeliveryQuote,
  type DeliveryLocation,
} from "@/services/logisticsService";
import { getErrorMessage } from "@/services/api";
import { formatNaira } from "@/utils/format";
import { DeliveryMap } from "./DeliveryMap";

export interface DeliverySelection {
  fingerprint: string;
  quotes: Record<string, DeliveryQuote>;
}
export function DeliveryOptions({
  address,
  items,
  selection,
  onSelect,
  onLocation,
}: {
  address: LogisticsAddress;
  items: Array<{ productId: string; quantity: number }>;
  selection: DeliverySelection | null;
  onSelect: (value: DeliverySelection) => void;
  onLocation: (value: DeliveryLocation) => void;
}) {
  const { data: configuration } = useQuery({
    queryKey: ["logistics-providers"],
    queryFn: getLogisticsProviders,
  });
  const [result, setResult] = useState<{ fingerprint: string; shipments: QuoteShipment[] } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const fingerprint = JSON.stringify({ address, items });
  async function locate() {
    if (!navigator.geolocation) {
      setError("Location access is not supported by this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onLocation({ lat: coords.latitude, lng: coords.longitude });
        setLocating(false);
      },
      () => {
        setError(
          "Location could not be accessed. Enter your address manually or allow location permission.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await requestDeliveryQuotes(address, items);
      setResult({ fingerprint, shipments: response.shipments });
    } catch (err) {
      setError(getErrorMessage(err, "Unable to retrieve delivery options."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Truck className="h-4 w-4 text-primary" /> Courier delivery
      </h2>
      {configuration?.mode === "sandbox" ? (
        <p className="mt-2 rounded-md bg-warning/15 p-3 text-sm text-foreground">
          Sandbox testing only. Prices and bookings are test data. No real courier is requested.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          Courier integrations are not connected yet. You can use the existing delivery options
          below.
        </p>
      )}
      <button
        type="button"
        disabled={locating}
        onClick={() => void locate()}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium disabled:opacity-50"
      >
        <MapPin className="h-4 w-4" />
        {locating ? "Finding location..." : "Use my current location"}
      </button>
      <p className="mt-2 text-xs text-muted-foreground">
        Confirm your street, building and entrance. GPS alone may not identify the right address.
      </p>
      <DeliveryMap position={address.coordinates} onChange={onLocation} onSuggest={setSuggestion} />
      {suggestion && (
        <p className="mt-2 text-sm text-muted-foreground">
          Suggested address: {suggestion}. Confirm the matching street and building above.
        </p>
      )}
      {address.coordinates && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs">
            Latitude
            <input
              type="number"
              step="any"
              min={-90}
              max={90}
              value={address.coordinates.lat}
              onChange={(e) => {
                const lat = Number(e.target.value);
                if (Number.isFinite(lat) && Math.abs(lat) <= 90)
                  onLocation({ lat, lng: address.coordinates!.lng });
              }}
              className="mt-1 w-full rounded-md border border-input bg-background p-2"
            />
          </label>
          <label className="text-xs">
            Longitude
            <input
              type="number"
              step="any"
              min={-180}
              max={180}
              value={address.coordinates.lng}
              onChange={(e) => {
                const lng = Number(e.target.value);
                if (Number.isFinite(lng) && Math.abs(lng) <= 180)
                  onLocation({ lat: address.coordinates!.lat, lng });
              }}
              className="mt-1 w-full rounded-md border border-input bg-background p-2"
            />
          </label>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${address.coordinates.lat},${address.coordinates.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 text-sm font-semibold text-primary underline"
          >
            Check location on Google Maps
          </a>
        </div>
      )}
      {configuration?.mode === "sandbox" && (
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="mt-4 block min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? "Finding delivery options..." : "Compare sandbox couriers"}
        </button>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {result && result.fingerprint !== fingerprint && (
        <p className="mt-3 text-sm text-muted-foreground">
          Your address or cart changed. Compare delivery options again.
        </p>
      )}
      {result?.fingerprint === fingerprint &&
        result.shipments.map((shipment) => (
          <fieldset key={shipment.storeId} className="mt-4 space-y-2">
            <legend className="mb-2 text-sm font-semibold">{shipment.storeName} shipment</legend>
            {shipment.quotes.map((quote) => (
              <label
                key={quote.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input
                  type="radio"
                  name={`courier-${shipment.storeId}`}
                  checked={
                    selection?.fingerprint === fingerprint &&
                    selection.quotes[shipment.storeId]?.id === quote.id
                  }
                  onChange={() =>
                    onSelect({
                      fingerprint,
                      quotes: {
                        ...(selection?.fingerprint === fingerprint ? selection.quotes : {}),
                        [shipment.storeId]: quote,
                      },
                    })
                  }
                  className="accent-primary"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{quote.service}</span>
                  <span className="block text-xs text-muted-foreground">{quote.estimate}</span>
                  {quote.parcelSource === "sandbox_fixture" && (
                    <span className="block text-xs text-muted-foreground">
                      Test parcel measurements
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm font-semibold">{formatNaira(quote.fee)}</span>
              </label>
            ))}
          </fieldset>
        ))}
    </section>
  );
}
