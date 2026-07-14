import {
  AlertTriangle,
  CalendarDays,
  Euro,
  Hotel,
  Route,
} from 'lucide-react'

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
    <div className="min-w-0 rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-4">
      <div className="flex min-w-0 items-start gap-1.5 text-muted-foreground sm:items-center sm:gap-2">
        <span className="mt-0.5 shrink-0 [&>svg]:size-3 sm:mt-0 sm:[&>svg]:size-4">
          {icon}
        </span>

        <span className="min-w-0 text-[8px] font-bold uppercase leading-tight tracking-wide sm:text-[11px] sm:tracking-wider">
          {label}
        </span>
      </div>

      <p
        className={`mt-2 break-words text-base font-black leading-tight sm:text-xl ${
          warning ? 'text-amber-500' : 'text-foreground'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function daysBetween(start: string, end: string): number {
  if (!start || !end) return 0

  const startDate = new Date(`${start}T12:00:00`)
  const endDate = new Date(`${end}T12:00:00`)

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    return 0
  }

  const difference = endDate.getTime() - startDate.getTime()

  if (difference < 0) return 0

  return Math.floor(difference / 86_400_000) + 1
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
  const expectedNights = Math.max(totalDays - 1, 0)
  const plannedDays = tripDays.length

  const totalPlannedKm = tripDays.reduce(
    (sum, day) => sum + Number(day.planned_km || 0),
    0
  )

  const hotelCost = accommodations.reduce(
    (sum, accommodation) =>
      sum + Number(accommodation.price || 0),
    0
  )

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  )

  const missingHotels = Math.max(
    expectedNights - accommodations.length,
    0
  )

  const missingBookingLinks = accommodations.filter(
    (accommodation) =>
      !accommodation.booking_url &&
      !accommodation.airbnb_url
  ).length

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          Overview viaggio
        </p>

        <h2 className="mt-1 break-words text-base font-black leading-tight text-foreground sm:text-lg">
          {title || 'Viaggio senza titolo'}
        </h2>

        <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground sm:text-xs">
          Controllo generale della pianificazione e dei costi già inseriti.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 xl:gap-4">
        <StatBox
          icon={<CalendarDays />}
          label="Giorni pianificati"
          value={`${plannedDays}/${totalDays || '—'}`}
          warning={totalDays > 0 && plannedDays < totalDays}
        />

        <StatBox
          icon={<Hotel />}
          label="Pernottamenti"
          value={`${accommodations.length}/${expectedNights || '—'}`}
          warning={missingHotels > 0}
        />

        <StatBox
          icon={<Route />}
          label="Km previsti"
          value={`${totalPlannedKm.toFixed(1)} km`}
        />

        <StatBox
          icon={<Euro />}
          label="Costo hotel"
          value={`€ ${hotelCost.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:gap-4">
        <StatBox
          icon={<Euro />}
          label="Spese registrate"
          value={`€ ${totalExpenses.toFixed(2)}`}
        />

        <StatBox
          icon={<AlertTriangle />}
          label="Link prenotazione mancanti"
          value={`${missingBookingLinks}`}
          warning={missingBookingLinks > 0}
        />
      </div>
    </div>
  )
}