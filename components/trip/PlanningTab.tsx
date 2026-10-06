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
    waypoints?: string[]
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

    dayWaypoints: string[]
    setDayWaypoints: (value: string[]) => void

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
    dayWaypoints,
    setDayWaypoints,
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
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [mapDialogOpen, setMapDialogOpen] = useState(false)
  const [mapDayFilter, setMapDayFilter] = useState<number | null>(null)

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

  const decodeWaypoints = (stored: string | null | undefined) => {
    const value = stored || ''
    const marker = '[[WAYPOINTS:'
    const start = value.indexOf(marker)
    const end = start >= 0 ? value.indexOf(']]', start) : -1
    if (start < 0 || end < 0) return [] as string[]
    try {
      const parsed = JSON.parse(value.slice(start + marker.length, end))
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : []
    } catch {
      return []
    }
  }

  const visibleDayNotes = (stored: string | null | undefined) => {
    const value = stored || ''
    const marker = '[[WAYPOINTS:'
    const start = value.indexOf(marker)
    const end = start >= 0 ? value.indexOf(']]', start) : -1
    if (start < 0 || end < 0) return value
    return (value.slice(0, start) + value.slice(end + 2)).trim()
  }

  const itineraryCities = useMemo(() => {
    const result: { label: string; dayNumber: number; kind: 'start' | 'end' }[] = []
    sortedTripDays.forEach((day) => {
      const start = day.start_city?.trim()
      const end = day.end_city?.trim()
      const dayNumber = Number(day.day_number)
      if (start) result.push({ label: start, dayNumber, kind: 'start' })

      const dayWaypoints = Array.isArray(day.waypoints) && day.waypoints.length > 0
        ? day.waypoints
        : decodeWaypoints(day.notes)
      dayWaypoints.forEach((waypoint) => {
        const label = waypoint.trim()
        if (label) result.push({ label, dayNumber, kind: 'end' })
      })

      if (end) result.push({ label: end, dayNumber, kind: 'end' })
    })
    return result.filter((item, index, items) => {
      if (index === 0) return true
      const previous = items[index - 1]
      return !(
        previous.dayNumber === item.dayNumber &&
        previous.label.toLowerCase() === item.label.toLowerCase()
      )
    })
  }, [tripDays])

  const mapDayNumbers = useMemo(
    () => Array.from(new Set(sortedTripDays.map((day) => Number(day.day_number)))).sort((a, b) => a - b),
    [tripDays]
  )

  const displayedItineraryCities = useMemo(
    () => mapDayFilter === null
      ? itineraryCities
      : itineraryCities.filter((item) => item.dayNumber === mapDayFilter),
    [itineraryCities, mapDayFilter]
  )

  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (!mapDialogOpen) return
      if (displayedItineraryCities.length === 0) {
        setMapPoints([])
        setPlannedRoute([])
        setMapError(null)
        return
      }

      setMapLoading(true)
      setMapError(null)
      try {
        const located: PlannedMapPoint[] = []
        for (const city of displayedItineraryCities) {
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

        if (located.length < displayedItineraryCities.length) {
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
  }, [displayedItineraryCities, mapDialogOpen])

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

  const openDayEditor = (day: TripDay) => {
    startEditTripDay(day)
    setEditDialogOpen(true)
  }

  const saveEditedDay = async () => {
    await updateTripDay()
    setEditDialogOpen(false)
  }

  return (
  <div className="space-y-4">
    {editDialogOpen && editingDayId && (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-2xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-black text-foreground">Modifica giornata</h3>
              <p className="text-[11px] text-muted-foreground">Modifica percorso, tappe intermedie e dettagli senza tornare in cima alla pagina.</p>
            </div>
            <button type="button" onClick={() => setEditDialogOpen(false)} className="rounded-md border border-border px-3 py-2 text-xs text-muted-foreground">Chiudi</button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Data</span><input type="date" value={dayDate} onChange={(e) => setDayDate(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" /></label>
            <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Km previsti</span><input type="number" step="0.1" value={dayPlannedKm} onChange={(e) => setDayPlannedKm(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" /></label>
            <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Partenza</span><input value={dayStartCity} onChange={(e) => setDayStartCity(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" /></label>
            <label className="space-y-1"><span className="text-[10px] font-bold uppercase text-muted-foreground">Arrivo</span><input value={dayEndCity} onChange={(e) => setDayEndCity(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" /></label>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase text-muted-foreground">Tappe intermedie</span><Button type="button" variant="outline" size="sm" onClick={() => setDayWaypoints([...dayWaypoints, ''])} className="h-7 text-[10px]"><Plus className="mr-1 size-3" />Aggiungi tappa</Button></div>
              {dayWaypoints.map((waypoint, index) => <div key={index} className="flex gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-black text-primary">{index + 1}</span><input value={waypoint} onChange={(e) => setDayWaypoints(dayWaypoints.map((v,i) => i === index ? e.target.value : v))} placeholder="Località intermedia" className="min-w-0 flex-1 rounded-md border border-border bg-background p-2 text-xs" /><button type="button" onClick={() => setDayWaypoints(dayWaypoints.filter((_,i) => i !== index))} className="rounded-md border border-border p-2 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button></div>)}
            </div>
            <label className="space-y-1 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-muted-foreground">Titolo tappa</span><input value={dayTitle} onChange={(e) => setDayTitle(e.target.value)} className="w-full rounded-md border border-border bg-background p-2 text-xs" /></label>
            <label className="space-y-1 sm:col-span-2"><span className="text-[10px] font-bold uppercase text-muted-foreground">Note</span><textarea value={dayNotes} onChange={(e) => setDayNotes(e.target.value)} rows={4} className="w-full rounded-md border border-border bg-background p-2 text-xs" /></label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Annulla</Button>
            <Button type="button" onClick={saveEditedDay}>Salva modifiche</Button>
          </div>
        </div>
      </div>
    )}
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

            <div className="space-y-2 sm:col-span-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Tappe intermedie</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setDayWaypoints([...dayWaypoints, ''])} className="h-7 gap-1 px-2 text-[10px]">
                  <Plus className="size-3" /> Aggiungi tappa
                </Button>
              </div>
              {dayWaypoints.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">Facoltative. Esempio: Verona → Innsbruck → Kufstein → Salisburgo.</p>
              ) : (
                <div className="space-y-2">
                  {dayWaypoints.map((waypoint, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[9px] font-black text-primary">{index + 1}</span>
                      <input type="text" placeholder="Es. Innsbruck" value={waypoint} onChange={(e) => setDayWaypoints(dayWaypoints.map((value, i) => i === index ? e.target.value : value))} className="min-w-0 flex-1 rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none" />
                      <button type="button" onClick={() => setDayWaypoints(dayWaypoints.filter((_, i) => i !== index))} className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-destructive" aria-label={`Elimina tappa ${index + 1}`}><Trash2 className="size-3.5" /></button>
                    </div>
                  ))}
                </div>
              )}
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

    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <Route className="size-4 text-primary" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Itinerario pianificato</h4>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Apri la mappa solo quando vuoi consultare graficamente il percorso.</p>
        </div>
        <Button type="button" onClick={() => setMapDialogOpen(true)} disabled={itineraryCities.length === 0} size="sm" className="h-8 text-xs">
          <Route className="mr-1 size-3.5" /> Apri mappa itinerario
        </Button>
      </div>
    </div>

    {mapDialogOpen && (
      <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
        <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div><h3 className="text-base font-black">Mappa itinerario pianificato</h3><p className="text-[10px] text-muted-foreground">Percorso stradale previsto attraverso tutte le tappe.</p></div>
            <Button type="button" variant="outline" size="sm" onClick={() => setMapDialogOpen(false)}>Chiudi</Button>
          </div>
          <div className="min-h-[55vh] flex-1 bg-secondary/10">
            {mapPoints.length > 0 ? <PlanningMap points={mapPoints} route={plannedRoute} /> : <div className="flex h-[60vh] items-center justify-center text-xs text-muted-foreground">{mapLoading ? 'Sto calcolando il percorso…' : 'Nessuna località trovata.'}</div>}
          </div>
          <div className="border-t border-border p-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button type="button" onClick={() => setMapDayFilter(null)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${mapDayFilter === null ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:bg-secondary/40'}`}>Tutto il viaggio</button>
              {mapDayNumbers.map((dayNumber) => (
                <button key={dayNumber} type="button" onClick={() => setMapDayFilter(dayNumber)} className={`rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors ${mapDayFilter === dayNumber ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary/20 text-foreground hover:bg-secondary/40'}`}>Giorno {dayNumber}</button>
              ))}
            </div>
            {mapDayFilter !== null && (
              <p className="mt-2 text-[10px] text-muted-foreground">Dettaglio Giorno {mapDayFilter}: {displayedItineraryCities.map((item) => item.label).join(' → ')}</p>
            )}
            {mapError && <p className="mt-2 text-[10px] text-amber-500">{mapError}</p>}
          </div>
        </div>
      </div>
    )}

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
                      {[day.start_city, ...(day.waypoints || decodeWaypoints(day.notes)), day.end_city].filter(Boolean).join(' → ') || '—'}
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

                  {visibleDayNotes(day.notes) && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-line">
                      {visibleDayNotes(day.notes)}
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
                    onClick={() => openDayEditor(day)}
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