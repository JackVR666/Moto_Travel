'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  CalendarRange,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Loader2,
  MapPinned,
  Route,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ExplorerMapTrip } from '@/components/v2/MapExplorerMap'

const MapExplorerMap = dynamic(
  () => import('@/components/v2/MapExplorerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-secondary/20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    ),
  },
)

type TripStatus =
  | 'pianificato'
  | 'in_corso'
  | 'completato'

type TripRow = {
  id: string
  title: string
  trip_date: string | null
  trip_end_date: string | null
  total_km: number | null
  status: TripStatus | null
}

type PointRow = {
  latitude: number | null
  longitude: number | null
  timestamp: string | null
}

type StopRow = {
  latitude: number | null
  longitude: number | null
  start_time: string | null
  end_time: string | null
  duration_minutes: number | null
}

const TRACK_COLORS = [
  '#d4af37',
  '#2563eb',
  '#dc2626',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
  '#be185d',
]

function formatDate(value: string | null): string {
  if (!value) return '—'

  return new Date(
    `${value.slice(0, 10)}T12:00:00`,
  ).toLocaleDateString('it-IT')
}

function statusLabel(status: TripStatus): string {
  if (status === 'in_corso') return 'In corso'
  if (status === 'completato') return 'Completato'
  return 'Pianificato'
}

function simplifyPoints(
  rows: PointRow[],
  maximumPoints = 650,
): Array<[number, number]> {
  const valid = rows
    .filter(
      (row) =>
        Number.isFinite(Number(row.latitude)) &&
        Number.isFinite(Number(row.longitude)),
    )
    .map(
      (row) =>
        [
          Number(row.latitude),
          Number(row.longitude),
        ] as [number, number],
    )

  if (valid.length <= maximumPoints) return valid

  const step = Math.ceil(valid.length / maximumPoints)

  const simplified = valid.filter(
    (_, index) =>
      index % step === 0 || index === valid.length - 1,
  )

  if (
    simplified[simplified.length - 1] !==
    valid[valid.length - 1]
  ) {
    simplified.push(valid[valid.length - 1])
  }

  return simplified
}

async function fetchTripPoints(
  tripId: string,
): Promise<PointRow[]> {
  const pageSize = 1000
  const points: PointRow[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('track_points')
      .select('latitude, longitude, timestamp')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    points.push(...(data as PointRow[]))

    if (data.length < pageSize) break
    from += pageSize
  }

  return points
}

async function fetchTripStops(
  tripId: string,
): Promise<StopRow[]> {
  const { data, error } = await supabase
    .from('trip_stops')
    .select(
      'latitude, longitude, start_time, end_time, duration_minutes',
    )
    .eq('trip_id', tripId)
    .order('start_time', { ascending: true })

  if (error) throw error

  return (data || []) as StopRow[]
}

export function MapExplorerView() {
  const [trips, setTrips] = useState<ExplorerMapTrip[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(
    null,
  )
  const [selectedTripId, setSelectedTripId] =
    useState('tutti')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCompleted, setShowCompleted] = useState(true)
  const [showActive, setShowActive] = useState(false)
  const [showPlanned, setShowPlanned] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadTrips = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const { data, error } = await supabase
          .from('trips')
          .select(
            'id, title, trip_date, trip_end_date, total_km, status',
          )
          .order('trip_date', { ascending: true })

        if (error) throw error

        const tripRows = (data || []) as TripRow[]

        const loaded = await Promise.all(
          tripRows.map(async (trip, index) => {
            const [rawPoints, rawStops] = await Promise.all([
              fetchTripPoints(trip.id),
              fetchTripStops(trip.id),
            ])

            return {
              id: trip.id,
              title: trip.title,
              tripDate: trip.trip_date,
              tripEndDate: trip.trip_end_date,
              totalKm: Number(trip.total_km || 0),
              status:
                trip.status || 'pianificato',
              color:
                TRACK_COLORS[index % TRACK_COLORS.length],
              points: simplifyPoints(rawPoints),
              stops: rawStops
                .filter(
                  (stop) =>
                    Number.isFinite(Number(stop.latitude)) &&
                    Number.isFinite(Number(stop.longitude)),
                )
                .map((stop) => ({
                  lat: Number(stop.latitude),
                  lon: Number(stop.longitude),
                  startTime: stop.start_time,
                  endTime: stop.end_time,
                  durationMinutes: Number(
                    stop.duration_minutes || 0,
                  ),
                })),
            } satisfies ExplorerMapTrip
          }),
        )

        if (!cancelled) setTrips(loaded)
      } catch (error) {
        console.error('Errore Mappa Explorer:', error)

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Impossibile caricare la mappa dei viaggi.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadTrips()

    return () => {
      cancelled = true
    }
  }, [])

  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      const statusVisible =
        (trip.status === 'completato' && showCompleted) ||
        (trip.status === 'in_corso' && showActive) ||
        (trip.status === 'pianificato' && showPlanned)

      if (!statusVisible) return false

      const tripStart = trip.tripDate?.slice(0, 10) || ''
      const tripEnd =
        (trip.tripEndDate || trip.tripDate)?.slice(0, 10) ||
        ''

      if (startDate && tripEnd && tripEnd < startDate) {
        return false
      }

      if (endDate && tripStart && tripStart > endDate) {
        return false
      }

      return true
    })
  }, [
    trips,
    startDate,
    endDate,
    showCompleted,
    showActive,
    showPlanned,
  ])

  const visibleTrips = useMemo(() => {
    if (selectedTripId === 'tutti') return filteredTrips

    return filteredTrips.filter(
      (trip) => trip.id === selectedTripId,
    )
  }, [filteredTrips, selectedTripId])

  useEffect(() => {
    if (
      selectedTripId !== 'tutti' &&
      !filteredTrips.some(
        (trip) => trip.id === selectedTripId,
      )
    ) {
      setSelectedTripId('tutti')
    }
  }, [filteredTrips, selectedTripId])

  const selectedTrip =
    selectedTripId === 'tutti'
      ? null
      : trips.find((trip) => trip.id === selectedTripId) ||
        null

  const totalKm = visibleTrips.reduce(
    (sum, trip) => sum + trip.totalKm,
    0,
  )

  const visiblePointCount = visibleTrips.reduce(
    (sum, trip) => sum + trip.points.length,
    0,
  )

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Caricamento archivio geografico…
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="text-sm font-black text-destructive">
          Mappa non disponibile
        </h2>
        <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">
          {loadError}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-zinc-950 via-black to-amber-950/70 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Compass className="size-5" />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                Versione 2.2 · Explorer
              </p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-3xl">
                La mappa delle tue avventure
              </h2>
              <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-zinc-300 sm:text-sm">
                Tutte le tracce archiviate sulla stessa cartina,
                filtrabili per stato, periodo e singolo viaggio.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="min-w-0">
              <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                Viaggio
              </span>
              <select
                value={selectedTripId}
                onChange={(event) =>
                  setSelectedTripId(event.target.value)
                }
                className="mt-1 h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-[10px] font-bold text-foreground sm:text-xs"
              >
                <option value="tutti">
                  Tutti i viaggi visibili
                </option>
                {filteredTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                Dal
              </span>
              <span className="mt-1 flex h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3">
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) =>
                    setStartDate(event.target.value)
                  }
                  className="block w-full min-w-0 border-0 bg-transparent p-0 text-[10px] text-foreground outline-none sm:text-xs"
                />
              </span>
            </label>

            <label className="min-w-0">
              <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                Al
              </span>
              <span className="mt-1 flex h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3">
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) =>
                    setEndDate(event.target.value)
                  }
                  className="block w-full min-w-0 border-0 bg-transparent p-0 text-[10px] text-foreground outline-none sm:text-xs"
                />
              </span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              setStartDate('')
              setEndDate('')
              setSelectedTripId('tutti')
            }}
            className="h-10 rounded-xl border border-border bg-background px-4 text-[9px] font-bold hover:bg-secondary sm:text-[11px]"
          >
            Azzera filtri
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            {
              label: 'Completati',
              checked: showCompleted,
              setChecked: setShowCompleted,
              icon: CheckCircle2,
            },
            {
              label: 'In corso',
              checked: showActive,
              setChecked: setShowActive,
              icon: Eye,
            },
            {
              label: 'Pianificati',
              checked: showPlanned,
              setChecked: setShowPlanned,
              icon: EyeOff,
            },
          ].map((item) => {
            const Icon = item.icon

            return (
              <label
                key={item.label}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[9px] font-bold transition-colors sm:text-[11px] ${
                  item.checked
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border bg-background text-muted-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(event) =>
                    item.setChecked(event.target.checked)
                  }
                  className="sr-only"
                />
                <Icon className="size-3.5" />
                {item.label}
              </label>
            )
          })}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5">
          <p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Viaggi visibili
          </p>
          <p className="mt-2 text-lg font-black sm:text-2xl">
            {visibleTrips.length}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5">
          <p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Km rappresentati
          </p>
          <p className="mt-2 text-lg font-black sm:text-2xl">
            {totalKm.toFixed(0)}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5">
          <p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Punti semplificati
          </p>
          <p className="mt-2 text-lg font-black sm:text-2xl">
            {visiblePointCount}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5">
          <p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
            Soste rilevate
          </p>
          <p className="mt-2 text-lg font-black sm:text-2xl">
            {selectedTrip ? selectedTrip.stops.length : '—'}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="relative h-[430px] min-h-[430px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm sm:h-[600px] sm:min-h-[600px]">
          {visibleTrips.length > 0 ? (
            <MapExplorerMap
              trips={visibleTrips}
              selectedTripId={selectedTripId}
              onSelectTrip={setSelectedTripId}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <div>
                <MapPinned className="mx-auto size-8 text-muted-foreground" />
                <h3 className="mt-3 text-sm font-black">
                  Nessuna traccia visibile
                </h3>
                <p className="mt-2 text-[9px] text-muted-foreground sm:text-xs">
                  Modifica i filtri oppure completa un viaggio
                  contenente una traccia GPX.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Route className="size-4 text-primary" />
            <h3 className="text-xs font-black sm:text-base">
              {selectedTrip
                ? 'Viaggio selezionato'
                : 'Legenda viaggi'}
            </h3>
          </div>

          {selectedTrip ? (
            <div className="mt-4">
              <div
                className="h-1.5 rounded-full"
                style={{ backgroundColor: selectedTrip.color }}
              />

              <h4 className="mt-3 text-sm font-black">
                {selectedTrip.title}
              </h4>

              <p className="mt-2 text-[9px] text-muted-foreground sm:text-xs">
                {formatDate(selectedTrip.tripDate)}
                {' → '}
                {formatDate(
                  selectedTrip.tripEndDate ||
                    selectedTrip.tripDate,
                )}
              </p>

              <dl className="mt-4 space-y-2 text-[9px] sm:text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Stato
                  </dt>
                  <dd className="font-bold">
                    {statusLabel(selectedTrip.status)}
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Chilometri
                  </dt>
                  <dd className="font-bold">
                    {selectedTrip.totalKm.toFixed(1)} km
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Punti mappa
                  </dt>
                  <dd className="font-bold">
                    {selectedTrip.points.length}
                  </dd>
                </div>

                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    Soste
                  </dt>
                  <dd className="font-bold">
                    {selectedTrip.stops.length}
                  </dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => setSelectedTripId('tutti')}
                className="mt-4 h-9 w-full rounded-lg border border-border bg-background text-[9px] font-bold hover:bg-secondary sm:text-[11px]"
              >
                Mostra tutti
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {filteredTrips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => setSelectedTripId(trip.id)}
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background p-2.5 text-left hover:bg-secondary"
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: trip.color }}
                  />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[9px] font-bold sm:text-[11px]">
                      {trip.title}
                    </span>
                    <span className="block text-[7px] text-muted-foreground sm:text-[9px]">
                      {trip.totalKm.toFixed(0)} km
                    </span>
                  </span>
                </button>
              ))}

              {filteredTrips.length === 0 && (
                <p className="text-[9px] text-muted-foreground sm:text-xs">
                  Nessun viaggio corrisponde ai filtri.
                </p>
              )}
            </div>
          )}
        </aside>
      </section>

      <p className="text-[8px] leading-relaxed text-muted-foreground sm:text-[10px]">
        Le tracce della mappa generale vengono semplificate a un
        massimo di circa 650 punti per viaggio. Se selezioni un solo
        viaggio, i tag numerati mostrano le soste rilevate. I dati GPX
        originali restano invariati nel database.
      </p>
    </div>
  )
}
