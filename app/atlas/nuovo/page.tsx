"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Save,
  Star,
  Plus,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};


type Vacation = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};


export default function NuovoLuogoPage() {
  const router = useRouter();

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [visitedAt, setVisitedAt] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [transportType, setTransportType] = useState("");
  const [category, setCategory] = useState("");

  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [selectedVacationId, setSelectedVacationId] = useState("");
  const [newVacationName, setNewVacationName] = useState("");
  const [showNewVacation, setShowNewVacation] = useState(false);
  const [isCreatingVacation, setIsCreatingVacation] = useState(false);

  const [googlePhotosUrl, setGooglePhotosUrl] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    void fetchVacations();
  }, []);

  async function fetchVacations() {
    const { data, error } = await supabase
      .from("vacations")
      .select("id, name, start_date, end_date")
      .order("start_date", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true });

    if (error) {
      console.error("Errore caricamento vacanze:", error);
      setError(`Errore caricamento vacanze: ${error.message}`);
      return;
    }

    setVacations((data ?? []) as Vacation[]);
  }

  async function createVacation() {
    const normalizedName = newVacationName.trim();

    if (!normalizedName) {
      setError("Inserisci il nome della nuova vacanza.");
      return;
    }

    setError("");
    setIsCreatingVacation(true);

    const { data, error } = await supabase
      .from("vacations")
      .insert({
        name: normalizedName,
      })
      .select("id, name, start_date, end_date")
      .single();

    setIsCreatingVacation(false);

    if (error) {
      if (error.code === "23505") {
        setError("Esiste già una vacanza con questo nome.");
      } else {
        setError(`Errore creazione vacanza: ${error.message}`);
      }

      return;
    }

    const createdVacation = data as Vacation;

    setVacations((current) =>
      [...current, createdVacation].sort((a, b) =>
        a.name.localeCompare(b.name, "it"),
      ),
    );

    setSelectedVacationId(createdVacation.id);
    setNewVacationName("");
    setShowNewVacation(false);
  }

  function detectPosition() {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError("Questo dispositivo non supporta la geolocalizzazione.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });

        setIsLocating(false);
      },

      (geolocationError) => {
        console.error(
          "Errore durante la geolocalizzazione:",
          geolocationError,
        );

        let message = "Non è stato possibile rilevare la posizione.";

        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          message =
            "Permesso posizione negato. Abilita la localizzazione nelle impostazioni del browser.";
        }

        if (geolocationError.code === geolocationError.POSITION_UNAVAILABLE) {
          message = "La posizione non è momentaneamente disponibile.";
        }

        if (geolocationError.code === geolocationError.TIMEOUT) {
          message =
            "Il rilevamento della posizione ha impiegato troppo tempo. Riprova.";
        }

        setError(message);
        setIsLocating(false);
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  }

  async function savePlace() {
    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Inserisci il nome del luogo.");
      return;
    }

    if (!coordinates) {
      setError("Prima devi rilevare la posizione.");
      return;
    }

    if (!visitedAt) {
      setError("Inserisci la data della visita.");
      return;
    }

    setIsSaving(true);

    const { error: insertError } = await supabase
      .from("places_visited")
      .insert({
        name: name.trim(),
        description: description.trim() || null,

        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        location_accuracy: coordinates.accuracy,

        visited_at: visitedAt,

        transport_type: transportType || null,
        category: category || null,

        vacation_id: selectedVacationId || null,

        google_photos_url: googlePhotosUrl.trim() || null,
        is_favorite: isFavorite,
      });

    setIsSaving(false);

    if (insertError) {
      console.error("Errore salvataggio luogo:", insertError);

      setError(`Errore durante il salvataggio: ${insertError.message}`);
      return;
    }

    setSuccess("Luogo registrato correttamente.");

    setTimeout(() => {
      router.push("/");
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5 sm:py-6">
        {/* Pulsante indietro */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className="mb-4 h-8 gap-2 px-2 text-[11px] text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Torna all&apos;app
        </Button>

        {/* Intestazione */}
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
                Registra un luogo visitato
              </h1>

              <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
                Rileva la posizione e aggiungi le informazioni del luogo.
              </p>
            </div>
          </div>
        </section>

        {/* Posizione GPS */}
        <section className="mb-4 rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black">Posizione GPS</p>

              {!coordinates ? (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Coordinate non ancora rilevate.
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-[10px]">
                  <p className="text-muted-foreground">
                    Latitudine:
                    <span className="ml-1 font-bold text-foreground">
                      {coordinates.latitude.toFixed(6)}
                    </span>
                  </p>

                  <p className="text-muted-foreground">
                    Longitudine:
                    <span className="ml-1 font-bold text-foreground">
                      {coordinates.longitude.toFixed(6)}
                    </span>
                  </p>

                  {coordinates.accuracy !== null && (
                    <p className="text-muted-foreground">
                      Precisione:
                      <span className="ml-1 font-bold text-foreground">
                        circa {Math.round(coordinates.accuracy)} metri
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button
              type="button"
              size="sm"
              onClick={detectPosition}
              disabled={isLocating}
              className="h-9 shrink-0 gap-2 rounded-lg px-3 text-[11px] font-bold"
            >
              {isLocating ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Rilevamento...
                </>
              ) : coordinates ? (
                <>
                  <LocateFixed className="size-3.5" />
                  Rileva di nuovo
                </>
              ) : (
                <>
                  <LocateFixed className="size-3.5" />
                  Usa posizione
                </>
              )}
            </Button>
          </div>

          {coordinates && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-3.5 shrink-0" />
              Posizione rilevata correttamente
            </div>
          )}
        </section>

        {/* Form */}
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-[10px] font-bold text-foreground"
              >
                Nome del luogo *
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Esempio: Grand-Place di Bruxelles"
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-input
                  bg-background
                  px-3
                  text-[11px]
                  text-foreground
                  outline-none
                  transition
                  placeholder:text-muted-foreground
                  focus:border-primary
                  focus:ring-1
                  focus:ring-primary
                "
              />
            </div>

            {/* Descrizione */}
            <div>
              <label
                htmlFor="description"
                className="mb-1.5 block text-[10px] font-bold text-foreground"
              >
                Descrizione
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Scrivi un ricordo o una nota..."
                rows={3}
                className="
                  w-full
                  resize-none
                  rounded-lg
                  border
                  border-input
                  bg-background
                  px-3
                  py-2
                  text-[11px]
                  text-foreground
                  outline-none
                  transition
                  placeholder:text-muted-foreground
                  focus:border-primary
                  focus:ring-1
                  focus:ring-primary
                "
              />
            </div>

            {/* Data visita */}
            <div className="min-w-0">
              <label
                htmlFor="visitedAt"
                className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-foreground"
              >
                <CalendarDays className="size-3.5 shrink-0" />
                Data della visita *
              </label>

              <input
                id="visitedAt"
                type="date"
                value={visitedAt}
                onChange={(event) => setVisitedAt(event.target.value)}
                className="
                  block
                  h-9
                  min-w-0
                  max-w-full
                  w-full
                  rounded-lg
                  border
                  border-input
                  bg-background
                  px-3
                  text-[11px]
                  text-foreground
                  outline-none
                  transition
                  focus:border-primary
                  focus:ring-1
                  focus:ring-primary
                "
              />
            </div>

            {/* Mezzo e categoria */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="transportType"
                  className="mb-1.5 block text-[10px] font-bold text-foreground"
                >
                  Mezzo di trasporto
                </label>

                <select
                  id="transportType"
                  value={transportType}
                  onChange={(event) =>
                    setTransportType(event.target.value)
                  }
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-input
                    bg-background
                    px-3
                    text-[11px]
                    text-foreground
                    outline-none
                    focus:border-primary
                    focus:ring-1
                    focus:ring-primary
                  "
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
                <label
                  htmlFor="category"
                  className="mb-1.5 block text-[10px] font-bold text-foreground"
                >
                  Categoria
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-input
                    bg-background
                    px-3
                    text-[11px]
                    text-foreground
                    outline-none
                    focus:border-primary
                    focus:ring-1
                    focus:ring-primary
                  "
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

            {/* Gruppo */}
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label
                  htmlFor="vacationId"
                  className="text-[10px] font-bold text-foreground"
                >
                  Vacanza
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setShowNewVacation((current) => !current);
                    setError("");
                  }}
                  className="
                    flex
                    items-center
                    gap-1
                    text-[9px]
                    font-bold
                    text-primary
                    hover:underline
                  "
                >
                  <Plus className="size-3" />
                  Nuova vacanza
                </button>
              </div>

              <select
                id="vacationId"
                value={selectedVacationId}
                onChange={(event) => setSelectedVacationId(event.target.value)}
                className="
                  block
                  h-9
                  min-w-0
                  w-full
                  rounded-lg
                  border
                  border-input
                  bg-background
                  px-3
                  text-[11px]
                  text-foreground
                  outline-none
                  focus:border-primary
                  focus:ring-1
                  focus:ring-primary
                "
              >
                <option value="">Nessuna vacanza</option>

                {vacations.map((vacation) => (
                  <option key={vacation.id} value={vacation.id}>
                    {vacation.name}
                  </option>
                ))}
              </select>

              {showNewVacation && (
                <div className="mt-2 rounded-lg border border-border bg-secondary/30 p-3">
                  <label
                    htmlFor="newVacationName"
                    className="mb-1.5 block text-[9px] font-bold text-foreground"
                  >
                    Nome della nuova vacanza
                  </label>

                  <div className="flex min-w-0 gap-2">
                    <input
                      id="newVacationName"
                      type="text"
                      value={newVacationName}
                      onChange={(event) => setNewVacationName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void createVacation();
                        }
                      }}
                      placeholder="Esempio: Fiandre 2026"
                      className="
                        h-9
                        min-w-0
                        flex-1
                        rounded-lg
                        border
                        border-input
                        bg-background
                        px-3
                        text-[11px]
                        text-foreground
                        outline-none
                        placeholder:text-muted-foreground
                        focus:border-primary
                        focus:ring-1
                        focus:ring-primary
                      "
                    />

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void createVacation()}
                      disabled={isCreatingVacation}
                      className="h-9 shrink-0 px-3 text-[10px] font-bold"
                    >
                      {isCreatingVacation ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        "Crea"
                      )}
                    </Button>
                  </div>

                  <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
                    Una volta creata, la vacanza potrà essere selezionata per tutti gli
                    altri luoghi visitati.
                  </p>
                </div>
              )}
            </div>

            {/* Google Foto */}
            <div>
              <label
                htmlFor="googlePhotosUrl"
                className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold text-foreground"
              >
                <ExternalLink className="size-3.5" />
                Link album Google Foto
              </label>

              <input
                id="googlePhotosUrl"
                type="url"
                value={googlePhotosUrl}
                onChange={(event) =>
                  setGooglePhotosUrl(event.target.value)
                }
                placeholder="https://photos.app.goo.gl/..."
                className="
                  h-9
                  w-full
                  rounded-lg
                  border
                  border-input
                  bg-background
                  px-3
                  text-[11px]
                  text-foreground
                  outline-none
                  transition
                  placeholder:text-muted-foreground
                  focus:border-primary
                  focus:ring-1
                  focus:ring-primary
                "
              />
            </div>

            {/* Preferito */}
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(event) =>
                  setIsFavorite(event.target.checked)
                }
                className="size-4 accent-primary"
              />

              <Star className="size-3.5 text-muted-foreground" />

              <span className="min-w-0">
                <span className="block text-[10px] font-bold">
                  Luogo preferito
                </span>

                <span className="block text-[9px] text-muted-foreground">
                  Evidenzia questo posto nell&apos;Atlante
                </span>
              </span>
            </label>

            {/* Errori */}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[10px] font-medium text-destructive">
                {error}
              </div>
            )}

            {/* Successo */}
            {success && (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                {success}
              </div>
            )}

            {/* Salva */}
            <Button
              type="button"
              onClick={savePlace}
              disabled={isSaving}
              className="h-10 w-full gap-2 rounded-lg text-xs font-black"
            >
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Salva luogo
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}