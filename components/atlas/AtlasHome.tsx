"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Edit3,
  Heart,
  Loader2,
  Map,
  MapPin,
  Plus,
  Star,
  Tags,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Place = {
  id: string;
  name: string;
  visited_at: string;
  category: string | null;
  vacation_id: string | null;
  is_favorite: boolean;
};

type Vacation = {
  id: string;
  name: string;
};

export function AtlasHome() {
  const router = useRouter();

  const [places, setPlaces] = useState<Place[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadAtlasData();
  }, []);

  async function loadAtlasData() {
    setIsLoading(true);
    setError("");

    const [placesResult, vacationsResult] = await Promise.all([
      supabase
        .from("places_visited")
        .select(
          "id, name, visited_at, category, vacation_id, is_favorite",
        )
        .order("visited_at", { ascending: false })
        .limit(1000),

      supabase
        .from("vacations")
        .select("id, name")
        .order("name", { ascending: true }),
    ]);

    if (placesResult.error) {
      console.error("Errore caricamento luoghi:", placesResult.error);
      setError(`Errore caricamento luoghi: ${placesResult.error.message}`);
    } else {
      setPlaces((placesResult.data ?? []) as Place[]);
    }

    if (vacationsResult.error) {
      console.error("Errore caricamento vacanze:", vacationsResult.error);

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

  const favoriteCount = useMemo(
    () => places.filter((place) => place.is_favorite).length,
    [places],
  );

  const categoryCount = useMemo(() => {
    const categories = new Set(
      places
        .map((place) => place.category?.trim())
        .filter((category): category is string => Boolean(category)),
    );

    return categories.size;
  }, [places]);

  const recentPlaces = useMemo(() => places.slice(0, 5), [places]);

  function formatDate(value: string) {
    if (!value) return "Data non disponibile";

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  }

  return (
    <div className="space-y-4">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="relative p-5 sm:p-6">
          <div className="absolute right-0 top-0 size-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                GoldWing Rides
              </p>

              <h1 className="mt-1 text-lg font-black tracking-tight sm:text-xl">
                Atlante dei Luoghi
              </h1>

              <p className="mt-1 max-w-xl text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
                Conserva e organizza tutti i luoghi visitati,
                indipendentemente dal mezzo utilizzato.
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="Luoghi"
              value={places.length}
              icon={<MapPin className="size-3.5" />}
              isLoading={isLoading}
            />

            <StatCard
              label="Vacanze"
              value={vacations.length}
              icon={<CalendarDays className="size-3.5" />}
              isLoading={isLoading}
            />

            <StatCard
              label="Preferiti"
              value={favoriteCount}
              icon={<Star className="size-3.5" />}
              isLoading={isLoading}
            />

            <StatCard
              label="Categorie"
              value={categoryCount}
              icon={<Tags className="size-3.5" />}
              isLoading={isLoading}
            />
          </div>
        </div>
      </section>

      {/* Azioni */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionCard
          title="Nuovo luogo"
          description="Registra la posizione attuale"
          icon={<Plus className="size-4" />}
          onClick={() => router.push("/atlas/nuovo")}
          emphasized
        />

        <ActionCard
          title="Gestisci"
          description="Modifica o elimina i punti"
          icon={<Edit3 className="size-4" />}
          onClick={() => router.push("/atlas/gestisci")}
        />

        <ActionCard
          title="Mappa"
          description="Visualizza tutti i luoghi"
          icon={<Map className="size-4" />}
          disabled
        />

        <ActionCard
          title="Preferiti"
          description="Mostra i luoghi preferiti"
          icon={<Heart className="size-4" />}
          disabled
        />
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-[10px] font-medium text-destructive">
          {error}
        </div>
      )}

      {/* Ultimi luoghi */}
      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-primary">
              Attività recente
            </p>

            <h2 className="mt-1 text-sm font-black">
              Ultimi luoghi registrati
            </h2>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/atlas/gestisci")}
            className="h-8 gap-1 px-2 text-[9px] font-bold text-primary"
          >
            Vedi tutti
            <ArrowRight className="size-3" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex min-h-32 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : recentPlaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <MapPin className="mx-auto size-6 text-muted-foreground" />

            <p className="mt-3 text-[11px] font-bold">
              Nessun luogo registrato
            </p>

            <p className="mt-1 text-[9px] text-muted-foreground">
              Registra il primo punto del tuo Atlante.
            </p>

            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/atlas/nuovo")}
              className="mt-4 h-8 gap-1.5 text-[9px]"
            >
              <Plus className="size-3" />
              Registra luogo
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentPlaces.map((place) => {
              const vacationName = place.vacation_id
                ? vacationNames.get(place.vacation_id)
                : null;

              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => router.push("/atlas/gestisci")}
                  className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-secondary/40"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <MapPin className="size-3.5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[11px] font-bold">
                        {place.name}
                      </p>

                      {place.is_favorite && (
                        <Star className="size-3 shrink-0 fill-current text-amber-500" />
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                      {formatDate(place.visited_at)}
                      {vacationName ? ` · ${vacationName}` : ""}
                    </p>
                  </div>

                  <span className="max-w-24 truncate rounded-full bg-secondary px-2 py-1 text-[8px] font-bold text-muted-foreground">
                    {place.category || "Altro"}
                  </span>

                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  isLoading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  isLoading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[8px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-2 text-lg font-black">
        {isLoading ? "—" : value}
      </p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
  emphasized = false,
  disabled = false,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
  emphasized?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "min-h-24 rounded-xl border p-3 text-left shadow-sm transition",
        emphasized
          ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
          : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
        disabled
          ? "cursor-not-allowed opacity-45"
          : "active:scale-[0.98]",
      ].join(" ")}
    >
      <div
        className={[
          "flex size-8 items-center justify-center rounded-lg",
          emphasized
            ? "bg-primary-foreground/15"
            : "bg-primary/10 text-primary",
        ].join(" ")}
      >
        {icon}
      </div>

      <p className="mt-3 text-[11px] font-black">
        {title}
      </p>

      <p
        className={[
          "mt-1 text-[8px] leading-relaxed",
          emphasized
            ? "text-primary-foreground/75"
            : "text-muted-foreground",
        ].join(" ")}
      >
        {disabled ? "Disponibile prossimamente" : description}
      </p>
    </button>
  );
}
