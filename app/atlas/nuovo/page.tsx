"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ExternalLink,
  Loader2,
  LocateFixed,
  MapPin,
  Save,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
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
  const [tripGroup, setTripGroup] = useState("");
  const [googlePhotosUrl, setGooglePhotosUrl] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function detectPosition() {
    setError("");
    setSuccess("");

    if (!navigator.geolocation) {
      setError("Il dispositivo non supporta la geolocalizzazione.");
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
        console.error("Errore geolocalizzazione:", geolocationError);

        let message = "Non è stato possibile rilevare la posizione.";

        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          message =
            "Permesso per la posizione negato. Abilita la localizzazione nelle impostazioni del browser.";
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
        trip_group: tripGroup.trim() || null,

        google_photos_url: googlePhotosUrl.trim() || null,
        is_favorite: isFavorite,
      });

    setIsSaving(false);

    if (insertError) {
      console.error("Errore salvataggio luogo:", insertError);
      setError(`Errore durante il salvataggio: ${insertError.message}`);
      return;
    }

    setSuccess("Luogo salvato correttamente.");

    setTimeout(() => {
      router.push("/atlas");
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <button
          type="button"
          onClick={() => router.push("/atlas")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
          Torna all&apos;atlante
        </button>

        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-300">
            <MapPin size={16} />
            Nuovo luogo
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">
            Registra un luogo visitato
          </h1>

          <p className="mt-2 text-slate-400">
            Rileva la posizione, aggiungi i dettagli e salva il ricordo nel tuo
            atlante.
          </p>
        </div>

        <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-medium">Posizione geografica</h2>

              {!coordinates ? (
                <p className="mt-1 text-sm text-slate-400">
                  Le coordinate non sono ancora state rilevate.
                </p>
              ) : (
                <div className="mt-2 space-y-1 text-sm text-slate-300">
                  <p>
                    Latitudine:{" "}
                    <span className="font-medium text-white">
                      {coordinates.latitude.toFixed(6)}
                    </span>
                  </p>

                  <p>
                    Longitudine:{" "}
                    <span className="font-medium text-white">
                      {coordinates.longitude.toFixed(6)}
                    </span>
                  </p>

                  {coordinates.accuracy !== null && (
                    <p>
                      Precisione: circa{" "}
                      <span className="font-medium text-white">
                        {Math.round(coordinates.accuracy)} metri
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={detectPosition}
              disabled={isLocating}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Rilevamento...
                </>
              ) : coordinates ? (
                <>
                  <LocateFixed size={20} />
                  Rileva di nuovo
                </>
              ) : (
                <>
                  <LocateFixed size={20} />
                  Usa la mia posizione
                </>
              )}
            </button>
          </div>

          {coordinates && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
              <Check size={18} />
              Posizione rilevata correttamente
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="space-y-5">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Nome del luogo *
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Esempio: Grand-Place di Bruxelles"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Descrizione
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Scrivi un ricordo, una nota o una descrizione..."
                rows={4}
                className="w-full resize-none rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="visitedAt"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200"
              >
                <CalendarDays size={17} />
                Data della visita *
              </label>

              <input
                id="visitedAt"
                type="date"
                value={visitedAt}
                onChange={(event) => setVisitedAt(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="transportType"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Mezzo di trasporto
                </label>

                <select
                  id="transportType"
                  value={transportType}
                  onChange={(event) => setTransportType(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
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
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Categoria
                </label>

                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400"
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
              <label
                htmlFor="tripGroup"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Vacanza o gruppo
              </label>

              <input
                id="tripGroup"
                type="text"
                value={tripGroup}
                onChange={(event) => setTripGroup(event.target.value)}
                placeholder="Esempio: Portogallo 2026"
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <div>
              <label
                htmlFor="googlePhotosUrl"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200"
              >
                <ExternalLink size={17} />
                Link album Google Foto
              </label>

              <input
                id="googlePhotosUrl"
                type="url"
                value={googlePhotosUrl}
                onChange={(event) => setGooglePhotosUrl(event.target.value)}
                placeholder="https://photos.app.goo.gl/..."
                className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(event) => setIsFavorite(event.target.checked)}
                className="h-5 w-5 accent-cyan-500"
              />

              <span>
                <span className="block font-medium">Luogo preferito</span>
                <span className="block text-sm text-slate-400">
                  Evidenzia questo posto nel tuo atlante
                </span>
              </span>
            </label>

            {error && (
              <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-300">
                {success}
              </div>
            )}

            <button
              type="button"
              onClick={savePlace}
              disabled={isSaving}
              className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-6 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 size={21} className="animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save size={21} />
                  Salva luogo
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}