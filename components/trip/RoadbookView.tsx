import { ExternalLink, MapPin } from 'lucide-react'
import { ExportTripPdfButton } from '@/components/trip/ExportTripPdfButton'

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
  free_cancellation_until: string | null
  payment_date: string | null
  pay_at_property: boolean | null
}

export type RoadbookExpense = {
  category_id: number
  amount: number
  notes?: string
  expense_date?: string
}

export type RoadbookExpenseCategory = {
  id: number
  name: string
}

type RoadbookViewProps = {
  title: string
  startDate: string
  endDate: string
  tripNotes: string
  tripDays: RoadbookTripDay[]
  accommodations: RoadbookAccommodation[]
  expenses: RoadbookExpense[]
  expenseCategories: RoadbookExpenseCategory[]
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
  title,
  startDate,
  endDate,
  tripNotes,
  tripDays,
  accommodations,
  expenses,
  expenseCategories,
  formatDate,
}: RoadbookViewProps) {
  const totalHotelCost = accommodations.reduce(
    (sum, accommodation) => sum + Number(accommodation.price || 0),
    0,
  )

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  )

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Roadbook viaggio
            </p>
            <p className="mt-1 text-[9px] text-muted-foreground sm:text-xs">
              Panoramica completa di tappe, pernottamenti, costi e note.
            </p>
          </div>

          <ExportTripPdfButton
            title={title}
            startDate={startDate}
            endDate={endDate}
            tripNotes={tripNotes}
            tripDays={tripDays}
            accommodations={accommodations}
            expenses={expenses}
            expenseCategories={expenseCategories}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-secondary/10 p-2 text-center">
            <p className="text-[7px] font-bold uppercase text-muted-foreground sm:text-[9px]">
              Km previsti
            </p>
            <p className="mt-1 text-[10px] font-black sm:text-sm">
              {tripDays
                .reduce(
                  (sum, day) => sum + Number(day.planned_km || 0),
                  0,
                )
                .toFixed(1)}
            </p>
          </div>

          <div className="rounded-lg bg-secondary/10 p-2 text-center">
            <p className="text-[7px] font-bold uppercase text-muted-foreground sm:text-[9px]">
              Hotel
            </p>
            <p className="mt-1 text-[10px] font-black sm:text-sm">
              € {totalHotelCost.toFixed(2)}
            </p>
          </div>

          <div className="rounded-lg bg-secondary/10 p-2 text-center">
            <p className="text-[7px] font-bold uppercase text-muted-foreground sm:text-[9px]">
              Spese
            </p>
            <p className="mt-1 text-[10px] font-black sm:text-sm">
              € {totalExpenses.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:hidden">
        {tripDays.map((day) => {
          const dayAccommodations = accommodations.filter(
            (item) => item.trip_day_id === day.id,
          )

          return (
            <article
              key={day.id}
              className="rounded-xl border border-border bg-card p-2.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground">
                    Giorno {day.day_number} · {formatDate(day.travel_date)}
                  </p>
                  <h3 className="mt-1 text-[11px] font-black leading-tight text-foreground">
                    {day.start_city || '—'} → {day.end_city || '—'}
                  </h3>
                  {day.title && (
                    <p className="mt-1 text-[8px] text-muted-foreground">
                      {day.title}
                    </p>
                  )}
                </div>

                {day.planned_km !== null && (
                  <span className="shrink-0 rounded border border-border bg-secondary/30 px-1.5 py-1 font-mono text-[8px] font-bold">
                    {Number(day.planned_km).toFixed(0)} km
                  </span>
                )}
              </div>

              {dayAccommodations.length === 0 ? (
                <div className="mt-2 rounded-lg border border-dashed border-border p-2">
                  <p className="text-[8px] italic text-muted-foreground">
                    Nessun pernottamento previsto.
                  </p>
                </div>
              ) : (
                dayAccommodations.map((accommodation) => {
                  const booking = bookingInfo(accommodation)
                  const mapsUrl = accommodation.address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        accommodation.address,
                      )}`
                    : null

                  return (
                    <div
                      key={accommodation.id}
                      className="mt-2 rounded-lg border border-border/60 bg-secondary/10 p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 break-words text-[9px] font-bold">
                          🏨 {accommodation.name}
                        </p>

                        {accommodation.price !== null && (
                          <span className="shrink-0 rounded bg-background px-1.5 py-0.5 font-mono text-[8px] font-bold">
                            € {Number(accommodation.price).toFixed(2)}
                          </span>
                        )}
                      </div>

                      {accommodation.address && (
                        <p className="mt-1 flex items-start gap-1 text-[8px] text-muted-foreground">
                          <MapPin className="mt-0.5 size-2.5 shrink-0" />
                          <span>{accommodation.address}</span>
                        </p>
                      )}

                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <div className="rounded bg-background p-1.5">
                          <p className="text-[6px] font-bold uppercase text-muted-foreground">
                            Check-in
                          </p>
                          <p className="mt-0.5 text-[8px] font-medium">
                            {formatDate(accommodation.check_in_date)}
                            <br />
                            {formatTime(accommodation.check_in_time)}
                          </p>
                        </div>

                        <div className="rounded bg-background p-1.5">
                          <p className="text-[6px] font-bold uppercase text-muted-foreground">
                            Check-out
                          </p>
                          <p className="mt-0.5 text-[8px] font-medium">
                            {formatDate(accommodation.check_out_date)}
                            <br />
                            {formatTime(accommodation.check_out_time)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-1.5 grid grid-cols-1 gap-1.5">
                        {accommodation.free_cancellation_until && (
                          <div className="rounded bg-background p-1.5">
                            <p className="text-[6px] font-bold uppercase text-muted-foreground">
                              Disdetta gratuita
                            </p>
                            <p className="mt-0.5 text-[8px] font-medium">
                              Entro{' '}
                              {formatDate(
                                accommodation.free_cancellation_until,
                              )}
                            </p>
                          </div>
                        )}

                        <div className="rounded bg-background p-1.5">
                          <p className="text-[6px] font-bold uppercase text-muted-foreground">
                            Pagamento
                          </p>
                          <p className="mt-0.5 text-[8px] font-medium">
                            {accommodation.pay_at_property
                              ? 'In struttura'
                              : accommodation.payment_date
                                ? `Addebito ${formatDate(
                                    accommodation.payment_date,
                                  )}`
                                : 'Non indicato'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {booking && (
                          <a
                            href={booking.href}
                            className="inline-flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[8px] font-bold"
                          >
                            {booking.label}
                            <ExternalLink className="size-2.5" />
                          </a>
                        )}

                        {mapsUrl && (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-[8px] font-bold"
                          >
                            Maps
                            <MapPin className="size-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })
              )}

              {(day.notes ||
                dayAccommodations.some((item) => item.notes)) && (
                <div className="mt-2 rounded-lg bg-secondary/10 p-2 text-[8px] text-muted-foreground">
                  {[day.notes, ...dayAccommodations.map((item) => item.notes)]
                    .filter(Boolean)
                    .join('\n')}
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm sm:block">
        <table className="min-w-[1450px] w-full text-[10px]">
          <thead className="bg-secondary/40 text-[9px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-3 text-left">Giorno</th>
              <th className="px-3 py-3 text-left">Tappa</th>
              <th className="px-3 py-3 text-left">Arrivo</th>
              <th className="px-3 py-3 text-left">Partenza</th>
              <th className="px-3 py-3 text-right">Km</th>
              <th className="px-3 py-3 text-left">Pernotto</th>
              <th className="px-3 py-3 text-left">Indirizzo</th>
              <th className="px-3 py-3 text-left">Check-in</th>
              <th className="px-3 py-3 text-left">Check-out</th>
              <th className="px-3 py-3 text-right">Costo</th>
              <th className="px-3 py-3 text-left">Disdetta</th>
              <th className="px-3 py-3 text-left">Pagamento</th>
              <th className="px-3 py-3 text-left">Link</th>
              <th className="px-3 py-3 text-left">Note</th>
            </tr>
          </thead>

          <tbody>
            {tripDays.flatMap((day) => {
              const dayAccommodations = accommodations.filter(
                (item) => item.trip_day_id === day.id,
              )

              const rows =
                dayAccommodations.length > 0
                  ? dayAccommodations
                  : [null]

              return rows.map((accommodation, index) => {
                const booking = accommodation
                  ? bookingInfo(accommodation)
                  : null

                return (
                  <tr
                    key={`${day.id}-${accommodation?.id || 'no-hotel'}`}
                    className="border-t border-border/50 odd:bg-background even:bg-secondary/10"
                  >
                    <td className="px-3 py-3 font-mono">
                      {index === 0 ? day.day_number : ''}
                    </td>
                    <td className="px-3 py-3 font-bold text-foreground">
                      {index === 0
                        ? `${day.start_city || '—'} → ${
                            day.end_city || '—'
                          }`
                        : '↳ altro pernottamento'}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {index === 0 ? formatDate(day.travel_date) : ''}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {accommodation?.check_out_date
                        ? formatDate(accommodation.check_out_date)
                        : index === 0
                          ? formatDate(day.travel_date)
                          : ''}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {index === 0 && day.planned_km !== null
                        ? Number(day.planned_km).toFixed(0)
                        : ''}
                    </td>
                    <td className="px-3 py-3">
                      {accommodation?.name || '—'}
                    </td>
                    <td className="max-w-[220px] px-3 py-3 text-muted-foreground">
                      {accommodation?.address || '—'}
                    </td>
                    <td className="px-3 py-3">
                      {accommodation
                        ? `${formatDate(
                            accommodation.check_in_date,
                          )} ${formatTime(accommodation.check_in_time)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3">
                      {accommodation
                        ? `${formatDate(
                            accommodation.check_out_date,
                          )} ${formatTime(accommodation.check_out_time)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono">
                      {accommodation?.price !== null &&
                      accommodation?.price !== undefined
                        ? `€ ${Number(accommodation.price).toFixed(2)}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {accommodation?.free_cancellation_until
                        ? formatDate(
                            accommodation.free_cancellation_until,
                          )
                        : '—'}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {accommodation?.pay_at_property
                        ? 'In struttura'
                        : accommodation?.payment_date
                          ? formatDate(accommodation.payment_date)
                          : '—'}
                    </td>
                    <td className="px-3 py-3">
                      {booking ? (
                        <a
                          href={booking.href}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {booking.label}
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="max-w-[260px] px-3 py-3 text-muted-foreground">
                      {[day.notes, accommodation?.notes]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
