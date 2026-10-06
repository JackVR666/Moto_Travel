'use client'

import { ChevronDown, ChevronUp, Plus, Route, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { PlannedMapPoint } from '@/components/trip/PlanningMap'
import { Button } from '@/components/ui/button'
import { TripDayDiaryCard } from '@/components/trip/TripDayDiaryCard'
const PlanningMap = dynamic(() => import('@/components/trip/PlanningMap'), { ssr: false })

import {
  AccommodationCard,
  type Accommodation,
} from '@/components/trip/accommodation-card'


type TripDay = {
    id: string
    day_number: number
    travel_date: string
    title: string | null
    notes: string | null
    start_city: string | null
    end_city: string | null
    planned_km: number | null
    display_order: number | null
}

type PlanningTabProps = {
    editingDayId: string | null
    startEditTripDay: (day: TripDay) => void
    updateTripDay: () => void
    editingTripId: string | null
    tripDays: TripDay[]
    accommodations: Accommodation[]
    
    editingAccommodationId: string | null
    startEditAccommodation: (acc: Accommodation) => void
    updateAccommodation: () => void
    deleteAccommodation: (id: string) => void

    selectedDayForAccommodation: string | null
    setSelectedDayForAccommodation: (value: string | null) => void

    accommodationName: string
    setAccommodationName: (value: string) => void

    accommodationBookingUrl: string
    setAccommodationBookingUrl: (value: string) => void

    accommodationAirbnbUrl: string
    setAccommodationAirbnbUrl: (value: string) => void

    accommodationPrice: string
    setAccommodationPrice: (value: string) => void

    accommodationParking: boolean
    setAccommodationParking: (value: boolean) => void

    accommodationNotes: string
    setAccommodationNotes: (value: string) => void

    accommodationAddress: string
    setAccommodationAddress: (value: string) => void

    accommodationCheckInDate: string
    setAccommodationCheckInDate: (value: string) => void

    accommodationCheckOutDate: string
    setAccommodationCheckOutDate: (value: string) => void

    accommodationCheckInTime: string
    setAccommodationCheckInTime: (value: string) => void

    accommodationCheckOutTime: string
    setAccommodationCheckOutTime: (value: string) => void

    accommodationCancellationDate: string
    setAccommodationCancellationDate: (value: string) => void

    accommodationPaymentDate: string
    setAccommodationPaymentDate: (value: string) => void

    accommodationPayAtProperty: boolean
    setAccommodationPayAtProperty: (value: boolean) => void

    accommodationBreakfastIncluded: boolean
    setAccommodationBreakfastIncluded: (value: boolean) => void

    addAccommodation: () => void

    dayDate: string
    setDayDate: (value: string) => void

    dayStartCity: string
    setDayStartCity: (value: string) => void

    dayEndCity: string
    setDayEndCity: (value: string) => void

    dayPlannedKm: string
    setDayPlannedKm: (value: string) => void

    dayTitle: string
    setDayTitle: (value: string) => void

    dayNotes: string
    setDayNotes: (value: string) => void

    addTripDay: () => void
    removeTripDay: (dayId: string) => void
    formatDate: (iso: string | null) => string
}


export function PlanningTab({
    editingTripId,
    tripDays,
    accommodations,
    selectedDayForAccommodation,
    setSelectedDayForAccommodation,
    accommodationName,
    setAccommodationName,
    accommodationBookingUrl,
    setAccommodationBookingUrl,
    accommodationAirbnbUrl,
    setAccommodationAirbnbUrl,
    accommodationPrice,
    setAccommodationPrice,
    accommodationParking,
    setAccommodationParking,
    accommodationNotes,
    setAccommodationNotes,
    accommodationAddress,
    setAccommodationAddress,
    accommodationCheckInDate,
    setAccommodationCheckInDate,
    accommodationCheckOutDate,
    setAccommodationCheckOutDate,
    accommodationCheckInTime,
    setAccommodationCheckInTime,
    accommodationCheckOutTime,
    setAccommodationCheckOutTime,
    accommodationCancellationDate,
    setAccommodationCancellationDate,
    accommodationPaymentDate,
    setAccommodationPaymentDate,
    accommodationPayAtProperty,
    setAccommodationPayAtProperty,
    accommodationBreakfastIncluded,
    setAccommodationBreakfastIncluded,
    addAccommodation,
    dayDate,
    setDayDate,
    dayStartCity,
    setDayStartCity,
    dayEndCity,
    setDayEndCity,
    dayPlannedKm,
    setDayPlannedKm,
    dayTitle,
    setDayTitle,
    dayNotes,
    setDayNotes,
    addTripDay,
    removeTripDay,
    formatDate,
    editingDayId,
    startEditTripDay,
    updateTripDay,
    editingAccommodationId,
    startEditAccommodation,
    updateAccommodation,
    deleteAccommodation,
}: PlanningTabProps) {
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null)
  const [mapPoints, setMapPoints] = useState<PlannedMapPoint[]>([])
  const [plannedRoute, setPlannedRoute] = useState<[number, number][]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    if (
      expandedDayId &&
      !tripDays.some((day) => day.id === expandedDayId)
    ) {
      setExpandedDayId(null)
    }
  }, [tripDays, expandedDayId])

  const toggleDay = (dayId: string) => {
    setExpandedDayId((current) =>
      current === dayId ? null : dayId
    )
  }

  const sortedTripDays = [...tripDays].sort(
    (a, b) => Number(a.day_number) - Number(b.day_number)
  )

  const itineraryCities = useMemo(() => {
    const result: { label: string; dayNumber: number; kind: 'start' | 'end' }[] = []
    sortedTripDays.forEach((day) => {
      const start = day.start_city?.trim()
      const end = day.end_city?.trim()
      if (start && !result.some((item) => item.label.toLowerCase() === start.toLowerCase())) {
        result.push({ label: start, dayNumber: Number(day.day_number), kind: 'start' })
      }
      if (end && !result.some((item) => item.label.toLowerCase() === end.toLowerCase())) {
        result.push({ label: end, dayNumber: Number(day.day_number), kind: 'end' })
      }
    })
    return result
  }, [tripDays])

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (itineraryCities.length === 0) {
        setMapPoints([])
        setPlannedRoute([])
        setMapError(null)
        return
      }

      setMapLoading(true)
      setMapError(null)
      try {
        const located: PlannedMapPoint[] = []
        for (const city of itineraryCities) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(city.label)}`,
            { headers: { 'Accept-Language': 'it' } }
          )
          if (!response.ok) throw new Error('Geocodifica non disponibile')
          const matches = await response.json()
          if (matches?.[0]) {
            located.push({
              ...city,
              lat: Number(matches[0].lat),
              lon: Number(matches[0].lon),
            })
          }
        }
        if (cancelled) return
        setMapPoints(located)

        if (located.length > 1) {
          const coordinates = located.map((p) => `${p.lon},${p.lat}`).join(';')
          const routeResponse = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`
          )
          if (routeResponse.ok) {
            const routeData = await routeResponse.json()
            const coords = routeData?.routes?.[0]?.geometry?.coordinates ?? []
            if (!cancelled) setPlannedRoute(coords.map((c: number[]) => [c[1], c[0]] as [number, number]))
          } else {
            setPlannedRoute([])
          }
        } else {
          setPlannedRoute([])
        }

        if (located.length < itineraryCities.length) {
          setMapError('Alcune località non sono state trovate. Prova a specificare meglio città o nazione.')
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Errore mappa pianificazione:', error)
          setMapError('Non riesco a calcolare la mappa in questo momento.')
        }
      } finally {
        if (!cancelled) setMapLoading(false)
      }
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [itineraryCities])

  const getCoveredDays = (accommodation: Accommodation): TripDay[] => {
    const linkedDay = sortedTripDays.find(
      (day) => day.id === accommodation.trip_day_id
    )

    const checkInDate =
      accommodation.check_in_date?.slice(0, 10) ||
      linkedDay?.travel_date?.slice(0, 10) ||
      null

    const checkOutDate = accommodation.check_out_date?.slice(0, 10) || null

    if (!checkInDate) {
      return linkedDay ? [linkedDay] : []
    }

    const covered = sortedTripDays.filter((day) => {
      const date = day.travel_date?.slice(0, 10)
      if (!date) return false

      if (!checkOutDate) {
        return date === checkInDate
      }

      return date >= checkInDate && date < checkOutDate
    })

    return covered.length > 0
      ? covered
      : linkedDay
        ? [linkedDay]
        : []
  }

  const getStayDayLabel = (accommodation: Accommodation): string => {
    const linkedDay = sortedTripDays.find(
      (day) => day.id === accommodation.trip_day_id
    )

    if (!linkedDay) return ''

    const firstDayNumber = Number(linkedDay.day_number)

    if (!Number.isFinite(firstDayNumber)) return ''

    const checkInDate = accommodation.check_in_date
      ? new Date(`${accommodation.check_in_date.slice(0, 10)}T12:00:00`)
      : null

    const checkOutDate = accommodation.check_out_date
      ? new Date(`${accommodation.check_out_date.slice(0, 10)}T12:00:00`)
      : null

    let numberOfNights = 1

    if (
      checkInDate &&
      checkOutDate &&
      !Number.isNaN(checkInDate.getTime()) &&
      !Number.isNaN(checkOutDate.getTime())
    ) {
      numberOfNights = Math.max(
        1,
        Math.round(
          (checkOutDate.getTime() - checkInDate.getTime()) /
            86_400_000
        )
      )
    }

    const coveredDayNumbers = Array.from(
      { length: numberOfNights },
      (_, index) => firstDayNumber + index
    )

    if (coveredDayNumbers.length === 1) {
      return `Giorno ${coveredDayNumbers[0]}`
    }

    return `Giorni ${coveredDayNumbers.join('/')}`
  }

  const getCoveringAccommodation = (
    day: TripDay
  ): Accommodation | undefined =>
    accommodations.find((accommodation) =>
      getCoveredDays(accommodation).some(
        (coveredDay) => coveredDay.id === day.id
      )
    )

  return (
  <div className="space-y-4">
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Route className="size-4 text-primary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Pianificazione viaggio
        </h4>
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        Inserisci le giornate del viaggio: data, tappa prevista, hotel o appunti generali.
      </p>

      {!editingTripId && (
        <div className="rounded-lg border border-dashed border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
          Per aggiungere le giornate devi prima salvare il viaggio nel cloud.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/40 bg-secondary/10 p-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Data</span>
          <input
            type="date"
            value={dayDate}
            onChange={(e) => setDayDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none"
          />
        </div>

        <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Partenza</span>
            <input
                type="text"
                placeholder="Verona"
                value={dayStartCity}
                onChange={(e) => setDayStartCity(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none"
            />
            </div>

            <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Arrivo</span>
            <input
                type="text"
                placeholder="Lienz"
                value={dayEndCity}
                onChange={(e) => setDayEndCity(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none"
            />
            </div>

            <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Km previsti</span>
            <input
                type="number"
                step="0.1"
                placeholder="248"
                value={dayPlannedKm}
                onChange={(e) => setDayPlannedKm(e.target.value)}
                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none"
            />
            </div>

        <div className="space-y-0.5 sm:col-span-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Titolo tappa</span>
          <input
            type="text"
            placeholder="Es. Verona → Lienz"
            value={dayTitle}
            onChange={(e) => setDayTitle(e.target.value)}
            className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none"
          />
        </div>

        <div className="space-y-0.5 sm:col-span-3">
          <span className="text-[10px] uppercase font-bold text-muted-foreground">Note</span>
          <textarea
            value={dayNotes}
            onChange={(e) => setDayNotes(e.target.value)}
            placeholder="Hotel previsto, strade da fare, cose da vedere..."
            rows={3}
            className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none resize-none"
          />
        </div>

        <div className="sm:col-span-3">
          <Button
            type="button"
            onClick={editingDayId ? updateTripDay : addTripDay}
            disabled={!editingTripId}
            size="sm"
            className="h-8 px-3 font-bold text-xs gap-1 rounded-md"
          >
            <Plus className="size-3.5" />
            {editingDayId ? 'Aggiorna giornata' : 'Aggiungi giornata'}
          </Button>
        </div>
      </div>
    </div>

    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <Route className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Mappa itinerario pianificato</h4>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Vista grafica delle tappe pianificate con percorso stradale previsto. Questa sezione è sempre visibile tra l'inserimento della giornata e l'elenco delle giornate.</p>
        </div>
        {mapLoading && <span className="text-[9px] font-bold text-primary">Calcolo percorso…</span>}
      </div>

      {itineraryCities.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/5 px-4 text-center text-[11px] text-muted-foreground">
          Inserisci Partenza e Arrivo nelle giornate per creare automaticamente la mappa del viaggio.
        </div>
      ) : (
        <>
          <div className="h-[300px] overflow-hidden rounded-xl border border-border bg-secondary/10 sm:h-[420px]">
            {mapPoints.length > 0 ? (
              <PlanningMap points={mapPoints} route={plannedRoute} />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
                {mapLoading ? 'Sto localizzando le tappe…' : 'Nessuna località trovata.'}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {itineraryCities.map((city, index) => (
              <span key={`${city.label}-${index}`} className="rounded-full border border-border bg-secondary/20 px-2 py-1 text-[9px] font-bold text-foreground">
                {index + 1}. {city.label}
              </span>
            ))}
          </div>
          {mapError && <p className="text-[10px] text-amber-500">{mapError}</p>}
          <p className="text-[9px] text-muted-foreground">Mappa OpenStreetMap · percorso stradale calcolato con OSRM. Il percorso è pianificato e può differire da quello realmente percorso/registrato dal GPX.</p>
        </>
      )}
    </div>

    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Giornate pianificate ({tripDays.length})
      </h4>

      {tripDays.length === 0 ? (
        <p className="text-xs text-muted-foreground italic text-center py-6 bg-secondary/5 rounded-lg border border-dashed border-border">
          Nessuna giornata pianificata.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/10 px-3 py-2">
            <p className="text-[8px] text-muted-foreground sm:text-[10px]">
              Clicca su una giornata per visualizzare tutti i dettagli.
            </p>

            <button
              type="button"
              onClick={() => setExpandedDayId(null)}
              disabled={!expandedDayId}
              className="h-7 shrink-0 rounded-md border border-border bg-background px-2.5 text-[8px] font-bold text-muted-foreground hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 sm:text-[10px]"
            >
              Chiudi giornata
            </button>
          </div>

          {sortedTripDays.map((day) => {
            const linkedAccommodations = accommodations.filter(
              (accommodation) => accommodation.trip_day_id === day.id
            )
            const coveringAccommodation = getCoveringAccommodation(day)
            const isCoveredByAnotherDay =
              coveringAccommodation &&
              coveringAccommodation.trip_day_id !== day.id
            const expanded = expandedDayId === day.id

            return (
            <div
              key={day.id}
              className="overflow-hidden rounded-lg border border-border/50 bg-background text-xs shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleDay(day.id)}
                className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-secondary/20 sm:px-4"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-[10px] font-black text-primary-foreground sm:size-10 sm:text-xs">
                  {day.day_number}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[10px] font-black text-foreground sm:text-sm">
                      Giorno {day.day_number}
                    </span>

                    <span className="text-[8px] text-muted-foreground sm:text-[10px]">
                      {formatDate(day.travel_date)}
                    </span>

                    {linkedAccommodations.length > 0 && (
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-emerald-500 sm:text-[8px]">
                        {linkedAccommodations.length === 1
                          ? 'Pernottamento'
                          : `${linkedAccommodations.length} pernottamenti`}
                      </span>
                    )}

                    {isCoveredByAnotherDay && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-wider text-amber-500 sm:text-[8px]">
                        Soggiorno già coperto
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 truncate text-[9px] font-bold text-foreground/90 sm:text-xs">
                    {day.title || 'Giornata senza titolo'}
                  </p>

                  {(day.start_city || day.end_city) && (
                    <p className="mt-0.5 truncate text-[8px] text-muted-foreground sm:text-[10px]">
                      {day.start_city || '—'} → {day.end_city || '—'}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {day.planned_km !== null &&
                    day.planned_km !== undefined && (
                      <span className="hidden text-[9px] font-bold text-muted-foreground sm:inline">
                        {Number(day.planned_km).toFixed(0)} km
                      </span>
                    )}

                  {expanded ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-border/60 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border/30">
                      Giorno {day.day_number}
                    </span>
                    <span className="font-mono text-[10px] bg-secondary px-1.5 py-0.5 rounded border border-border/30">
                      {formatDate(day.travel_date)}
                    </span>
                  </div>

                  <p className="font-bold text-sm text-foreground">
                    {day.title || 'Giornata senza titolo'}
                  </p>

                {(day.start_city || day.end_city || day.planned_km) && (
                <p className="text-[11px] text-muted-foreground">
                    {day.start_city || '—'} → {day.end_city || '—'}
                    {day.planned_km ? ` • ${Number(day.planned_km).toFixed(1)} km previsti` : ''}
                </p>
                )}

                  {day.notes && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                      {day.notes}
                    </p>
                  )}
                  
                  {linkedAccommodations.map((accommodation) => (
                    <AccommodationCard
                      key={accommodation.id}
                      accommodation={accommodation}
                      formatDate={formatDate}
                      onEdit={startEditAccommodation}
                      onDelete={deleteAccommodation}
                      stayDayLabel={getStayDayLabel(accommodation)}
                    />
                  ))}

                  {isCoveredByAnotherDay && coveringAccommodation && (
                    <div className="mt-2 rounded-lg border border-border/50 bg-secondary/10 p-2 text-[9px] text-muted-foreground sm:text-[11px]">
                      🏨 Giornata già coperta da{' '}
                      <span className="font-bold text-foreground">
                        {coveringAccommodation.name}
                      </span>{' '}
                      ({getStayDayLabel(coveringAccommodation)})
                    </div>
                  )}

                  {!coveringAccommodation && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDayForAccommodation(day.id)
                        setAccommodationCheckInDate(day.travel_date || '')
                      }}
                      className="mt-2 h-10 w-full rounded-md text-xs sm:h-8 sm:w-auto sm:text-[11px]"
                    >
                      + Pernottamento
                    </Button>
                  )}

                    {selectedDayForAccommodation === day.id && (
                    <div className="mt-3 rounded-lg border border-border bg-secondary/10 p-3 space-y-2">
                        <p className="text-[11px] font-bold uppercase text-muted-foreground">
                        Nuovo pernottamento
                        </p>

                        <input
                            type="text"
                            placeholder="Nome struttura"
                            value={accommodationName}
                            onChange={(e) => setAccommodationName(e.target.value)}
                            className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                        />

                        <input
                            type="text"
                            placeholder="Indirizzo"
                            value={accommodationAddress}
                            onChange={(e) => setAccommodationAddress(e.target.value)}
                            className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={accommodationCheckInDate}
                                onChange={(e) => setAccommodationCheckInDate(e.target.value)}
                                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                            />

                            <input
                                type="date"
                                value={accommodationCheckOutDate}
                                onChange={(e) => setAccommodationCheckOutDate(e.target.value)}
                                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                            />

                            <input
                                type="time"
                                value={accommodationCheckInTime}
                                onChange={(e) => setAccommodationCheckInTime(e.target.value)}
                                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                            />

                            <input
                                type="time"
                                value={accommodationCheckOutTime}
                                onChange={(e) => setAccommodationCheckOutTime(e.target.value)}
                                className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                            />
                            </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground sm:text-[10px]">
                              Disdetta gratuita entro
                            </span>
                            <input
                              type="date"
                              value={accommodationCancellationDate}
                              onChange={(e) => setAccommodationCancellationDate(e.target.value)}
                              className="w-full rounded-md border border-border bg-background p-1.5 text-[10px] text-foreground sm:text-xs"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-[9px] font-bold uppercase text-muted-foreground sm:text-[10px]">
                              Data addebito
                            </span>
                            <input
                              type="date"
                              value={accommodationPaymentDate}
                              onChange={(e) => setAccommodationPaymentDate(e.target.value)}
                              disabled={accommodationPayAtProperty}
                              className="w-full rounded-md border border-border bg-background p-1.5 text-[10px] text-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:text-xs"
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-[10px] text-foreground sm:text-xs">
                          <input
                            type="checkbox"
                            checked={accommodationPayAtProperty}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setAccommodationPayAtProperty(checked)
                              if (checked) setAccommodationPaymentDate('')
                            }}
                          />
                          Pagamento in struttura
                        </label>

                        <input
                        type="url"
                        placeholder="Link Booking"
                        value={accommodationBookingUrl}
                        onChange={(e) => setAccommodationBookingUrl(e.target.value)}
                        className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                        />

                        <input
                        type="url"
                        placeholder="Link Airbnb"
                        value={accommodationAirbnbUrl}
                        onChange={(e) => setAccommodationAirbnbUrl(e.target.value)}
                        className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                        />

                        <input
                        type="number"
                        step="0.01"
                        placeholder="Prezzo"
                        value={accommodationPrice}
                        onChange={(e) => setAccommodationPrice(e.target.value)}
                        className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs"
                        />

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={accommodationParking}
                              onChange={(e) => setAccommodationParking(e.target.checked)}
                            />
                            Parcheggio moto
                          </label>

                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={accommodationBreakfastIncluded}
                              onChange={(e) =>
                                setAccommodationBreakfastIncluded(e.target.checked)
                              }
                            />
                            Colazione inclusa
                          </label>
                        </div>

                        <textarea
                        placeholder="Note"
                        value={accommodationNotes}
                        onChange={(e) => setAccommodationNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs resize-none"
                        />


                        <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={editingAccommodationId ? updateAccommodation : addAccommodation} className="h-8 text-xs">
                            {editingAccommodationId ? 'Aggiorna' : 'Salva'}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDayForAccommodation(null)}
                            className="h-8 text-xs"
                        >
                            Annulla
                        </Button>
                        </div>
                    </div>
                    )}

                  {editingTripId && (
                    <TripDayDiaryCard
                      tripId={editingTripId}
                      day={day}
                      formatDate={formatDate}
                    />
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditTripDay(day)}
                    className="rounded-md border border-border px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:text-primary"
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    onClick={() => removeTripDay(day.id)}
                    className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Elimina giornata"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                  </div>
                </div>
              )}
            </div>
            )
          })}
        </div>
      )}
    </div>
  </div>

 )
}