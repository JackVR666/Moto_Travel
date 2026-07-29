"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCw,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Vacation = {
  id: string;
  name: string;
};

type Place = {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  location_accuracy: number | null;
  visited_at: string;
  transport_type: string | null;
  category: string | null;
  vacation_id: string | null;
  google_photos_url: string | null;
  is_favorite: boolean;
  created_at?: string | null;
};

type EditForm = {
  name: string;
  description: string;
  visitedAt: string;
  transportType: string;
  category: string;
  vacationId: string;
  googlePhotosUrl: string;
  isFavorite: boolean;
};

const EMPTY_FORM: EditForm = {
  name: "",
  description: "",
  visitedAt: "",
  transportType: "",
  category: "",
  vacationId: "",
  googlePhotosUrl: "",
  isFavorite: false,
};

export default function GestisciLuoghiPage() {
  const router = useRouter();

  const [places, setPlaces] = useState<Place[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);

  const [searchText, setSearchText] = useState("");
  const [vacationFilter, setVacationFilter] = useState("");

  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [form, setForm] = useState<EditForm>(EMPTY_FORM);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
          "id, name, description, latitude, longitude, location_accuracy, visited_at, transport_type, category, vacation_id, google_photos_url, is_favorite, created_at",
        )
        .order("visited_at", { ascending: false })
        .order("created_at", { ascending: false }),
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

  const filteredPlaces = useMemo(() => {
    const normalizedSearch = searchText.trim().toLocaleLowerCase("it");

    return places.filter((place) => {
      const matchesVacation =
        !vacationFilter || place.vacation_id === vacationFilter;

      const searchableText = [
        place.name,
        place.description ?? "",
        place.category ?? "",
        place.transport_type ?? "",
        place.vacation_id
          ? vacationNames.get(place.vacation_id) ?? ""
          : "",
      ]
        .join(" ")
        .toLocaleLowerCase("it");

      const matchesSearch =
        !normalizedSearch || searchableText.includes(normalizedSearch);

      return matchesVacation && matchesSearch;
    });
  }, [places, searchText, vacationFilter, vacationNames]);

  function startEditing(place: Place) {
    setError("");
    setSuccess("");
    setEditingPlace(place);

    setForm({
      name: place.name,
      description: place.description ?? "",
      visitedAt: place.visited_at,
      transportType: place.transport_type ?? "",
      category: place.category ?? "",
      vacationId: place.vacation_id ?? "",
      googlePhotosUrl: place.google_photos_url ?? "",
      isFavorite: place.is_favorite,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditing() {
    setEditingPlace(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function saveChanges() {
    if (!editingPlace) return;

    const normalizedName = form.name.trim();

    if (!normalizedName) {
      setError("Inserisci il nome del luogo.");
      return;
    }

    if (!form.visitedAt) {
      setError("Inserisci la data della visita.");
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    const { data, error: updateError } = await supabase
      .from("places_visited")
      .update({
        name: normalizedName,
        description: form.description.trim() || null,
        visited_at: form.visitedAt,
        transport_type: form.transportType || null,
        category: form.category || null,
        vacation_id: form.vacationId || null,
        google_photos_url: form.googlePhotosUrl.trim() || null,
        is_favorite: form.isFavorite,
      })
      .eq("id", editingPlace.id)
      .select(
        "id, name, description, latitude, longitude, location_accuracy, visited_at, transport_type, category, vacation_id, google_photos_url, is_favorite, created_at",
      )
      .single();

    setIsSaving(false);

    if (updateError) {
      console.error("Errore aggiornamento luogo:", updateError);
      setError(`Errore durante l'aggiornamento: ${updateError.message}`);
      return;
    }

    const updatedPlace = data as Place;

    setPlaces((current) =>
      current.map((place) =>
        place.id === updatedPlace.id ? updatedPlace : place,
      ),
    );

    setEditingPlace(null);
    setForm(EMPTY_FORM);
    setSuccess("Luogo aggiornato correttamente.");
  }

  async function deletePlace(place: Place) {
    const confirmed = window.confirm(
      `Vuoi eliminare definitivamente "${place.name}"?`,
    );

    if (!confirmed) return;

    setDeletingId(place.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("places_visited")
      .delete()
      .eq("id", place.id);

    setDeletingId(null);

    if (deleteError) {
      console.error("Errore eliminazione luogo:", deleteError);
      setError(`Errore durante l'eliminazione: ${deleteError.message}`);
      return;
    }

    setPlaces((current) =>
      current.filter((currentPlace) => currentPlace.id !== place.id),
    );

    if (editingPlace?.id === place.id) {
      cancelEditing();
    }

    setSuccess("Luogo eliminato.");
  }

  function formatDate(value: string) {
    if (!value) return "Data non disponibile";

    return new Intl.DateTimeFormat("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  }

  function openMap(place: Place) {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-5 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/")}
            className="h-8 gap-2 px-2 text-[11px] text-muted-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Torna all&apos;app
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={isLoading}
            className="h-8 gap-2 text-[10px]"
          >
            <RefreshCw
              className={`size-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Aggiorna
          </Button>
        </div>

        <section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="size-4" />
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-primary">
                Atlante dei luoghi
              </p>
              <h1 className="mt-1 text-base font-black sm:text-lg">
                Gestisci luoghi registrati
              </h1>
              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
                Modifica, filtra oppure elimina i punti già salvati.
              </p>
            </div>
          </div>
        </section>

        {editingPlace && (
          <section className="mb-4 rounded-xl border border-primary/30 bg-card p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-primary">
                  Modifica punto
                </p>
                <h2 className="mt-1 text-sm font-black">
                  {editingPlace.name}
                </h2>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={cancelEditing}
                className="size-8"
                aria-label="Chiudi modifica"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <FieldLabel htmlFor="edit-name">Nome del luogo *</FieldLabel>
              <input
                id="edit-name"
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClassName}
              />

              <div>
                <FieldLabel htmlFor="edit-description">
                  Descrizione
                </FieldLabel>
                <textarea
                  id="edit-description"
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className={`${inputClassName} h-auto resize-none py-2`}
                />
              </div>

              <div className="min-w-0 overflow-hidden">
                <FieldLabel htmlFor="edit-date">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" />
                    Data della visita *
                  </span>
                </FieldLabel>
                <input
                  id="edit-date"
                  type="date"
                  value={form.visitedAt}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      visitedAt: event.target.value,
                    }))
                  }
                  className={`${inputClassName} appearance-none [inline-size:100%] [max-inline-size:100%] [min-inline-size:0]`}
                  style={{
                    boxSizing: "border-box",
                    width: "100%",
                    minWidth: 0,
                    maxWidth: "100%",
                    WebkitAppearance: "none",
                  }}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor="edit-transport">
                    Mezzo di trasporto
                  </FieldLabel>
                  <select
                    id="edit-transport"
                    value={form.transportType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        transportType: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="">Non specificato</option>
                    <option value="moto">Moto</option>
                    <option value="auto">Auto</option>
                    <option value="aereo">Aereo</option>
                    <option value="treno">Treno</option>
                    <option value="nave">Nave</option>
                    <option value="a piedi">A piedi</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>

                <div>
                  <FieldLabel htmlFor="edit-category">
                    Categoria
                  </FieldLabel>
                  <select
                    id="edit-category"
                    value={form.category}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className={inputClassName}
                  >
                    <option value="">Non specificata</option>
                    <option value="città">Città</option>
                    <option value="borgo">Borgo</option>
                    <option value="monumento">Monumento</option>
                    <option value="museo">Museo</option>
                    <option value="castello">Castello</option>
                    <option value="passo">Passo</option>
                    <option value="panorama">Panorama</option>
                    <option value="spiaggia">Spiaggia</option>
                    <option value="ristorante">Ristorante</option>
                    <option value="hotel">Hotel</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="edit-vacation">Vacanza</FieldLabel>
                <select
                  id="edit-vacation"
                  value={form.vacationId}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vacationId: event.target.value,
                    }))
                  }
                  className={inputClassName}
                >
                  <option value="">Nessuna vacanza</option>
                  {vacations.map((vacation) => (
                    <option key={vacation.id} value={vacation.id}>
                      {vacation.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="edit-photos">
                  Link album Google Foto
                </FieldLabel>
                <input
                  id="edit-photos"
                  type="url"
                  value={form.googlePhotosUrl}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      googlePhotosUrl: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={form.isFavorite}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      isFavorite: event.target.checked,
                    }))
                  }
                  className="size-4 accent-primary"
                />
                <Star className="size-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold">
                  Luogo preferito
                </span>
              </label>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelEditing}
                  className="h-9 flex-1 text-[10px]"
                >
                  Annulla
                </Button>

                <Button
                  type="button"
                  onClick={() => void saveChanges()}
                  disabled={isSaving}
                  className="h-9 flex-1 gap-2 text-[10px] font-bold"
                >
                  {isSaving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Salva modifiche
                </Button>
              </div>
            </div>
          </section>
        )}

        <section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Cerca un luogo..."
                className={`${inputClassName} pl-9`}
              />
            </div>

            <select
              value={vacationFilter}
              onChange={(event) => setVacationFilter(event.target.value)}
              className={inputClassName}
            >
              <option value="">Tutte le vacanze</option>
              {vacations.map((vacation) => (
                <option key={vacation.id} value={vacation.id}>
                  {vacation.name}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-3 text-[9px] text-muted-foreground">
            {filteredPlaces.length}{" "}
            {filteredPlaces.length === 1 ? "luogo trovato" : "luoghi trovati"}
          </p>
        </section>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[10px] font-medium text-destructive">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            {success}
          </div>
        )}

        {isLoading ? (
          <div className="flex min-h-48 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : filteredPlaces.length === 0 ? (
          <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <MapPin className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-xs font-bold">Nessun luogo trovato</p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Modifica i filtri oppure registra un nuovo punto.
            </p>
          </section>
        ) : (
          <div className="space-y-3">
            {filteredPlaces.map((place) => {
              const vacationName = place.vacation_id
                ? vacationNames.get(place.vacation_id)
                : null;

              return (
                <article
                  key={place.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-xs font-black">
                          {place.name}
                        </h2>
                        {place.is_favorite && (
                          <Star className="size-3.5 shrink-0 fill-current text-amber-500" />
                        )}
                      </div>

                      <p className="mt-1 text-[9px] text-muted-foreground">
                        {formatDate(place.visited_at)}
                        {vacationName ? ` · ${vacationName}` : ""}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[8px] font-bold text-muted-foreground">
                      {place.category || "Senza categoria"}
                    </span>
                  </div>

                  {place.description && (
                    <p className="mt-3 line-clamp-3 text-[10px] leading-relaxed text-muted-foreground">
                      {place.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-muted-foreground">
                    <span>
                      Mezzo: {place.transport_type || "non specificato"}
                    </span>
                    <span>
                      {place.latitude.toFixed(5)},{" "}
                      {place.longitude.toFixed(5)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => openMap(place)}
                      className="h-8 gap-1.5 px-2 text-[9px]"
                    >
                      <ExternalLink className="size-3" />
                      Mappa
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => startEditing(place)}
                      className="h-8 gap-1.5 px-2 text-[9px]"
                    >
                      <Edit3 className="size-3" />
                      Modifica
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void deletePlace(place)}
                      disabled={deletingId === place.id}
                      className="h-8 gap-1.5 px-2 text-[9px] text-destructive hover:text-destructive"
                    >
                      {deletingId === place.id ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      Elimina
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[10px] font-bold text-foreground"
    >
      {children}
    </label>
  );
}

const inputClassName =
  "block h-9 min-w-0 max-w-full w-full rounded-lg border border-input bg-background px-3 text-[11px] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary";
