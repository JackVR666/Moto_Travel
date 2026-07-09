import { ExternalLink } from 'lucide-react'

type TripDay = {
  id: string
  day_number: number
  travel_date: string
  title: string | null
  start_city: string | null
  end_city: string | null
  planned_km: number | null
  notes: string | null
}

type Accommodation = {
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
  tripDays: TripDay[]
  accommodations: Accommodation[]
  formatDate: (iso: string | null) => string
}

export function RoadbookView({
  tripDays,
  accommodations,
  formatDate,
}: RoadbookViewProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Roadbook viaggio
        </p>
        <p className="text-xs text-muted-foreground">
          Panoramica completa di tappe, pernottamenti, costi e note.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-[1100px] w-full text-xs">
          <thead className="bg-secondary/40 text-muted-foreground uppercase text-[10px]">
            <tr>
              <th className="px-3 py-2 text-left">Tappa</th>
              <th className="px-3 py-2 text-left">Arrivo</th>
              <th className="px-3 py-2 text-left">Partenza</th>
              <th className="px-3 py-2 text-right">Km</th>
              <th className="px-3 py-2 text-left">Pernotto</th>
              <th className="px-3 py-2 text-left">Indirizzo</th>
              <th className="px-3 py-2 text-left">Check-in</th>
              <th className="px-3 py-2 text-right">Costo</th>
              <th className="px-3 py-2 text-left">Link</th>
              <th className="px-3 py-2 text-left">Note</th>
            </tr>
          </thead>

          <tbody>
            {tripDays.map((day) => {
              const dayAccommodations = accommodations.filter(
                (a) => a.trip_day_id === day.id
              )

              const firstAccommodation = dayAccommodations[0]

              return (
                <tr key={day.id} className="border-t border-border/50 odd:bg-background even:bg-secondary/10">
                  <td className="px-3 py-2 font-bold text-foreground">
                    {day.start_city || '—'} → {day.end_city || '—'}
                  </td>

                  <td className="px-3 py-2 text-muted-foreground">
                    {formatDate(day.travel_date)}
                  </td>

                  <td className="px-3 py-2 text-muted-foreground">
                    {firstAccommodation?.check_out_date
                      ? formatDate(firstAccommodation.check_out_date)
                      : '—'}
                  </td>

                  <td className="px-3 py-2 text-right font-mono">
                    {day.planned_km ? Number(day.planned_km).toFixed(0) : '—'}
                  </td>

                  <td className="px-3 py-2">
                    {firstAccommodation?.name || '—'}
                  </td>

                  <td className="px-3 py-2 text-muted-foreground max-w-[220px] truncate">
                    {firstAccommodation?.address || '—'}
                  </td>

                  <td className="px-3 py-2">
                    {firstAccommodation?.check_in_time || '—'}
                  </td>

                  <td className="px-3 py-2 text-right font-mono">
                    {firstAccommodation?.price
                      ? `€ ${Number(firstAccommodation.price).toFixed(2)}`
                      : '—'}
                  </td>

                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      {firstAccommodation?.booking_url && (
                        <a
                          href={firstAccommodation.booking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Booking <ExternalLink className="size-3" />
                        </a>
                      )}

                      {firstAccommodation?.airbnb_url && (
                        <a
                          href={firstAccommodation.airbnb_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Airbnb <ExternalLink className="size-3" />
                        </a>
                      )}

                      {!firstAccommodation?.booking_url &&
                        !firstAccommodation?.airbnb_url &&
                        '—'}
                    </div>
                  </td>

                  <td className="px-3 py-2 text-muted-foreground max-w-[260px] truncate">
                    {day.notes || firstAccommodation?.notes || '—'}
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