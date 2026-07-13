import { ExternalLink, MapPin } from 'lucide-react'

export type RoadbookTripDay = {
  id: string
  day_number: number
  travel_date: string
  title: string | null
  start_city: string | null
  end_city: string | null
  planned_km: number | null
  notes: string | null
}

export type RoadbookAccommodation = {
  id: string
  trip_day_id: string
  name: string
  address: string | null
  booking_url: string | null
  airbnb_url: string | null
  check_in_date: string | null
  check_out_date: string | null
  check_in_time: string | null
  check_out_time: string | null
  price: number | null
  parking_available: boolean | null
  notes: string | null
}

type RoadbookViewProps = {
  tripDays: RoadbookTripDay[]
  accommodations: RoadbookAccommodation[]
  formatDate: (iso: string | null) => string
}

function formatTime(value: string | null): string {
  return value ? value.slice(0, 5) : '—'
}

function bookingInfo(accommodation?: RoadbookAccommodation) {
  if (!accommodation) return null
  if (accommodation.booking_url) {
    return { label: 'Booking', href: accommodation.booking_url }
  }
  if (accommodation.airbnb_url) {
    return { label: 'Airbnb', href: accommodation.airbnb_url }
  }
  return null
}

export function RoadbookView({
  tripDays,
  accommodations,
  formatDate,
}: RoadbookViewProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Roadbook viaggio
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Panoramica completa di tappe, pernottamenti, costi e note.
        </p>
      </div>

      <div className="space-y-3 sm:hidden">
        {tripDays.map((day) => {
          const accommodation = accommodations.find(
            (item) => item.trip_day_id === day.id,
          )
          const booking = bookingInfo(accommodation)
          const mapsUrl = accommodation?.address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(accommodation.address)}`
            : null

          return (
            <article
              key={day.id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Giorno {day.day_number} · {formatDate(day.travel_date)}
                  </p>
                  <h3 className="mt-1 text-base font-black text-foreground">
                    {day.start_city || '—'} → {day.end_city || '—'}
                  </h3>
                  {day.title && (
                    <p className="mt-1 text-xs text-muted-foreground">{day.title}</p>
                  )}
                </div>

                {day.planned_km !== null && (
                  <span className="shrink-0 rounded-lg border border-border bg-secondary/30 px-2 py-1 font-mono text-xs font-bold">
                    {Number(day.planned_km).toFixed(0)} km
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-secondary/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pernottamento
                </p>

                {accommodation ? (
                  <div className="mt-2 space-y-2">
                    <p className="font-bold text-foreground">🏨 {accommodation.name}</p>

                    {accommodation.address && (
                      <p className="flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 size-3.5 shrink-0" />
                        <span>{accommodation.address}</span>
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-background p-2">
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Check-in</p>
                        <p className="mt-1 font-medium">
                          {formatDate(accommodation.check_in_date)} · {formatTime(accommodation.check_in_time)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-background p-2">
                        <p className="text-[9px] font-bold uppercase text-muted-foreground">Check-out</p>
                        <p className="mt-1 font-medium">
                          {formatDate(accommodation.check_out_date)} · {formatTime(accommodation.check_out_time)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {accommodation.price !== null && (
                        <span className="rounded-md bg-background px-2 py-1 font-mono font-bold">
                          € {Number(accommodation.price).toFixed(2)}
                        </span>
                      )}
                      {accommodation.parking_available && (
                        <span className="rounded-md bg-background px-2 py-1">🅿️ Moto</span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {booking && (
                        <a
                          href={booking.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                        >
                          {booking.label}
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                      {mapsUrl && (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center gap-1 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                        >
                          Maps
                          <MapPin className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    Nessun pernottamento previsto.
                  </p>
                )}
              </div>

              {(day.notes || accommodation?.notes) && (
                <div className="mt-3 rounded-xl bg-secondary/10 p-3 text-xs text-muted-foreground">
                  {day.notes || accommodation?.notes}
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm sm:block">
        <table className="min-w-[1100px] w-full text-xs">
          <thead className="bg-secondary/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left">Tappa</th>
              <th className="px-3 py-3 text-left">Arrivo</th>
              <th className="px-3 py-3 text-left">Partenza</th>
              <th className="px-3 py-3 text-right">Km</th>
              <th className="px-3 py-3 text-left">Pernotto</th>
              <th className="px-3 py-3 text-left">Indirizzo</th>
              <th className="px-3 py-3 text-left">Check-in</th>
              <th className="px-3 py-3 text-right">Costo</th>
              <th className="px-3 py-3 text-left">Link</th>
              <th className="px-3 py-3 text-left">Note</th>
            </tr>
          </thead>
          <tbody>
            {tripDays.map((day) => {
              const accommodation = accommodations.find(
                (item) => item.trip_day_id === day.id,
              )
              const booking = bookingInfo(accommodation)

              return (
                <tr
                  key={day.id}
                  className="border-t border-border/50 odd:bg-background even:bg-secondary/10"
                >
                  <td className="px-3 py-3 font-bold text-foreground">
                    {day.start_city || '—'} → {day.end_city || '—'}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {formatDate(day.travel_date)}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {accommodation?.check_out_date
                      ? formatDate(accommodation.check_out_date)
                      : formatDate(day.travel_date)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {day.planned_km !== null
                      ? Number(day.planned_km).toFixed(0)
                      : '—'}
                  </td>
                  <td className="px-3 py-3">{accommodation?.name || '—'}</td>
                  <td className="max-w-[220px] truncate px-3 py-3 text-muted-foreground">
                    {accommodation?.address || '—'}
                  </td>
                  <td className="px-3 py-3">
                    {accommodation
                      ? `${formatDate(accommodation.check_in_date)} ${formatTime(accommodation.check_in_time)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-right font-mono">
                    {accommodation?.price !== null && accommodation?.price !== undefined
                      ? `€ ${Number(accommodation.price).toFixed(2)}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {booking ? (
                      <a
                        href={booking.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {booking.label}
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="max-w-[260px] truncate px-3 py-3 text-muted-foreground">
                    {day.notes || accommodation?.notes || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
