import {
  AlertTriangle,
  BedDouble,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Euro,
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
  check_in_date: string | null
  check_out_date: string | null
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
  warning = false,
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

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetweenInclusive(start: string, end: string): number {
  const startDate = parseDateOnly(start)
  const endDate = parseDateOnly(end)

  if (!startDate || !endDate || endDate < startDate) return 0

  return (
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / 86_400_000
    ) + 1
  )
}

function calculateBookedNights(
  accommodations: Accommodation[]
): number {
  return accommodations.reduce((total, accommodation) => {
    const checkIn = parseDateOnly(accommodation.check_in_date)
    if (!checkIn) return total

    const checkOut =
      parseDateOnly(accommodation.check_out_date) ?? checkIn

    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / 86_400_000
    )

    return total + Math.max(nights, 1)
  }, 0)
}

export function TripOverview({
  title,
  startDate,
  endDate,
  tripDays,
  accommodations,
  expenses,
}: TripOverviewProps) {
  const totalTripDays = daysBetweenInclusive(startDate, endDate)
  const expectedNights = Math.max(totalTripDays - 1, 0)

  const plannedDays = tripDays.length
  const bookedHotels = accommodations.length
  const bookedNights = calculateBookedNights(accommodations)
  const missingNights = Math.max(expectedNights - bookedNights, 0)

  const hotelsWithoutLink = accommodations.filter(
    (accommodation) =>
      !accommodation.booking_url?.trim() &&
      !accommodation.airbnb_url?.trim()
  ).length

  const totalPlannedKm = tripDays.reduce(
    (sum, day) => sum + Number(day.planned_km || 0),
    0
  )

  const totalHotelCost = accommodations.reduce(
    (sum, accommodation) =>
      sum + Number(accommodation.price || 0),
    0
  )

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  )

  const totalPlannedCost = totalHotelCost + totalExpenses

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
          value={`${plannedDays}/${totalTripDays || '—'}`}
          warning={totalTripDays > 0 && plannedDays < totalTripDays}
        />

        <StatBox
          icon={<Building2 />}
          label="Hotel prenotati"
          value={`${bookedHotels}`}
        />

        <StatBox
          icon={<BedDouble />}
          label="Notti prenotate"
          value={`${bookedNights}/${expectedNights || '—'}`}
          warning={missingNights > 0}
        />

        <StatBox
          icon={<AlertTriangle />}
          label="Notti da prenotare"
          value={`${missingNights}`}
          warning={missingNights > 0}
        />

        <StatBox
          icon={<Route />}
          label="Km previsti"
          value={`${totalPlannedKm.toFixed(1)} km`}
        />

        <StatBox
          icon={<Euro />}
          label="Costo hotel"
          value={`€ ${totalHotelCost.toFixed(2)}`}
        />

        <StatBox
          icon={<CircleDollarSign />}
          label="Spese registrate"
          value={`€ ${totalExpenses.toFixed(2)}`}
        />

        <StatBox
          icon={<CircleDollarSign />}
          label="Totale pianificato"
          value={`€ ${totalPlannedCost.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:gap-4">
        <StatBox
          icon={<AlertTriangle />}
          label="Hotel senza link"
          value={`${hotelsWithoutLink}`}
          warning={hotelsWithoutLink > 0}
        />

        <div className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-4">
          <p className="text-[8px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
            Stato pianificazione
          </p>
          <p className="mt-2 text-[10px] font-bold leading-relaxed text-foreground sm:text-sm">
            {missingNights === 0
              ? 'Tutte le notti risultano coperte.'
              : `Mancano ancora ${missingNights} ${
                  missingNights === 1 ? 'notte' : 'notti'
                } da prenotare.`}
          </p>
        </div>
      </div>
    </div>
  )
}
