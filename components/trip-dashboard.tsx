'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { AppSplash } from '@/components/app-splash'
import {
  Bike,
  Route,
  Gauge,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  Plus,
  Trash2,
  Euro,
  Play,
  FolderHeart,
  Pencil,
  Receipt,
  FileText,
  Clock3,
  Coffee,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GpxUploader } from '@/components/gpx-uploader'
import { StatCard } from '@/components/stat-card'
import { parseGpx, type ParsedTrip } from '@/lib/gpx-parser'
import { updateTripWithGpx, updateTripExpenses, type ExpenseInput } from '@/lib/save-trip'
import { supabase } from '@/lib/supabase'
import { MAX_PLAUSIBLE_SPEED_KMH } from '@/lib/gpx-parser'
import { PlanningTab } from '@/components/trip/PlanningTab'
import { TripOverview } from '@/components/trip/TripOverview'
import { RoadbookView } from '@/components/trip/RoadbookView'
import { TripTabs, type TripTab } from '@/components/trip/TripTabs'


const TripMap = dynamic(() => import('@/components/trip-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

type SaveState = 'idle' | 'saving' | 'saved'
type AppMode = 'select' | 'live' | 'gpx' | 'edit_expenses'
type ActiveTab = TripTab

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

//Stati 
export function TripDashboard() {
  const [mode, setMode] = useState<AppMode>('select')
  const [activeTab, setActiveTab] = useState<ActiveTab>('expenses')
  
  const [trip, setTrip] = useState<ParsedTrip | null>(null)
  const [customName, setCustomName] = useState<string>('')
  const [customDate, setCustomDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [allTrips, setAllTrips] = useState<any[]>([])
  const [editingTripId, setEditingTripId] = useState<string | null>(null)

  // Stati singola spesa
  const [expenses, setExpenses] = useState<ExpenseInput[]>([])
  const [selectedCatId, setSelectedCatId] = useState<number>(1)
  const [expenseAmount, setExpenseAmount] = useState<string>('')
  const [expenseNotes, setExpenseNotes] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>('')

  // Note viaggio testuali libere
  const [tripNotes, setTripNotes] = useState<string>('')
  const [tripDays, setTripDays] = useState<any[]>([])
  const [dayTitle, setDayTitle] = useState<string>('')
  const [dayDate, setDayDate] = useState<string>('')
  const [dayNotes, setDayNotes] = useState<string>('')
  const [dayStartCity, setDayStartCity] = useState<string>('')
  const [dayEndCity, setDayEndCity] = useState<string>('')
  const [dayPlannedKm, setDayPlannedKm] = useState<string>('')
  const [editingDayId, setEditingDayId] = useState<string | null>(null)

  //Stati x alberghi
  const [accommodations, setAccommodations] = useState<any[]>([])
  const [selectedDayForAccommodation, setSelectedDayForAccommodation] = useState<string | null>(null)
  const [accommodationName, setAccommodationName] = useState('')
  const [accommodationBookingUrl, setAccommodationBookingUrl] = useState('')
  const [accommodationAirbnbUrl, setAccommodationAirbnbUrl] = useState('')
  const [accommodationPrice, setAccommodationPrice] = useState('')
  const [accommodationParking, setAccommodationParking] = useState(false)
  const [accommodationNotes, setAccommodationNotes] = useState('')
  const [editingAccommodationId, setEditingAccommodationId] = useState<string | null>(null)
  const [accommodationAddress, setAccommodationAddress] = useState('')
  const [accommodationCheckInDate, setAccommodationCheckInDate] = useState('')
  const [accommodationCheckOutDate, setAccommodationCheckOutDate] = useState('')
  const [accommodationCheckInTime, setAccommodationCheckInTime] = useState('')
  const [accommodationCheckOutTime, setAccommodationCheckOutTime] = useState('')
  const [accommodationCancellationDate, setAccommodationCancellationDate] = useState('')
  const [accommodationPaymentDate, setAccommodationPaymentDate] = useState('')
  const [accommodationPayAtProperty, setAccommodationPayAtProperty] = useState(false)
  const [accommodationBreakfastIncluded, setAccommodationBreakfastIncluded] = useState(false)

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [hasNewGpxLoaded, setHasNewGpxLoaded] = useState(false)

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('expense_categories')
      .select('id, name')
      .order('id', { ascending: true })
    
    if (data && data.length > 0) {
      setExpenseCategories(data)
      setSelectedCatId(data[0].id)
    }
  }

  const fetchAllTrips = async () => {
    const { data, error: dbError } = await supabase
      .from('trips')
      .select(`
        id,
        title,
        trip_date,
        trip_end_date,
        total_km,
        notes,
        moving_time_minutes,
        average_moving_speed_kmh,
        stops_count
      `)
      .order('trip_date', { ascending: false })
    
    if (dbError) {
      console.error("Errore Supabase:", dbError)
      return
    }

    if (data) {
      const sanitizedTrips = data.map((t) => ({
        ...t,
        total_km: t.total_km === null || t.total_km === undefined ? 0 : Number(t.total_km)
      }))
      setAllTrips(sanitizedTrips)
    }
  }

  const fetchTripDays = async (tripId: string) => {
   const { data, error } = await supabase
     .from('trip_days')
     .select('id, trip_id, day_number, travel_date, title, notes, start_city, end_city, planned_km, display_order')
     .eq('trip_id', tripId)
     .order('display_order', { ascending: true })

   if (error) {
     console.error('Errore caricamento pianificazione:', error)
     return
   }

  setTripDays(data || [])
}

const fetchAccommodations = async (tripId: string) => {
  const { data: days, error: daysError } = await supabase
    .from('trip_days')
    .select('id')
    .eq('trip_id', tripId)

  if (daysError) {
    console.error('Errore caricamento giorni per hotel:', daysError)
    return
  }

  const dayIds = (days || []).map((d) => d.id)

  if (dayIds.length === 0) {
    setAccommodations([])
    return
  }

  const { data, error } = await supabase
    .from('accommodations')
    .select('*')
    .in('trip_day_id', dayIds)
    .order('check_in_date', { ascending: true })

  if (error) {
    console.error('Errore caricamento pernottamenti:', error)
    return
  }

  setAccommodations(data || [])
}

const saveTripStops = async (
  tripId: string,
  stops: NonNullable<ParsedTrip['stops']> = [],
) => {
  const { error: deleteError } = await supabase
    .from('trip_stops')
    .delete()
    .eq('trip_id', tripId)

  if (deleteError) throw deleteError

  if (!stops || stops.length === 0) return

  const rows = stops.map((stop) => ({
    trip_id: tripId,
    latitude: stop.lat,
    longitude: stop.lon,
    start_time: stop.startTime,
    end_time: stop.endTime,
    duration_minutes: stop.durationMinutes,
  }))

  const { error: insertError } = await supabase
    .from('trip_stops')
    .insert(rows)

  if (insertError) throw insertError
}

const addAccommodation = async () => {
  if (!selectedDayForAccommodation) {
    alert('Seleziona una giornata.')
    return
  }

  if (!accommodationName.trim()) {
    alert('Inserisci il nome della struttura.')
    return
  }

  const selectedDay = tripDays.find(
    (day) => day.id === selectedDayForAccommodation
  )

  if (selectedDay) {
    const selectedDate = String(selectedDay.travel_date).slice(0, 10)

    const coveringAccommodation = accommodations.find((accommodation) => {
      const checkIn = accommodation.check_in_date
        ? String(accommodation.check_in_date).slice(0, 10)
        : null
      const checkOut = accommodation.check_out_date
        ? String(accommodation.check_out_date).slice(0, 10)
        : null

      if (!checkIn) {
        return accommodation.trip_day_id === selectedDayForAccommodation
      }

      if (!checkOut) {
        return checkIn === selectedDate
      }

      return selectedDate >= checkIn && selectedDate < checkOut
    })

    if (coveringAccommodation) {
      alert(
        `Questa giornata è già coperta dal pernottamento "${coveringAccommodation.name}".`
      )
      return
    }
  }

  const { error } = await supabase
    .from('accommodations')
    .insert([
      {
        trip_day_id: selectedDayForAccommodation,
        name: accommodationName.trim(),
        booking_url: accommodationBookingUrl.trim() || null,
        airbnb_url: accommodationAirbnbUrl.trim() || null,
        price: accommodationPrice ? Number(accommodationPrice) : null,
        parking_available: accommodationParking,
        notes: accommodationNotes.trim() || null,
        address: accommodationAddress.trim() || null,
        check_in_date: accommodationCheckInDate || null,
        check_out_date: accommodationCheckOutDate || null,
        check_in_time: accommodationCheckInTime || null,
        check_out_time: accommodationCheckOutTime || null,
        free_cancellation_until: accommodationCancellationDate || null,
        payment_date: accommodationPayAtProperty
          ? null
          : accommodationPaymentDate || null,
        pay_at_property: accommodationPayAtProperty,
      breakfast_included: accommodationBreakfastIncluded,
        breakfast_included: accommodationBreakfastIncluded,
      },
    ])




  if (error) {
    console.error('Errore inserimento pernottamento:', error)
    alert(`Errore inserimento pernottamento: ${error.message}`)
    return
  }

  setAccommodationName('')
  setAccommodationBookingUrl('')
  setAccommodationAirbnbUrl('')
  setAccommodationPrice('')
  setAccommodationParking(false)
  setAccommodationNotes('')
  setSelectedDayForAccommodation(null)
  setAccommodationAddress('')
  setAccommodationCheckInDate('')
  setAccommodationCheckOutDate('')
  setAccommodationCheckInTime('')
  setAccommodationCheckOutTime('')
  setAccommodationCancellationDate('')
  setAccommodationPaymentDate('')
  setAccommodationPayAtProperty(false)
  setAccommodationBreakfastIncluded(false)

  if (editingTripId) {
    await fetchAccommodations(editingTripId)
  }
}

//Modifica albergo
const startEditAccommodation = (acc: any) => {
  setEditingAccommodationId(acc.id)
  setSelectedDayForAccommodation(acc.trip_day_id)
  setAccommodationName(acc.name || '')
  setAccommodationBookingUrl(acc.booking_url || '')
  setAccommodationAirbnbUrl(acc.airbnb_url || '')
  setAccommodationPrice(acc.price ? String(acc.price) : '')
  setAccommodationParking(!!acc.parking_available)
  setAccommodationNotes(acc.notes || '')
  setAccommodationAddress(acc.address || '')
  setAccommodationCheckInDate(acc.check_in_date || '')
  setAccommodationCheckOutDate(acc.check_out_date || '')
  setAccommodationCheckInTime(
    acc.check_in_time ? String(acc.check_in_time).slice(0, 5) : ''
  )

  setAccommodationCheckOutTime(
    acc.check_out_time ? String(acc.check_out_time).slice(0, 5) : ''
  )
  setAccommodationCancellationDate(acc.free_cancellation_until || '')
  setAccommodationPaymentDate(acc.payment_date || '')
  setAccommodationPayAtProperty(!!acc.pay_at_property)
  setAccommodationBreakfastIncluded(!!acc.breakfast_included)
}

//Salva modifica albergo
const updateAccommodation = async () => {
  if (!editingAccommodationId || !editingTripId) return

  const { error } = await supabase
    .from('accommodations')
    .update({
      name: accommodationName.trim(),
      booking_url: accommodationBookingUrl.trim() || null,
      airbnb_url: accommodationAirbnbUrl.trim() || null,
      price: accommodationPrice ? Number(accommodationPrice) : null,
      parking_available: accommodationParking,
      notes: accommodationNotes.trim() || null,
      address: accommodationAddress.trim() || null,
      check_in_date: accommodationCheckInDate || null,
      check_out_date: accommodationCheckOutDate || null,
      check_in_time: accommodationCheckInTime || null,
      check_out_time: accommodationCheckOutTime || null,
      free_cancellation_until: accommodationCancellationDate || null,
      payment_date: accommodationPayAtProperty
        ? null
        : accommodationPaymentDate || null,
      pay_at_property: accommodationPayAtProperty,
    })
    .eq('id', editingAccommodationId)

  if (error) {
    alert(`Errore aggiornamento pernottamento: ${error.message}`)
    return
  }
 
  //Pulizia degli stati
  setEditingAccommodationId(null)
  setSelectedDayForAccommodation(null)
  setAccommodationName('')
  setAccommodationBookingUrl('')
  setAccommodationAirbnbUrl('')
  setAccommodationPrice('')
  setAccommodationParking(false)
  setAccommodationNotes('')
  setAccommodationAddress('')
  setAccommodationCheckInDate('')
  setAccommodationCheckOutDate('')
  setAccommodationCheckInTime('')
  setAccommodationCheckOutTime('')
  setAccommodationCancellationDate('')
  setAccommodationPaymentDate('')
  setAccommodationPayAtProperty(false)
  setAccommodationBreakfastIncluded(false)

  await fetchAccommodations(editingTripId)
}

//Cancella record albergo
const deleteAccommodation = async (id: string) => {
  if (!editingTripId) return

  const confirmed = confirm('Vuoi eliminare questo pernottamento?')
  if (!confirmed) return

  const { error } = await supabase
    .from('accommodations')
    .delete()
    .eq('id', id)

  if (error) {
    alert(`Errore eliminazione pernottamento: ${error.message}`)
    return
  }

  await fetchAccommodations(editingTripId)
}

const addTripDay = async () => {
  if (!editingTripId) {
    alert('Prima salva il viaggio, poi potrai aggiungere le giornate.')
    return
  }

  if (!dayDate) {
    alert('Inserisci la data della giornata.')
    return
  }

  const nextDayNumber =
    tripDays.length > 0
      ? Math.max(...tripDays.map((d) => Number(d.day_number))) + 1
      : 1

  const { error } = await supabase
    .from('trip_days')
    .insert([
      {
        trip_id: editingTripId,
        day_number: nextDayNumber,
        display_order: nextDayNumber,
        travel_date: dayDate,
        title:
          dayTitle.trim() ||
          `${dayStartCity.trim() || 'Partenza'} → ${dayEndCity.trim() || 'Arrivo'}`,
        start_city: dayStartCity.trim() || null,
        end_city: dayEndCity.trim() || null,
        planned_km: dayPlannedKm ? Number(dayPlannedKm) : null,
        notes: dayNotes.trim() || null,
      },
    ])

  if (error) {
    console.error('Errore inserimento giornata:', error)
    alert(`Errore inserimento giornata: ${error.message}`)
    return
  }

  setDayTitle('')
  setDayDate('')
  setDayNotes('')
  setDayStartCity('')
  setDayEndCity('')
  setDayPlannedKm('')

  await fetchTripDays(editingTripId)
}

const startEditTripDay = (day: any) => {
  setEditingDayId(day.id)
  setDayDate(day.travel_date || '')
  setDayStartCity(day.start_city || '')
  setDayEndCity(day.end_city || '')
  setDayPlannedKm(day.planned_km ? String(day.planned_km) : '')
  setDayTitle(day.title || '')
  setDayNotes(day.notes || '')
}

const updateTripDay = async () => {
  if (!editingDayId || !editingTripId) return

  const { error } = await supabase
    .from('trip_days')
    .update({
      travel_date: dayDate,
      start_city: dayStartCity.trim() || null,
      end_city: dayEndCity.trim() || null,
      planned_km: dayPlannedKm ? Number(dayPlannedKm) : null,
      title:
        dayTitle.trim() ||
        `${dayStartCity.trim() || 'Partenza'} → ${dayEndCity.trim() || 'Arrivo'}`,
      notes: dayNotes.trim() || null,
    })
    .eq('id', editingDayId)

  if (error) {
    alert(`Errore aggiornamento giornata: ${error.message}`)
    return
  }

  setEditingDayId(null)
  setDayDate('')
  setDayStartCity('')
  setDayEndCity('')
  setDayPlannedKm('')
  setDayTitle('')
  setDayNotes('')

  await fetchTripDays(editingTripId)
}

const removeTripDay = async (dayId: string) => {
  if (!editingTripId) return

  const confirmed = confirm('Vuoi eliminare questa giornata?')
  if (!confirmed) return

  const { error } = await supabase
    .from('trip_days')
    .delete()
    .eq('id', dayId)

  if (error) {
    console.error('Errore eliminazione giornata:', error)
    alert(`Errore eliminazione giornata: ${error.message}`)
    return
  }

  await fetchTripDays(editingTripId)
}

  useEffect(() => {
    if (mode === 'select') {
      fetchCategories()
      fetchAllTrips()
    }
  }, [mode, saveState])

  const startLiveTrip = () => {
    const today = new Date().toISOString().slice(0, 10)
    setMode('live')
    setActiveTab('planning')
    setCustomName('Nuovo Giro Goldwing')
    setCustomDate(today)
    setCustomEndDate(today)
    setExpenseDate(today)
    setExpenses([])
    setTrip(null)
    setTripNotes('')
    setEditingTripId(null)
    setHasNewGpxLoaded(false)
  }

  const startEditingExpenses = async (tripId: string, title: string, dateStr: string, endDateStr: string) => {
    setLoading(true)
    setEditingTripId(tripId)
    setCustomName(title)
    setHasNewGpxLoaded(false)
    setActiveTab('overview')
    
    const start = dateStr ? dateStr.slice(0, 10) : ''
    setCustomDate(start)
    setCustomEndDate(endDateStr ? endDateStr.slice(0, 10) : start)
    setExpenseDate(start || new Date().toISOString().slice(0, 10))
    
    setExpenses([]) 
    setTrip(null)

    const currentTripData = allTrips.find(t => t.id === tripId)
    setTripNotes(currentTripData?.notes || '')

    const { data: stopsData, error: stopsError } = await supabase
      .from('trip_stops')
      .select('latitude, longitude, start_time, end_time, duration_minutes')
      .eq('trip_id', tripId)
      .order('start_time', { ascending: true })

    if (stopsError) {
      console.error('Errore caricamento soste:', stopsError)
    }

    // 1. Scarica le spese esistenti
    const { data: expData, error: expError } = await supabase
      .from('expenses')
      .select('category_id, amount, notes, expense_date')
      .eq('trip_id', tripId)

    if (!expError && expData) {
      setExpenses(expData.map(e => ({
        category_id: e.category_id,
        amount: Number(e.amount),
        notes: e.notes || undefined,
        expense_date: e.expense_date ? e.expense_date.slice(0, 10) : start
      })))
    }

    // 2. Scarica la mappa basandosi sui campi reali: latitude, longitude
    try {
      let pointsData: any[] = []
const pageSize = 1000
let from = 0
while (true) {
  const { data: page, error: pageError } = await supabase
    .from('track_points')
    .select('latitude, longitude, elevation, timestamp, speed')
    .eq('trip_id', tripId)
    .order('timestamp', { ascending: true })
    .range(from, from + pageSize - 1)

  if (pageError) throw pageError
  if (!page || page.length === 0) break

  pointsData = pointsData.concat(page)
  if (page.length < pageSize) break // ultima pagina raggiunta
  from += pageSize

}

      const currentTripData = allTrips.find(t => t.id === tripId)
      const savedKm = currentTripData ? currentTripData.total_km : 0

      if (pointsData && pointsData.length > 0) {
        const validPoints = pointsData
          .filter(p => p.latitude !== null && p.longitude !== null)
          .map(p => ({
            lat: Number(p.latitude),  // Mappa correttamente la colonna del DB su 'lat' per Leaflet
            lon: Number(p.longitude), // Usa p.longitude, NON p.lon! Mappa su 'lon' per Leaflet
            ele: p.elevation !== null ? p.elevation : null,
            time: p.timestamp || null,
            speed: p.speed !== null ? p.speed : null
          }))

          let recomputedMaxSpeed = 0
for (const p of pointsData ?? []) {
  const kmh = p.speed !== null && p.speed !== undefined ? Number(p.speed) : null
  if (kmh !== null && !Number.isNaN(kmh) && kmh > 0 && kmh <= MAX_PLAUSIBLE_SPEED_KMH) {
    if (kmh > recomputedMaxSpeed) recomputedMaxSpeed = kmh
  }
}

        if (validPoints.length > 0) {
          setTrip({
            name: title,
            date: dateStr,
            totalKm: Number(savedKm),
            points: validPoints,
            maxSpeedKmh: recomputedMaxSpeed,
            movingTimeMinutes: Number(currentTripData?.moving_time_minutes || 0),
            averageMovingSpeedKmh: Number(
              currentTripData?.average_moving_speed_kmh || 0
            ),
            stops: (stopsData || []).map((stop) => ({
              lat: Number(stop.latitude),
              lon: Number(stop.longitude),
              startTime: stop.start_time,
              endTime: stop.end_time,
              durationMinutes: Number(stop.duration_minutes),
            })),
            maxElevation: null,
            minElevation: null,
            avgElevation: null,
          })
        }
      }
    } catch (err) {
      console.error('Errore recupero punti:', err)
    }

    await fetchTripDays(tripId)
    await fetchAccommodations(tripId)

    setMode('edit_expenses')
    setLoading(false)
  }

  const addExpense = () => {
    const amount = parseFloat(expenseAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Inserisci un importo valido.')
      return
    }
    if (!expenseDate) {
      alert('Seleziona la data della spesa.')
      return
    }
    setExpenses((prev) => [...prev, {
      category_id: selectedCatId,
      amount: amount,
      notes: expenseNotes.trim() || undefined,
      expense_date: expenseDate
    }])
    setExpenseAmount('')
    setExpenseNotes('')
  }

  const removeExpense = (index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index))
  }

  const totalExpensesCost = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)
  }, [expenses])

  const categorySubtotals = useMemo(() => {
    const subtotals: Record<number, number> = {}
    expenseCategories.forEach(cat => { subtotals[cat.id] = 0 })
    expenses.forEach(exp => {
      if (subtotals[exp.category_id] !== undefined) {
        subtotals[exp.category_id] += exp.amount
      } else {
        subtotals[exp.category_id] = exp.amount
      }
    })
    return subtotals
  }, [expenses, expenseCategories])

  const handleFile = useCallback((fileName: string, content: string) => {
    setError(null)
    setSaveState('idle')

    if (content === '__INVALID__') {
      setError(`Formato non supportato per "${fileName}". Usa un file .gpx.`)
      return
    }

    setLoading(true)
    setTimeout(() => {
      try {
        const fallback = fileName.replace(/\.(gpx|xml)$/i, '')
        const parsed = parseGpx(content, fallback)

        if (parsed.points.length === 0) {
          setError('Nessun punto traccia trovato nel file.')
        } else {
          const fileDate = parsed.date ? parsed.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
          setTrip(parsed)
          
          if (mode !== 'edit_expenses') {
            setCustomName(parsed.name)
            setCustomDate(fileDate)
            setCustomEndDate(fileDate)
            setExpenseDate(fileDate)
            setMode('gpx')
            setActiveTab('map')
          } else {
            setHasNewGpxLoaded(true)
            setActiveTab('map')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nel file.')
      } finally {
        setLoading(false)
      }
    }, 60)
  }, [mode])

  const handleSave = async () => {
    setSaveState('saving')
    try {
      if (mode === 'edit_expenses' && editingTripId) {
        // 1. Determina i chilometri finali corretti
        const currentSavedKm = allTrips.find(t => t.id === editingTripId)?.total_km || 0
        const finalKm = hasNewGpxLoaded && trip ? trip.totalKm : currentSavedKm

        // 2. Aggiorna i dati base del viaggio
        const { error: updateTripError } = await supabase
          .from('trips')
          .update({
            title: customName.trim(),
            trip_date: customDate,
            trip_end_date: customEndDate,
            total_km: finalKm,
            notes: tripNotes.trim() || null,
            moving_time_minutes: trip?.movingTimeMinutes ?? null,
            average_moving_speed_kmh: trip?.averageMovingSpeedKmh ?? null,
            stops_count: trip?.stops?.length ?? 0,
          })
          .eq('id', editingTripId)

        if (updateTripError) throw updateTripError

        if (trip?.stops) {
          await saveTripStops(editingTripId, trip.stops)
        }

        // 3. Sincronizza le spese (eseguito sempre)
        await updateTripExpenses(editingTripId, expenses)
        
        // 4. Aggiorna i punti mappa SOLO se è stato caricato un nuovo GPX o se sono presenti nello stato
        if (trip && trip.points && trip.points.length > 0) {
          const pointsToUpdate = trip.points.map((p: any) => ({
            lat: Number(p.lat ?? p.latitude),
            lng: Number(p.lon ?? p.longitude),
            ele: p.ele ?? p.elevation ?? null,
            time: p.time ?? p.timestamp ?? null,
            speed: p.speed ?? null
          })).filter(p => p.lat !== undefined && p.lng !== undefined && !isNaN(p.lat) && !isNaN(p.lng))
          
          if (pointsToUpdate.length > 0) {
            await updateTripWithGpx(editingTripId, finalKm, pointsToUpdate)
          }
        }

        // Reset e pulizia stato
        setExpenses([])
        setEditingTripId(null)
        setTrip(null)
        setTripNotes('')
        setHasNewGpxLoaded(false)
        setSaveState('saved')
        setMode('select')
        await fetchAllTrips()
        alert('Viaggio aggiornato correttamente nel cloud!')

      } else {
        // RAMO NUOVO INSERIMENTO (Invariato e stabile)
        const titleToSave = customName.trim() || 'Giro Goldwing'
        const startToSave = customDate || new Date().toISOString().slice(0, 10)
        const endToSave = customEndDate || startToSave
        const kmToSave = trip ? trip.totalKm : 0
        const pointsToSave = trip ? trip.points : []

        const { data: tripData, error: tripError } = await supabase
          .from('trips')
          .insert([{
            title: titleToSave,
            trip_date: startToSave,
            trip_end_date: endToSave,
            total_km: kmToSave,
            notes: tripNotes.trim() || null,
            moving_time_minutes: trip?.movingTimeMinutes ?? null,
            average_moving_speed_kmh: trip?.averageMovingSpeedKmh ?? null,
            stops_count: trip?.stops?.length ?? 0,
          }])
          .select()
          .single()

        if (tripError) throw tripError

        if (tripData) {
          if (pointsToSave.length > 0) {
            const formattedPointsToSave = pointsToSave.map((p: any) => ({
              lat: Number(p.lat ?? p.latitude),
              lng: Number(p.lon ?? p.longitude),
              ele: p.ele ?? p.elevation ?? null,
              time: p.time ?? p.timestamp ?? null,
              speed: p.speed ?? null
            })).filter(p => p.lat !== undefined && p.lng !== undefined && !isNaN(p.lat) && !isNaN(p.lng))

            if (formattedPointsToSave.length > 0) {
              await updateTripWithGpx(tripData.id, kmToSave, formattedPointsToSave)
            }
          }

          if (trip?.stops) {
            await saveTripStops(tripData.id, trip.stops)
          }

          if (expenses.length > 0) {
            await updateTripExpenses(tripData.id, expenses)
          }
        }
        
        setExpenses([])
        setTrip(null)
        setTripNotes('')
        setHasNewGpxLoaded(false)
        setSaveState('saved')
        setMode('select')
        await fetchAllTrips()
        alert('Nuovo viaggio memorizzato nel cloud!')
      }
    } catch (err) {
      setSaveState('idle')
      console.error("Errore bloccante durante il salvataggio:", err)
      alert(`Errore nel salvataggio: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
    }
  }

  const stats = useMemo(() => {
  if (!trip) return null

    const movingMinutes = Math.round(trip.movingTimeMinutes ?? 0)
    const movingHours = Math.floor(movingMinutes / 60)
    const remainingMinutes = movingMinutes % 60

    const movingTimeLabel =
      movingHours > 0
        ? `${movingHours}h ${remainingMinutes}m`
        : `${remainingMinutes}m`

    return {
      km: trip.totalKm.toFixed(1),
      maxSpeed:
        trip.maxSpeedKmh > 0
          ? trip.maxSpeedKmh.toFixed(0)
          : '—',
      averageSpeed:
        (trip.averageMovingSpeedKmh ?? 0) > 0
          ? Number(trip.averageMovingSpeedKmh).toFixed(1)
          : '—',
      movingTime: movingTimeLabel,
      stopsCount: trip.stops?.length ?? 0,
    }
  }, [trip])

  const hasValidPoints = useMemo(() => {
    return !!(trip && trip.points && Array.isArray(trip.points) && trip.points.length > 0 && trip.points[0].lat && trip.points[0].lon)
  }, [trip])

  return (
    <>
      <AppSplash />
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm sm:size-10 sm:rounded-xl">
              <Bike className="size-4.5 sm:size-5.5" />
            </div>
            <div>
              <h1 className="whitespace-nowrap text-xs font-bold leading-tight sm:text-base">GoldWing Rides</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Logbook & Contabilità Goldwing</p>
            </div>
          </div>
          {mode !== 'select' && (
            <Button variant="outline" size="sm" className="h-8 shrink-0 whitespace-nowrap rounded-lg px-2.5 text-[10px] sm:h-9 sm:rounded-xl sm:px-3 sm:text-xs" onClick={() => { setMode('select'); setTrip(null); setEditingTripId(null); setExpenses([]); setSaveState('idle'); setHasNewGpxLoaded(false); }}>
              <span className="sm:hidden">Menu</span>
              <span className="hidden sm:inline">Torna al Menu</span>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6 lg:px-8">
        {mode === 'select' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-center bg-black px-4 py-3 sm:py-4">
                <Image
                  src="/logo/logo-horizontal.png"
                  alt="Moto /=\ Viaggi"
                  width={700}
                  height={180}
                  priority
                  className="h-auto w-full max-w-[620px] object-contain"
                />
              </div>
            </div>
            <div className="grid gap-4">
              <div className="flex flex-col justify-between space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:space-y-4 sm:p-5">
                <div className="space-y-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-10">
                    <Play className="size-4 sm:size-5" />
                  </div>
                  <h3 className="text-sm font-bold sm:text-base">Viaggio Live (In sella)</h3>
                  <p className="text-[10px] leading-relaxed text-muted-foreground sm:text-xs">
                    Inserisci spese, note e percorsi in tempo reale dal telefono. Potrai caricare la traccia GPX anche in un secondo momento.
                  </p>
                </div>
                <Button onClick={startLiveTrip} className="h-9 w-full gap-1.5 rounded-lg text-[11px] font-bold sm:h-10 sm:gap-2 sm:rounded-xl sm:text-xs">
                  Nuovo viaggio 🏍️
                </Button>
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-sm sm:space-y-3 sm:p-4">
              <div className="flex items-center gap-1.5 border-b border-border/60 pb-2 text-muted-foreground sm:gap-2">
                <FolderHeart className="size-4 text-primary sm:size-4.5" />
                <h3 className="text-xs font-bold text-foreground sm:text-sm">Diario delle Avventure</h3>
              </div>
              
              {allTrips.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Nessun viaggio salvato nel database.</p>
              ) : (
                <div className="max-h-[420px] divide-y divide-border/50 overflow-y-auto pr-0.5 sm:max-h-[350px] sm:pr-1">
                  {allTrips.map((t) => (
                    <div key={t.id} className="flex min-w-0 items-center gap-2 py-2 text-xs first:pt-0 last:pb-0 sm:gap-3 sm:py-2.5">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="truncate text-xs font-bold text-foreground sm:text-sm">{t.title}</p>
                        <p className="flex min-w-0 flex-wrap items-center gap-1 text-[9px] text-muted-foreground sm:text-[11px]">
                          {formatDate(t.trip_date)} • <span className="max-w-full truncate rounded bg-secondary/60 px-1 py-0.5 font-mono font-medium text-foreground">{t.total_km > 0 ? `${t.total_km.toFixed(1)} km` : 'Solo Spese'}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 shrink-0 gap-1 rounded-md px-2 text-[9px] sm:h-8 sm:rounded-lg sm:px-3 sm:text-[11px]"
                        onClick={() => startEditingExpenses(t.id, t.title, t.trip_date, t.trip_end_date)}
                      >
                        <Pencil className="size-2.5 shrink-0 sm:size-3" />
                        <span className="sm:hidden">Apri</span>
                        <span className="hidden sm:inline">Gestisci</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {(mode === 'live' || mode === 'gpx' || mode === 'edit_expenses') && (
          <div className="space-y-4">
            
            <section className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">Titolo viaggio</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Es. Weekend in Trentino"
                    className="block w-full min-w-0 max-w-full rounded-lg border border-border bg-secondary/10 px-2.5 py-2 text-xs font-bold text-foreground focus:border-primary focus:outline-none sm:px-3 sm:text-sm"
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">Data inizio</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="block h-9 w-full min-w-0 max-w-full appearance-none rounded-lg border border-border bg-secondary/10 px-2.5 text-[11px] text-foreground focus:border-primary focus:outline-none sm:h-10 sm:px-3 sm:text-xs"
                  />
                </div>

                <div className="min-w-0 space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-[11px]">Data fine</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="block h-9 w-full min-w-0 max-w-full appearance-none rounded-lg border border-border bg-secondary/10 px-2.5 text-[11px] text-foreground focus:border-primary focus:outline-none sm:h-10 sm:px-3 sm:text-xs"
                  />
                </div>
              </div>
            </section>

            <TripTabs activeTab={activeTab} onChange={setActiveTab} />

            <div className="grid gap-4">
              {activeTab === 'overview' && (
                <TripOverview
                  title={customName}
                  startDate={customDate}
                  endDate={customEndDate}
                  tripDays={tripDays}
                  accommodations={accommodations}
                  expenses={expenses}
                />
              )}

              {activeTab === 'planning' && (
                <PlanningTab
                  editingTripId={editingTripId}
                  tripDays={tripDays}
                  dayDate={dayDate}
                  setDayDate={setDayDate}
                  dayTitle={dayTitle}
                  setDayTitle={setDayTitle}
                  dayNotes={dayNotes}
                  setDayNotes={setDayNotes}
                  addTripDay={addTripDay}
                  removeTripDay={removeTripDay}
                  formatDate={formatDate}
                  dayStartCity={dayStartCity}
                  setDayStartCity={setDayStartCity}
                  dayEndCity={dayEndCity}
                  setDayEndCity={setDayEndCity}
                  dayPlannedKm={dayPlannedKm}
                  setDayPlannedKm={setDayPlannedKm}

                  editingDayId={editingDayId}
                  startEditTripDay={startEditTripDay}
                  updateTripDay={updateTripDay}

                  accommodations={accommodations}
                  selectedDayForAccommodation={selectedDayForAccommodation}
                  setSelectedDayForAccommodation={setSelectedDayForAccommodation}
                  accommodationName={accommodationName}
                  setAccommodationName={setAccommodationName}
                  accommodationBookingUrl={accommodationBookingUrl}
                  setAccommodationBookingUrl={setAccommodationBookingUrl}
                  accommodationAirbnbUrl={accommodationAirbnbUrl}
                  setAccommodationAirbnbUrl={setAccommodationAirbnbUrl}
                  accommodationPrice={accommodationPrice}
                  setAccommodationPrice={setAccommodationPrice}
                  accommodationParking={accommodationParking}
                  setAccommodationParking={setAccommodationParking}
                  accommodationNotes={accommodationNotes}
                  setAccommodationNotes={setAccommodationNotes}
                  addAccommodation={addAccommodation}
                  editingAccommodationId={editingAccommodationId}
                  startEditAccommodation={startEditAccommodation}
                  updateAccommodation={updateAccommodation}
                  deleteAccommodation={deleteAccommodation}
                  accommodationAddress={accommodationAddress}
                  setAccommodationAddress={setAccommodationAddress}
                  accommodationCheckInDate={accommodationCheckInDate}
                  setAccommodationCheckInDate={setAccommodationCheckInDate}
                  accommodationCheckOutDate={accommodationCheckOutDate}
                  setAccommodationCheckOutDate={setAccommodationCheckOutDate}
                  accommodationCheckInTime={accommodationCheckInTime}
                  setAccommodationCheckInTime={setAccommodationCheckInTime}
                  accommodationCheckOutTime={accommodationCheckOutTime}
                  setAccommodationCheckOutTime={setAccommodationCheckOutTime}
                  accommodationCancellationDate={accommodationCancellationDate}
                  setAccommodationCancellationDate={setAccommodationCancellationDate}
                  accommodationPaymentDate={accommodationPaymentDate}
                  setAccommodationPaymentDate={setAccommodationPaymentDate}
                  accommodationPayAtProperty={accommodationPayAtProperty}
                  setAccommodationPayAtProperty={setAccommodationPayAtProperty}
                  accommodationBreakfastIncluded={accommodationBreakfastIncluded}
                  setAccommodationBreakfastIncluded={setAccommodationBreakfastIncluded}
                />
             )}
                 
                 {activeTab === 'roadbook' && (
                    <RoadbookView
                      title={customName}
                      startDate={customDate}
                      endDate={customEndDate}
                      tripNotes={tripNotes}
                      tripDays={tripDays}
                      accommodations={accommodations}
                      expenses={expenses}
                      expenseCategories={expenseCategories}
                      formatDate={formatDate}
                    />
                  )}


              {activeTab === 'expenses' && (
                <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">

                  <div className="min-w-0 space-y-3 sm:space-y-4">
                    <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Plus className="size-3.5 text-primary sm:size-4" />
                        <h4 className="text-[9px] font-bold uppercase tracking-wider text-foreground sm:text-xs">
                          Nuovo movimento
                        </h4>
                      </div>

                      <div className="grid min-w-0 grid-cols-2 gap-2 rounded-lg border border-border/40 bg-secondary/10 p-2.5 sm:grid-cols-3 sm:gap-2.5 sm:p-3">
                        <div className="col-span-2 min-w-0 space-y-0.5 sm:col-span-1">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground sm:text-[10px]">
                            Categoria
                          </span>
                          <select
                            value={selectedCatId}
                            onChange={(e) => setSelectedCatId(parseInt(e.target.value))}
                            className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2 text-[10px] font-medium text-foreground focus:outline-none sm:text-xs"
                          >
                            {expenseCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground sm:text-[10px]">
                            Data spesa
                          </span>
                          <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="block h-9 w-full min-w-0 max-w-full appearance-none rounded-md border border-border bg-background px-2 text-[10px] text-foreground focus:outline-none sm:text-xs"
                          />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground sm:text-[10px]">
                            Cifra (€)
                          </span>
                          <div className="relative flex min-w-0 items-center">
                            <Euro className="absolute left-2 size-3 shrink-0 text-muted-foreground" />
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              placeholder="0.00"
                              value={expenseAmount}
                              onChange={(e) => setExpenseAmount(e.target.value)}
                              className="h-9 w-full min-w-0 rounded-md border border-border bg-background pl-6 pr-2 text-[10px] font-bold text-foreground focus:outline-none sm:text-xs"
                            />
                          </div>
                        </div>

                        <div className="col-span-2 min-w-0 space-y-0.5 sm:col-span-3">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground sm:text-[10px]">
                            Dettagli / note
                          </span>
                          <input
                            type="text"
                            placeholder="Es. Benzina Total - Pieno"
                            value={expenseNotes}
                            onChange={(e) => setExpenseNotes(e.target.value)}
                            className="h-9 w-full min-w-0 rounded-md border border-border bg-background px-2.5 text-[10px] text-foreground focus:outline-none sm:text-xs"
                          />
                        </div>

                        <div className="col-span-2 sm:col-span-3">
                          <Button
                            type="button"
                            onClick={addExpense}
                            size="sm"
                            className="h-9 w-full gap-1 rounded-md px-3 text-[10px] font-bold sm:w-auto sm:text-xs"
                          >
                            <Plus className="size-3" />
                            Aggiungi spesa
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                      <h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                        Lista voci inserite ({expenses.length})
                      </h4>

                      {expenses.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border bg-secondary/5 py-5 text-center text-[9px] italic text-muted-foreground sm:py-6 sm:text-xs">
                          Nessun costo inserito in questo tour.
                        </p>
                      ) : (
                        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-0.5 sm:max-h-[360px] sm:pr-1">
                          {expenses.map((exp, idx) => {
                            const catName =
                              expenseCategories.find(
                                (category) => category.id === exp.category_id
                              )?.name || 'Spesa'

                            return (
                              <div
                                key={idx}
                                className="min-w-0 rounded-lg border border-border/50 bg-background p-2.5 shadow-sm"
                              >
                                <div className="flex min-w-0 items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                      <span className="truncate text-[10px] font-bold text-foreground sm:text-xs">
                                        {catName}
                                      </span>
                                      <span className="rounded bg-secondary px-1 py-0.5 font-mono text-[8px] text-muted-foreground sm:text-[9px]">
                                        {formatDate(exp.expense_date)}
                                      </span>
                                    </div>

                                    {exp.notes && (
                                      <p className="mt-1 break-words text-[9px] italic leading-snug text-muted-foreground sm:text-[11px]">
                                        “{exp.notes}”
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex shrink-0 items-center gap-1.5">
                                    <span className="rounded-md border border-border/10 bg-secondary/50 px-1.5 py-1 font-mono text-[10px] font-bold text-foreground sm:px-2 sm:text-xs">
                                      €{Number(exp.amount).toFixed(2)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeExpense(idx)}
                                      aria-label="Elimina spesa"
                                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <Trash2 className="size-3 sm:size-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 space-y-3 sm:space-y-4">
                    <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                      <div className="mb-3 flex min-w-0 items-center justify-between gap-3 border-b border-border/50 pb-2">
                        <span className="min-w-0 text-[9px] font-bold uppercase tracking-wider text-muted-foreground sm:text-xs">
                          Totale speso
                        </span>
                        <span className="shrink-0 whitespace-nowrap font-mono text-base font-black text-primary sm:text-xl">
                          € {totalExpensesCost}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                        {expenseCategories.map((cat) => {
                          const subtotal = categorySubtotals[cat.id] || 0

                          return (
                            <div
                              key={cat.id}
                              className="flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border/20 bg-secondary/10 p-2"
                            >
                              <span className="min-w-0 truncate text-[9px] text-muted-foreground sm:text-xs">
                                {cat.name}
                              </span>
                              <span className="shrink-0 whitespace-nowrap rounded border border-border/30 bg-background px-1.5 py-0.5 font-mono text-[9px] font-bold text-foreground sm:text-xs">
                                € {subtotal.toFixed(2)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'map' && (
                <div className="space-y-4">
                  {stats && (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                      {[
                        {
                          icon: Route,
                          label: 'Km totali',
                          value: stats.km,
                          unit: 'km',
                        },
                        {
                          icon: Gauge,
                          label: 'Velocità max',
                          value: stats.maxSpeed,
                          unit: 'km/h',
                        },
                        {
                          icon: Gauge,
                          label: 'Velocità media',
                          value: stats.averageSpeed,
                          unit: 'km/h',
                        },
                        {
                          icon: Clock3,
                          label: 'Tempo in movimento',
                          value: stats.movingTime,
                          unit: '',
                        },
                      ].map((item) => {
                        const Icon = item.icon

                        return (
                          <div
                            key={item.label}
                            className="min-w-0 rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-4"
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground sm:size-10">
                                <Icon className="size-4 sm:size-5" />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[7px] font-bold uppercase leading-tight tracking-wide text-muted-foreground sm:text-[10px]">
                                  {item.label}
                                </p>

                                <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1">
                                  <span className="break-all font-mono text-[15px] font-black leading-none text-foreground sm:text-xl">
                                    {item.value}
                                  </span>

                                  {item.unit && (
                                    <span className="text-[7px] font-medium text-muted-foreground sm:text-[10px]">
                                      {item.unit}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {trip?.stops && (
                    <div className="space-y-2.5 rounded-xl border border-border bg-card p-3 shadow-sm sm:space-y-3 sm:p-4">
                      <div className="flex items-center gap-2">
                        <Coffee className="size-4 text-primary" />

                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            Soste oltre 30 minuti
                          </h4>

                          <p className="flex min-w-0 flex-wrap items-center gap-1 text-[9px] text-muted-foreground sm:text-[11px]">
                            {trip.stops.length === 0
                              ? 'Nessuna sosta lunga rilevata.'
                              : `${trip.stops.length} soste rilevate.`}
                          </p>
                        </div>
                      </div>

                      {trip.stops.length > 0 && (
                        <div className="space-y-2">
                          {trip.stops.map((stop, index) => {
                            const start = new Date(stop.startTime)
                            const end = new Date(stop.endTime)

                            const startTime = start.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })

                            const endTime = end.toLocaleTimeString('it-IT', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })

                            const minutes = Math.round(stop.durationMinutes)
                            const hours = Math.floor(minutes / 60)
                            const remainingMinutes = minutes % 60

                            const duration =
                              hours > 0
                                ? `${hours}h ${remainingMinutes}m`
                                : `${remainingMinutes}m`

                            const mapsUrl =
                              `https://www.google.com/maps/search/?api=1&query=${stop.lat},${stop.lon}`

                            return (
                              <div
                                key={`${stop.startTime}-${index}`}
                                className="rounded-lg border border-border/50 bg-secondary/10 p-2.5 text-[9px] sm:p-3 sm:text-xs"
                              >
                                <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-3">
                                  <div>
                                    <p className="text-[10px] font-bold text-foreground sm:text-xs">
                                      Sosta {index + 1}
                                    </p>

                                    <p className="mt-1 text-[8px] text-muted-foreground sm:text-[11px]">
                                      {startTime} → {endTime} · {duration}
                                    </p>
                                  </div>

                                  <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="h-7 shrink-0 whitespace-nowrap rounded-md border border-border bg-background px-2 text-[8px] font-medium leading-7 hover:bg-secondary sm:h-auto sm:py-1 sm:text-[11px] sm:leading-normal"
                                  >
                                    Apri Maps
                                  </a>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="relative h-[300px] overflow-hidden rounded-xl border border-border bg-secondary/10 shadow-inner sm:h-[450px]">
                    {hasValidPoints && trip && trip.points ? (
                      <TripMap key={trip.points.length} points={trip.points} />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center bg-card/20 py-8">
                        <MapIcon className="size-6 text-primary animate-pulse" />
                        <div className="space-y-1">
                          <p className="text-xs font-bold">Nessuna traccia GPS associata o dati non validi</p>
                          <p className="max-w-xs text-[11px] text-muted-foreground leading-normal">
                            Trascina o seleziona il file esportato dal navigatore qui sotto per mappare l'itinerario e calcolare i km.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CloudUpload className="size-4 text-primary" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        {trip ? 'Aggiorna / Sostituisci Traccia GPX' : 'Carica Traccia GPX'}
                      </h4>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Puoi sovrascrivere o inserire la traccia del tuo Garmin/TomTom in qualsiasi momento. I chilometri totali verranno ricalcolati automaticamente.
                    </p>
                    <div className="bg-background p-2 rounded-lg border border-border/60">
                      <GpxUploader onFile={handleFile} loading={loading} error={error} />
                    </div>
                  </div>

                </div>
              )}

              {activeTab === 'notes' && (
                <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="size-4 text-primary" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Diario di Bordo & Note di Viaggio</h4>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Usa questo spazio per salvare qualsiasi ricordo o appunto: alberghi, ristoranti visitati, meteo riscontrato, passaggi stradali panoramici o dettagli sui tuoi compagni di strada.
                  </p>
                  <textarea
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder="Scrivi qui i dettagli del tuo viaggio in Goldwing..."
                    rows={8}
                    className="w-full rounded-xl border border-border bg-secondary/10 py-3 px-4 text-xs text-foreground focus:outline-none focus:border-primary font-medium leading-relaxed resize-none"
                  />
                </div>
              )}

            </div>

            <Button onClick={handleSave} disabled={saveState === 'saving'} size="lg" className="mb-2 h-10 w-full gap-1.5 rounded-lg px-3 text-[11px] font-bold shadow-md sm:mb-0 sm:h-auto sm:gap-2 sm:rounded-xl sm:py-5 sm:text-sm">
              {saveState === 'saving' && <Loader2 className="size-4 animate-spin" />}
              {saveState === 'saved' && <CheckCircle2 className="size-4" />}
              {saveState === 'idle' && <CloudUpload className="size-4" />}
              {saveState === 'saving'
                ? 'Salvataggio dati in corso…'
                : mode === 'edit_expenses'
                  ? 'Aggiorna Viaggio e Dati nel Cloud ☁️'
                  : 'Salva Tutto nel Cloud ☁️'}
            </Button>

          </div>
        )}
      </main>

      <style jsx global>{`
        html,
        body {
          max-width: 100%;
          overflow-x: hidden;
        }

        *,
        *::before,
        *::after {
          box-sizing: border-box;
        }

        input,
        select,
        textarea,
        button {
          max-width: 100%;
        }

        input[type='date'],
        input[type='time'],
        input[type='datetime-local'] {
          display: block;
          width: 100%;
          min-width: 0;
          max-width: 100%;
          -webkit-appearance: none;
          appearance: none;
        }

        @media (max-width: 639px) {
          .mobile-compact-text {
            font-size: 0.75rem;
            line-height: 1.15rem;
          }
        }
      `}</style>
      </div>
    </>
  )
}