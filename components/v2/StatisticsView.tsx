'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BarChart3,
  Bike,
  CalendarDays,
  Euro,
  Gauge,
  Hotel,
  Loader2,
  MapPinned,
  Receipt,
  Route,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type TripRow = {
  id: string
  title: string
  trip_date: string | null
  trip_end_date: string | null
  total_km: number | null
  moving_time_minutes: number | null
  average_moving_speed_kmh: number | null
}

type ExpenseRow = {
  trip_id: string
  category_id: number
  amount: number | null
}

type CategoryRow = {
  id: number
  name: string
}

type TripDayRow = {
  id: string
  trip_id: string
}

type AccommodationRow = {
  trip_day_id: string
  price: number | null
  check_in_date: string | null
  check_out_date: string | null
}

type StatisticsData = {
  trips: TripRow[]
  expenses: ExpenseRow[]
  categories: CategoryRow[]
  tripDays: TripDayRow[]
  accommodations: AccommodationRow[]
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('it-IT', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

function countTripDays(
  startDate: string | null,
  endDate: string | null,
): number {
  if (!startDate) return 0

  const start = new Date(`${startDate.slice(0, 10)}T12:00:00`)
  const end = endDate
    ? new Date(`${endDate.slice(0, 10)}T12:00:00`)
    : start

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return 0
  }

  return (
    Math.floor(
      (end.getTime() - start.getTime()) / 86_400_000,
    ) + 1
  )
}

function countNights(
  checkIn: string | null,
  checkOut: string | null,
): number {
  if (!checkIn || !checkOut) return checkIn ? 1 : 0

  const start = new Date(`${checkIn.slice(0, 10)}T12:00:00`)
  const end = new Date(`${checkOut.slice(0, 10)}T12:00:00`)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime())
  ) {
    return 1
  }

  return Math.max(
    1,
    Math.round(
      (end.getTime() - start.getTime()) / 86_400_000,
    ),
  )
}

export function StatisticsView() {
  const [data, setData] = useState<StatisticsData>({
    trips: [],
    expenses: [],
    categories: [],
    tripDays: [],
    accommodations: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadStatistics = async () => {
      setLoading(true)
      setLoadError(null)

      try {
        const [
          tripsResult,
          expensesResult,
          categoriesResult,
          daysResult,
          accommodationsResult,
        ] = await Promise.all([
          supabase
            .from('trips')
            .select(
              'id, title, trip_date, trip_end_date, total_km, moving_time_minutes, average_moving_speed_kmh',
            )
            .order('trip_date', { ascending: true }),
          supabase
            .from('expenses')
            .select('trip_id, category_id, amount'),
          supabase
            .from('expense_categories')
            .select('id, name')
            .order('id', { ascending: true }),
          supabase
            .from('trip_days')
            .select('id, trip_id'),
          supabase
            .from('accommodations')
            .select(
              'trip_day_id, price, check_in_date, check_out_date',
            ),
        ])

        const firstError =
          tripsResult.error ||
          expensesResult.error ||
          categoriesResult.error ||
          daysResult.error ||
          accommodationsResult.error

        if (firstError) {
          throw firstError
        }

        if (!cancelled) {
          setData({
            trips: (tripsResult.data || []) as TripRow[],
            expenses: (expensesResult.data || []) as ExpenseRow[],
            categories: (categoriesResult.data || []) as CategoryRow[],
            tripDays: (daysResult.data || []) as TripDayRow[],
            accommodations:
              (accommodationsResult.data || []) as AccommodationRow[],
          })
        }
      } catch (error) {
        console.error('Errore caricamento statistiche:', error)

        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Impossibile caricare le statistiche.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadStatistics()

    return () => {
      cancelled = true
    }
  }, [])

  const statistics = useMemo(() => {
    const totalKm = data.trips.reduce(
      (sum, trip) => sum + Number(trip.total_km || 0),
      0,
    )

    const totalTravelDays = data.trips.reduce(
      (sum, trip) =>
        sum + countTripDays(trip.trip_date, trip.trip_end_date),
      0,
    )

    const totalMovingMinutes = data.trips.reduce(
      (sum, trip) =>
        sum + Number(trip.moving_time_minutes || 0),
      0,
    )

    const totalExpenses = data.expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0,
    )

    const totalHotelCost = data.accommodations.reduce(
      (sum, accommodation) =>
        sum + Number(accommodation.price || 0),
      0,
    )

    const totalNights = data.accommodations.reduce(
      (sum, accommodation) =>
        sum +
        countNights(
          accommodation.check_in_date,
          accommodation.check_out_date,
        ),
      0,
    )

    const weightedSpeedNumerator = data.trips.reduce(
      (sum, trip) => {
        const speed = Number(
          trip.average_moving_speed_kmh || 0,
        )
        const minutes = Number(trip.moving_time_minutes || 0)

        return sum + speed * minutes
      },
      0,
    )

    const averageSpeed =
      totalMovingMinutes > 0
        ? weightedSpeedNumerator / totalMovingMinutes
        : 0

    const dayToTrip = new Map(
      data.tripDays.map((day) => [day.id, day.trip_id]),
    )

    const hotelCostByTrip = new Map<string, number>()

    for (const accommodation of data.accommodations) {
      const tripId = dayToTrip.get(accommodation.trip_day_id)
      if (!tripId) continue

      hotelCostByTrip.set(
        tripId,
        (hotelCostByTrip.get(tripId) || 0) +
          Number(accommodation.price || 0),
      )
    }

    const expenseByTrip = new Map<string, number>()

    for (const expense of data.expenses) {
      expenseByTrip.set(
        expense.trip_id,
        (expenseByTrip.get(expense.trip_id) || 0) +
          Number(expense.amount || 0),
      )
    }

    const yearlyMap = new Map<
      number,
      {
        year: number
        trips: number
        km: number
        costs: number
      }
    >()

    for (const trip of data.trips) {
      if (!trip.trip_date) continue

      const year = Number(trip.trip_date.slice(0, 4))
      if (!Number.isFinite(year)) continue

      const current = yearlyMap.get(year) || {
        year,
        trips: 0,
        km: 0,
        costs: 0,
      }

      current.trips += 1
      current.km += Number(trip.total_km || 0)
      current.costs +=
        (expenseByTrip.get(trip.id) || 0) +
        (hotelCostByTrip.get(trip.id) || 0)

      yearlyMap.set(year, current)
    }

    const yearly = [...yearlyMap.values()].sort(
      (a, b) => b.year - a.year,
    )

    const categoryTotals = data.categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        total: data.expenses
          .filter(
            (expense) =>
              Number(expense.category_id) ===
              Number(category.id),
          )
          .reduce(
            (sum, expense) =>
              sum + Number(expense.amount || 0),
            0,
          ),
      }))
      .filter((category) => category.total > 0)
      .sort((a, b) => b.total - a.total)

    const longestTrips = [...data.trips]
      .sort(
        (a, b) =>
          Number(b.total_km || 0) -
          Number(a.total_km || 0),
      )
      .slice(0, 5)

    return {
      totalKm,
      totalTravelDays,
      totalMovingMinutes,
      totalExpenses,
      totalHotelCost,
      grandTotal: totalExpenses + totalHotelCost,
      totalNights,
      averageSpeed,
      yearly,
      categoryTotals,
      longestTrips,
      averageCostPerKm:
        totalKm > 0
          ? (totalExpenses + totalHotelCost) / totalKm
          : 0,
      averageKmPerTrip:
        data.trips.length > 0
          ? totalKm / data.trips.length
          : 0,
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Calcolo statistiche…
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="text-sm font-black text-destructive">
          Statistiche non disponibili
        </h2>
        <p className="mt-2 text-[10px] text-muted-foreground sm:text-xs">
          {loadError}
        </p>
      </div>
    )
  }

  const maxYearKm = Math.max(
    1,
    ...statistics.yearly.map((item) => item.km),
  )

  const maxCategoryTotal = Math.max(
    1,
    ...statistics.categoryTotals.map(
      (category) => category.total,
    ),
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-zinc-950 via-black to-amber-950/70 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <BarChart3 className="size-5" />
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                Versione 2.1 · Explorer
              </p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-3xl">
                Le tue avventure in numeri
              </h2>
              <p className="mt-2 max-w-2xl text-[10px] leading-relaxed text-zinc-300 sm:text-sm">
                Chilometri, giornate, pernottamenti e costi calcolati
                automaticamente dai viaggi già archiviati.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
        {[
          {
            label: 'Viaggi',
            value: String(data.trips.length),
            icon: Bike,
          },
          {
            label: 'Km percorsi',
            value: formatNumber(statistics.totalKm),
            suffix: 'km',
            icon: Route,
          },
          {
            label: 'Giorni in viaggio',
            value: String(statistics.totalTravelDays),
            icon: CalendarDays,
          },
          {
            label: 'Notti',
            value: String(statistics.totalNights),
            icon: Hotel,
          },
          {
            label: 'Velocità media',
            value:
              statistics.averageSpeed > 0
                ? formatNumber(statistics.averageSpeed, 1)
                : '—',
            suffix:
              statistics.averageSpeed > 0 ? 'km/h' : undefined,
            icon: Gauge,
          },
          {
            label: 'Costo totale',
            value: formatMoney(statistics.grandTotal),
            icon: Euro,
          },
          {
            label: 'Costo per km',
            value: formatMoney(statistics.averageCostPerKm),
            icon: Receipt,
          },
          {
            label: 'Media per viaggio',
            value: formatNumber(
              statistics.averageKmPerTrip,
              0,
            ),
            suffix: 'km',
            icon: TrendingUp,
          },
        ].map((item) => {
          const Icon = item.icon

          return (
            <div
              key={item.label}
              className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5"
            >
              <div className="flex items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Icon className="size-4" />
                </div>

                <p className="truncate text-[8px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                  {item.label}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap items-baseline gap-1">
                <span className="break-all text-lg font-black sm:text-2xl">
                  {item.value}
                </span>
                {item.suffix && (
                  <span className="text-[8px] text-muted-foreground sm:text-[10px]">
                    {item.suffix}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <MapPinned className="size-4 text-primary" />
            <h3 className="text-xs font-black sm:text-base">
              Attività per anno
            </h3>
          </div>

          {statistics.yearly.length === 0 ? (
            <p className="mt-4 text-[10px] text-muted-foreground">
              Nessun viaggio con data disponibile.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {statistics.yearly.map((year) => (
                <div key={year.year}>
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">
                        {year.year}
                      </p>
                      <p className="text-[8px] text-muted-foreground sm:text-[10px]">
                        {year.trips} viaggi ·{' '}
                        {formatMoney(year.costs)}
                      </p>
                    </div>

                    <p className="text-xs font-black sm:text-sm">
                      {formatNumber(year.km)} km
                    </p>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.max(
                          3,
                          (year.km / maxYearKm) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <Euro className="size-4 text-primary" />
            <h3 className="text-xs font-black sm:text-base">
              Ripartizione costi
            </h3>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="flex justify-between gap-3 text-[9px] sm:text-xs">
                <span className="text-muted-foreground">
                  Pernottamenti
                </span>
                <span className="font-black">
                  {formatMoney(statistics.totalHotelCost)}
                </span>
              </div>
            </div>

            {statistics.categoryTotals.map((category) => (
              <div key={category.id}>
                <div className="flex justify-between gap-3 text-[9px] sm:text-xs">
                  <span className="truncate text-muted-foreground">
                    {category.name}
                  </span>
                  <span className="shrink-0 font-black">
                    {formatMoney(category.total)}
                  </span>
                </div>

                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${Math.max(
                        3,
                        (category.total / maxCategoryTotal) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}

            {statistics.categoryTotals.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                Nessuna spesa registrata.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2">
          <Route className="size-4 text-primary" />
          <h3 className="text-xs font-black sm:text-base">
            I viaggi più lunghi
          </h3>
        </div>

        <div className="mt-4 divide-y divide-border">
          {statistics.longestTrips.map((trip, index) => (
            <div
              key={trip.id}
              className="flex min-w-0 items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-[9px] font-black">
                {index + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-black sm:text-sm">
                  {trip.title}
                </p>
                <p className="mt-0.5 text-[8px] text-muted-foreground sm:text-[10px]">
                  {trip.trip_date
                    ? new Date(
                        `${trip.trip_date.slice(0, 10)}T12:00:00`,
                      ).toLocaleDateString('it-IT')
                    : 'Data non disponibile'}
                </p>
              </div>

              <span className="shrink-0 text-[10px] font-black sm:text-sm">
                {formatNumber(Number(trip.total_km || 0), 1)} km
              </span>
            </div>
          ))}

          {statistics.longestTrips.length === 0 && (
            <p className="py-4 text-[10px] text-muted-foreground">
              Nessun viaggio disponibile.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
