"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Crosshair,
  ExternalLink,
  Heart,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import L, { type LatLngExpression, type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Place = {
  id: string;
  name: string;
  visited_at: string | null;
  category: string | null;
  vacation_id: string | null;
  is_favorite: boolean | null;
  latitude: number | null;
  longitude: number | null;
  google_photos_url: string | null;
};

type Vacation = {
  id: string;
  name: string;
};

type UserPosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

const ITALY_CENTER: LatLngExpression = [42.8, 12.8];

const defaultMarkerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const favoriteMarkerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      background: #f59e0b;
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,.35);
      color: white;
      font-size: 17px;
    ">★</div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -18],
});

const userMarkerIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width: 22px;
      height: 22px;
      border-radius: 9999px;
      background: #2563eb;
      border: 4px solid white;
      box-shadow: 0 0 0 5px rgba(37,99,235,.22), 0 3px 10px rgba(0,0,0,.3);
    "></div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

export function AtlasMapView() {
  const router = useRouter();
  const mapRef = useRef<LeafletMap | null>(null);

  const [places, setPlaces] = useState<Place[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [searchText, setSearchText] = useState("");
  const [selectedVacationId, setSelectedVacationId] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [nearbyRadius, setNearbyRadius] = useState(25);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    setError("");

    const [placesResult, vacationsResult] = await Promise.all([
      supabase
        .from("places_visited")
        .select(
          "id, name, visited_at, category, vacation_id, is_favorite, latitude, longitude, google_photos_url",
        )
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("visited_at", { ascending: false }),

      supabase
        .from("vacations")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    if (placesResult.error) {
      console.error(placesResult.error);
      setError(`Errore caricamento luoghi: ${placesResult.error.message}`);
    } else {
      setPlaces((placesResult.data ?? []) as Place[]);
    }

    if (vacationsResult.error) {
      console.error(vacationsResult.error);
      setError((current) =>
        current
          ? `${current} — Vacanze: ${vacationsResult.error.message}`
          : `Errore caricamento vacanze: ${vacationsResult.error.message}`,
      );
    } else {
      setVacations((vacationsResult.data ?? []) as Vacation[]);
    }

    setIsLoading(false);
  }

  const vacationNames = useMemo(
    () => new Map(vacations.map((vacation) => [vacation.id, vacation.name])),
    [vacations],
  );

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    return places.filter((place) => {
      if (
        normalizedSearch &&
        !place.name.toLowerCase().includes(normalizedSearch) &&
        !(place.category ?? "").toLowerCase().includes(normalizedSearch)
      ) {
        return false;
      }

      if (
        selectedVacationId !== "all" &&
        place.vacation_id !== selectedVacationId
      ) {
        return false;
      }

      if (favoritesOnly && !place.is_favorite) {
        return false;
      }

      if (nearbyOnly) {
        if (!userPosition || place.latitude == null || place.longitude == null) {
          return false;
        }

        const distance = calculateDistanceKm(
          userPosition.latitude,
          userPosition.longitude,
          place.latitude,
          place.longitude,
        );

        if (distance > nearbyRadius) {
          return false;
        }
      }

      return true;
    });
  }, [
    places,
    searchText,
    selectedVacationId,
    favoritesOnly,
    nearbyOnly,
    nearbyRadius,
    userPosition,
  ]);

  useEffect(() => {
    if (!mapRef.current || filteredPlaces.length === 0) return;

    const bounds = L.latLngBounds(
      filteredPlaces.map((place) => [
        Number(place.latitude),
        Number(place.longitude),
      ]),
    );

    mapRef.current.fitBounds(bounds, {
      padding: [35, 35],
      maxZoom: 14,
    });
  }, [filteredPlaces]);

  function locateUser(activateNearby = false) {
    if (!navigator.geolocation) {
      setError("La geolocalizzazione non è supportata da questo dispositivo.");
      return;
    }

    setIsLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setUserPosition(currentPosition);
        setIsLocating(false);

        if (activateNearby) {
          setNearbyOnly(true);
        }

        mapRef.current?.flyTo(
          [currentPosition.latitude, currentPosition.longitude],
          13,
          { duration: 1.2 },
        );
      },
      (geoError) => {
        console.error(geoError);
        setIsLocating(false);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            "Permesso posizione negato. Abilita la localizzazione per il sito nelle impostazioni di Safari.",
          );
        } else {
          setError("Non è stato possibile rilevare la posizione.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      },
    );
  }

  function toggleNearby() {
    if (nearbyOnly) {
      setNearbyOnly(false);
      return;
    }

    if (userPosition) {
      setNearbyOnly(true);
    } else {
      locateUser(true);
    }
  }

  function resetFilters() {
    setSearchText("");
    setSelectedVacationId("all");
    setFavoritesOnly(false);
    setNearbyOnly(false);
  }

  const hasFilters =
    searchText.trim() !== "" ||
    selectedVacationId !== "all" ||
    favoritesOnly ||
    nearbyOnly;

  return (
    <div className="space-y-3">
      <header className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => router.push("/?view=atlas")}
              aria-label="Torna all'Atlante"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                Atlante dei Luoghi
              </p>
              <h1 className="truncate text-lg font-black">Mappa dei luoghi</h1>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {filteredPlaces.length} luoghi visualizzati
              </p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 gap-1.5 px-3 text-[10px]"
            onClick={() => locateUser(false)}
            disabled={isLocating}
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Crosshair className="h-3.5 w-3.5" />
            )}
            GPS
          </Button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Cerca luogo o categoria..."
              className="h-10 w-full rounded-xl border bg-background pl-9 pr-9 text-[11px] outline-none transition focus:border-primary"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Cancella ricerca"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedVacationId}
            onChange={(event) => setSelectedVacationId(event.target.value)}
            className="h-10 min-w-0 rounded-xl border bg-background px-3 text-[11px] outline-none focus:border-primary"
          >
            <option value="all">Tutte le vacanze</option>
            {vacations.map((vacation) => (
              <option key={vacation.id} value={vacation.id}>
                {vacation.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <FilterButton
            active={favoritesOnly}
            onClick={() => setFavoritesOnly((current) => !current)}
            icon={<Heart className="h-3.5 w-3.5" />}
            label="Preferiti"
          />

          <FilterButton
            active={nearbyOnly}
            onClick={toggleNearby}
            icon={<LocateFixed className="h-3.5 w-3.5" />}
            label="Vicino a me"
          />

          {nearbyOnly && (
            <select
              value={nearbyRadius}
              onChange={(event) => setNearbyRadius(Number(event.target.value))}
              className="h-8 rounded-lg border bg-background px-2 text-[9px] font-bold"
            >
              <option value={5}>entro 5 km</option>
              <option value={10}>entro 10 km</option>
              <option value={25}>entro 25 km</option>
              <option value={50}>entro 50 km</option>
              <option value={100}>entro 100 km</option>
            </select>
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 rounded-lg px-2 text-[9px] font-bold text-muted-foreground hover:bg-secondary"
            >
              Azzera filtri
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-[10px] font-medium text-destructive">
            {error}
          </div>
        )}
      </header>

      <section className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
        {isLoading && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Caricamento luoghi...
            </div>
          </div>
        )}

        <MapContainer
          center={ITALY_CENTER}
          zoom={5}
          scrollWheelZoom
          className="h-[68vh] min-h-[520px] w-full"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapResizeFix />

          {userPosition && (
            <>
              <Marker
                position={[userPosition.latitude, userPosition.longitude]}
                icon={userMarkerIcon}
              >
                <Popup>
                  <div className="min-w-40">
                    <strong>La tua posizione</strong>
                    <div style={{ marginTop: 4, fontSize: 11 }}>
                      Precisione: circa {Math.round(userPosition.accuracy)} m
                    </div>
                  </div>
                </Popup>
              </Marker>

              <Circle
                center={[userPosition.latitude, userPosition.longitude]}
                radius={userPosition.accuracy}
                pathOptions={{
                  color: "#2563eb",
                  fillColor: "#2563eb",
                  fillOpacity: 0.08,
                  weight: 1,
                }}
              />
            </>
          )}

          {filteredPlaces.map((place) => {
            if (place.latitude == null || place.longitude == null) return null;

            const vacationName = place.vacation_id
              ? vacationNames.get(place.vacation_id)
              : null;

            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;

            return (
              <Marker
                key={place.id}
                position={[Number(place.latitude), Number(place.longitude)]}
                icon={place.is_favorite ? favoriteMarkerIcon : defaultMarkerIcon}
              >
                <Popup minWidth={240} maxWidth={290}>
                  <div style={{ minWidth: 220 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 8,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            lineHeight: 1.2,
                          }}
                        >
                          {place.name}
                        </div>

                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 10,
                            color: "#6b7280",
                          }}
                        >
                          {formatDate(place.visited_at)}
                          {vacationName ? ` · ${vacationName}` : ""}
                        </div>
                      </div>

                      {place.is_favorite && (
                        <Star
                          size={15}
                          fill="currentColor"
                          style={{ color: "#f59e0b", flexShrink: 0 }}
                        />
                      )}
                    </div>

                    <div
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        padding: "4px 8px",
                        borderRadius: 9999,
                        background: "#f3f4f6",
                        fontSize: 9,
                        fontWeight: 700,
                      }}
                    >
                      {place.category || "Altro"}
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gap: 6,
                        marginTop: 12,
                      }}
                    >
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={popupButtonStyle}
                      >
                        <Navigation size={13} />
                        Apri in Google Maps
                        <ExternalLink size={11} style={{ marginLeft: "auto" }} />
                      </a>

                      {place.google_photos_url && (
                        <a
                          href={place.google_photos_url}
                          target="_blank"
                          rel="noreferrer"
                          style={popupButtonStyle}
                        >
                          <Camera size={13} />
                          Apri Google Photos
                          <ExternalLink
                            size={11}
                            style={{ marginLeft: "auto" }}
                          />
                        </a>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {!isLoading && filteredPlaces.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 top-4 z-[900] rounded-xl border bg-background/95 p-4 text-center shadow-lg backdrop-blur">
            <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-[11px] font-bold">
              Nessun luogo corrisponde ai filtri
            </p>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Prova a modificare la ricerca o ad azzerare i filtri.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function MapResizeFix() {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map]);

  return null;
}

function FilterButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-bold transition",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-primary/40",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Data non disponibile";

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function calculateDistanceKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) {
  const earthRadiusKm = 6371;
  const latitudeDelta = degreesToRadians(latitude2 - latitude1);
  const longitudeDelta = degreesToRadians(longitude2 - longitude1);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(degreesToRadians(latitude1)) *
      Math.cos(degreesToRadians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

const popupButtonStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 10px",
  borderRadius: 9,
  background: "#111827",
  color: "white",
  textDecoration: "none",
  fontSize: 10,
  fontWeight: 700,
};
