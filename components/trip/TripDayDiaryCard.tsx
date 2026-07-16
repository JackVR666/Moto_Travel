'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Loader2,
  MapPin,
  Save,
  Sparkles,
  Star,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type TripDay = {
  id: string
  day_number: number
  travel_date: string
  title: string | null
  notes: string | null
  start_city: string | null
  end_city: string | null
  planned_km: number | null
}

type DiaryRow = {
  id: string
  trip_id: string
  trip_day_id: string
  rating: number | null
  weather: string | null
  favorite_place: string | null
  road_notes: string | null
  hotel_notes: string | null
  restaurant_notes: string | null
  unexpected_events: string | null
  highlights: string | null
  diary_text: string | null
  generated_draft: string | null
}

type PointRow = {
  latitude: number | null
  longitude: number | null
  timestamp: string | null
  speed: number | null
}

type TripDayDiaryCardProps = {
  tripId: string
  day: TripDay
  formatDate: (iso: string | null) => string
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const radius = 6371
  const toRadians = (value: number) => (value * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calculatePointStats(points: PointRow[]) {
  const valid = points.filter(
    (point) =>
      Number.isFinite(Number(point.latitude)) &&
      Number.isFinite(Number(point.longitude)),
  )

  let totalKm = 0

  for (let index = 1; index < valid.length; index++) {
    totalKm += haversineKm(
      Number(valid[index - 1].latitude),
      Number(valid[index - 1].longitude),
      Number(valid[index].latitude),
      Number(valid[index].longitude),
    )
  }

  const speeds = valid
    .map((point) => Number(point.speed))
    .filter(
      (speed) =>
        Number.isFinite(speed) &&
        speed > 0 &&
        speed <= 220,
    )

  const averageSpeed =
    speeds.length > 0
      ? speeds.reduce((sum, speed) => sum + speed, 0) /
        speeds.length
      : 0

  const startTime = valid.find((point) => point.timestamp)?.timestamp
  const endTime = [...valid]
    .reverse()
    .find((point) => point.timestamp)?.timestamp

  return {
    pointCount: valid.length,
    totalKm,
    averageSpeed,
    startTime: startTime || null,
    endTime: endTime || null,
  }
}

function formatTime(value: string | null): string {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function TripDayDiaryCard({
  tripId,
  day,
  formatDate,
}: TripDayDiaryCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [diaryId, setDiaryId] = useState<string | null>(null)

  const [rating, setRating] = useState(0)
  const [weather, setWeather] = useState('')
  const [favoritePlace, setFavoritePlace] = useState('')
  const [roadNotes, setRoadNotes] = useState('')
  const [hotelNotes, setHotelNotes] = useState('')
  const [restaurantNotes, setRestaurantNotes] = useState('')
  const [unexpectedEvents, setUnexpectedEvents] = useState('')
  const [highlights, setHighlights] = useState('')
  const [diaryText, setDiaryText] = useState('')
  const [generatedDraft, setGeneratedDraft] = useState('')
  const [pointStats, setPointStats] = useState<ReturnType<
    typeof calculatePointStats
  > | null>(null)

  useEffect(() => {
    if (!expanded) return

    let cancelled = false

    const loadDiary = async () => {
      setLoading(true)

      try {
        const [diaryResult, pointsResult] = await Promise.all([
          supabase
            .from('trip_day_diary')
            .select('*')
            .eq('trip_day_id', day.id)
            .maybeSingle(),
          supabase
            .from('track_points')
            .select(
              'latitude, longitude, timestamp, speed',
            )
            .eq('trip_day_id', day.id)
            .order('timestamp', { ascending: true }),
        ])

        if (diaryResult.error) throw diaryResult.error
        if (pointsResult.error) throw pointsResult.error
        if (cancelled) return

        const diary = diaryResult.data as DiaryRow | null

        if (diary) {
          setDiaryId(diary.id)
          setRating(Number(diary.rating || 0))
          setWeather(diary.weather || '')
          setFavoritePlace(diary.favorite_place || '')
          setRoadNotes(diary.road_notes || '')
          setHotelNotes(diary.hotel_notes || '')
          setRestaurantNotes(diary.restaurant_notes || '')
          setUnexpectedEvents(diary.unexpected_events || '')
          setHighlights(diary.highlights || '')
          setDiaryText(diary.diary_text || '')
          setGeneratedDraft(diary.generated_draft || '')
        }

        setPointStats(
          calculatePointStats(
            (pointsResult.data || []) as PointRow[],
          ),
        )
      } catch (error) {
        console.error('Errore caricamento diario:', error)
        alert(
          error instanceof Error
            ? error.message
            : 'Errore durante il caricamento del diario.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadDiary()

    return () => {
      cancelled = true
    }
  }, [expanded, day.id])

  const hasDiaryContent = useMemo(
    () =>
      rating > 0 ||
      [
        weather,
        favoritePlace,
        roadNotes,
        hotelNotes,
        restaurantNotes,
        unexpectedEvents,
        highlights,
        diaryText,
        generatedDraft,
      ].some((value) => value.trim().length > 0),
    [
      rating,
      weather,
      favoritePlace,
      roadNotes,
      hotelNotes,
      restaurantNotes,
      unexpectedEvents,
      highlights,
      diaryText,
      generatedDraft,
    ],
  )

  const generateDraft = () => {
    const lines: string[] = []

    lines.push(
      `Giorno ${day.day_number}, ${formatDate(day.travel_date)}.`,
    )

    if (day.start_city || day.end_city) {
      lines.push(
        `Partenza da ${day.start_city || 'località non indicata'} e arrivo a ${day.end_city || 'località non indicata'}.`,
      )
    }

    if (pointStats && pointStats.pointCount > 1) {
      const startTime = formatTime(pointStats.startTime)
      const endTime = formatTime(pointStats.endTime)

      if (startTime) {
        lines.push(`Partenza registrata alle ${startTime}.`)
      }

      lines.push(
        `La traccia GPX registra ${pointStats.totalKm.toFixed(1)} km.`,
      )

      if (pointStats.averageSpeed > 0) {
        lines.push(
          `Velocità media rilevata: ${pointStats.averageSpeed.toFixed(1)} km/h.`,
        )
      }

      if (endTime) {
        lines.push(`Arrivo registrato alle ${endTime}.`)
      }
    } else if (day.planned_km) {
      lines.push(
        `Chilometri previsti per la giornata: ${Number(day.planned_km).toFixed(1)} km.`,
      )
    }

    if (day.title) {
      lines.push(`Tappa: ${day.title}.`)
    }

    if (day.notes) {
      lines.push(`Appunti di pianificazione: ${day.notes}`)
    }

    lines.push(
      'Aggiungi qui i ricordi, le emozioni e gli episodi più importanti della giornata.',
    )

    const draft = lines.join('\n\n')
    setGeneratedDraft(draft)

    if (!diaryText.trim()) {
      setDiaryText(draft)
    }
  }

  const saveDiary = async () => {
    setSaving(true)

    try {
      const payload = {
        trip_id: tripId,
        trip_day_id: day.id,
        rating: rating > 0 ? rating : null,
        weather: weather.trim() || null,
        favorite_place: favoritePlace.trim() || null,
        road_notes: roadNotes.trim() || null,
        hotel_notes: hotelNotes.trim() || null,
        restaurant_notes: restaurantNotes.trim() || null,
        unexpected_events: unexpectedEvents.trim() || null,
        highlights: highlights.trim() || null,
        diary_text: diaryText.trim() || null,
        generated_draft: generatedDraft.trim() || null,
        updated_at: new Date().toISOString(),
      }

      const result = diaryId
        ? await supabase
            .from('trip_day_diary')
            .update(payload)
            .eq('id', diaryId)
            .select('id')
            .single()
        : await supabase
            .from('trip_day_diary')
            .insert([payload])
            .select('id')
            .single()

      if (result.error) throw result.error

      setDiaryId(result.data.id)
      alert('Diario della giornata salvato.')
    } catch (error) {
      console.error('Errore salvataggio diario:', error)
      alert(
        error instanceof Error
          ? error.message
          : 'Errore durante il salvataggio del diario.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-secondary/5">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-secondary/20"
      >
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="size-4 shrink-0 text-primary" />

          <div className="min-w-0">
            <p className="text-[10px] font-black text-foreground sm:text-xs">
              Diario della giornata
            </p>
            <p className="truncate text-[8px] text-muted-foreground sm:text-[10px]">
              {hasDiaryContent
                ? 'Ricordi presenti'
                : 'Aggiungi il racconto, il meteo e i momenti importanti'}
            </p>
          </div>
        </div>

        {expanded ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border/60 p-3 sm:p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-[10px] text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Caricamento diario…
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-xl border border-border/60 bg-background p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                      Valutazione della giornata
                    </p>

                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setRating(
                              rating === value ? 0 : value,
                            )
                          }
                          aria-label={`${value} stelle`}
                        >
                          <Star
                            className={`size-5 ${
                              value <= rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-muted-foreground/40'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={generateDraft}
                    className="flex h-9 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-[9px] font-black text-primary hover:bg-primary/15 sm:text-[11px]"
                  >
                    <Sparkles className="size-3.5" />
                    Genera bozza automatica
                  </button>
                </div>

                {pointStats && pointStats.pointCount > 1 && (
                  <p className="mt-3 text-[8px] text-muted-foreground sm:text-[10px]">
                    GPX della giornata: {pointStats.pointCount} punti ·{' '}
                    {pointStats.totalKm.toFixed(1)} km
                  </p>
                )}
              </section>

              <div className="grid gap-3 sm:grid-cols-2">
                <DiaryField
                  label="Meteo"
                  icon={CloudSun}
                  value={weather}
                  onChange={setWeather}
                  placeholder="Sole, pioggia, vento, temperatura..."
                />

                <DiaryField
                  label="Luogo preferito"
                  icon={MapPin}
                  value={favoritePlace}
                  onChange={setFavoritePlace}
                  placeholder="Il posto più bello della giornata"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DiaryArea
                  label="Strada e percorso"
                  value={roadNotes}
                  onChange={setRoadNotes}
                  placeholder="Condizioni della strada, passi, panorami..."
                />

                <DiaryArea
                  label="Hotel"
                  value={hotelNotes}
                  onChange={setHotelNotes}
                  placeholder="Accoglienza, camera, parcheggio, giudizio..."
                />

                <DiaryArea
                  label="Ristoranti e pasti"
                  value={restaurantNotes}
                  onChange={setRestaurantNotes}
                  placeholder="Dove hai mangiato e cosa ricordi..."
                />

                <DiaryArea
                  label="Imprevisti"
                  value={unexpectedEvents}
                  onChange={setUnexpectedEvents}
                  placeholder="Problemi, deviazioni, sorprese..."
                />

                <DiaryArea
                  label="Momenti da ricordare"
                  value={highlights}
                  onChange={setHighlights}
                  placeholder="Il momento più emozionante o divertente..."
                  wide
                />
              </div>

              {generatedDraft && (
                <section className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-primary">
                    Bozza generata
                  </p>
                  <p className="mt-2 whitespace-pre-line text-[9px] leading-relaxed text-muted-foreground sm:text-[11px]">
                    {generatedDraft}
                  </p>
                </section>
              )}

              <label className="block">
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  Racconto della giornata
                </span>
                <textarea
                  value={diaryText}
                  onChange={(event) =>
                    setDiaryText(event.target.value)
                  }
                  rows={10}
                  placeholder="Scrivi qui il diario completo della giornata..."
                  className="mt-1.5 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-[10px] leading-relaxed text-foreground outline-none focus:border-primary sm:text-xs"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={saveDiary}
                  disabled={saving}
                  className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[9px] font-black text-primary-foreground disabled:opacity-50 sm:text-[11px]"
                >
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Salva diario
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DiaryField({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
}: {
  label: string
  icon: typeof CloudSun
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <label className="min-w-0">
      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-[10px] text-foreground outline-none focus:border-primary sm:text-xs"
      />
    </label>
  )
}

function DiaryArea({
  label,
  value,
  onChange,
  placeholder,
  wide = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  wide?: boolean
}) {
  return (
    <label className={wide ? 'sm:col-span-2' : ''}>
      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-[10px] text-foreground outline-none focus:border-primary sm:text-xs"
      />
    </label>
  )
}
