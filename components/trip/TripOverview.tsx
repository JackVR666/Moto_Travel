import { CalendarDays, Hotel, Route, Euro, AlertTriangle } from 'lucide-react'

type TripDay = {
  id: string
  planned_km: number | null
}

type Accommodation = {
  id: string
  trip_day_id: string
  price: number | null
  booking_url: string | null
  airbnb_url: string | null
}

type Expense = {
  amount: number
}

type TripOverviewProps = {
  title: string
  startDate: string
  endDate: string
  tripDays: TripDay[]
  accommodations: Accommodation[]
  expenses: Expense[]
}

function StatBox({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-black ${warning ? 'text-amber-500' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  )
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return 0

  const startDate = new Date(start)
  const endDate = new Date(end)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0

  const diff = endDate.getTime() - startDate.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}

export function TripOverview({
  title,
  startDate,
  endDate,
  tripDays,
  accommodations,
  expenses,
}: TripOverviewProps) {
  const totalDays = daysBetween(startDate, endDate)
  const plannedDays = tripDays.length

  const totalPlannedKm = tripDays.reduce(
    (sum, day) => sum + Number(day.planned_km || 0),
    0
  )

  const hotelCost = accommodations.reduce(
    (sum, acc) => sum + Number(acc.price || 0),
    0
  )

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0
  )

  const expectedNights = Math.max(totalDays - 1, 0)
  const missingHotels = Math.max(expectedNights - accommodations.length, 0)

  const missingBookingLinks = accommodations.filter(
    (acc) => !acc.booking_url && !acc.airbnb_url
  ).length

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Overview viaggio
        </p>
        <h2 className="mt-1 text-lg font-black text-foreground">
          {title || 'Viaggio senza titolo'}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Controllo generale della pianificazione e dei costi già inseriti.
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatBox
          icon={<CalendarDays className="size-4" />}
          label="Giorni pianificati"
          value={`${plannedDays}/${totalDays || '—'}`}
          warning={totalDays > 0 && plannedDays < totalDays}
        />

        <StatBox
          icon={<Hotel className="size-4" />}
          label="Pernottamenti"
          value={`${accommodations.length}/${expectedNights || '—'}`}
          warning={missingHotels > 0}
        />

        <StatBox
          icon={<Route className="size-4" />}
          label="Km previsti"
          value={`${totalPlannedKm.toFixed(1)} km`}
        />

        <StatBox
          icon={<Euro className="size-4" />}
          label="Costo hotel"
          value={`€ ${hotelCost.toFixed(2)}`}
        />
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <StatBox
          icon={<Euro className="size-4" />}
          label="Spese registrate"
          value={`€ ${totalExpenses.toFixed(2)}`}
        />

        <StatBox
          icon={<AlertTriangle className="size-4" />}
          label="Link prenotazione mancanti"
          value={`${missingBookingLinks}`}
          warning={missingBookingLinks > 0}
        />
      </div>
    </div>
  )
}