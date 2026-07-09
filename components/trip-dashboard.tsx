'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GpxUploader } from '@/components/gpx-uploader'
import { StatCard } from '@/components/stat-card'
import { parseGpx, type ParsedTrip } from '@/lib/gpx-parser'
import { updateTripWithGpx, updateTripExpenses, type ExpenseInput } from '@/lib/save-trip'
import { supabase } from '@/lib/supabase'
import { MAX_PLAUSIBLE_SPEED_KMH } from '@/lib/gpx-parser'
import { PlanningTab } from '@/components/trip/PlanningTab'

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
type ActiveTab = 'planning' |'expenses' | 'map' | 'notes'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

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

  //Stati x alberghi
  const [accommodations, setAccommodations] = useState<any[]>([])

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
      .select('id, title, trip_date, trip_end_date, total_km, notes')
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
    setActiveTab('planning')
    
    const start = dateStr ? dateStr.slice(0, 10) : ''
    setCustomDate(start)
    setCustomEndDate(endDateStr ? endDateStr.slice(0, 10) : start)
    setExpenseDate(start || new Date().toISOString().slice(0, 10))
    
    setExpenses([]) 
    setTrip(null)

    const currentTripData = allTrips.find(t => t.id === tripId)
    setTripNotes(currentTripData?.notes || '')

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
            maxElevation: null,
            minElevation: null,
            avgElevation: null
          })
        }
      }
    } catch (err) {
      console.error("Errore recupero punti:", err)
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
            notes: tripNotes.trim() || null
          })
          .eq('id', editingTripId)

        if (updateTripError) throw updateTripError

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
            notes: tripNotes.trim() || null
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
    return {
      km: trip.totalKm.toFixed(1),
      maxSpeed: trip.maxSpeedKmh > 0 ? trip.maxSpeedKmh.toFixed(0) : '—',
    }
  }, [trip])

  const hasValidPoints = useMemo(() => {
    return !!(trip && trip.points && Array.isArray(trip.points) && trip.points.length > 0 && trip.points[0].lat && trip.points[0].lon)
  }, [trip])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Bike className="size-5.5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">GoldWing Rides</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Logbook & Contabilità Goldwing</p>
            </div>
          </div>
          {mode !== 'select' && (
            <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={() => { setMode('select'); setTrip(null); setEditingTripId(null); setExpenses([]); setSaveState('idle'); setHasNewGpxLoaded(false); }}>
              Torna al Menu
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6">
        {mode === 'select' && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Play className="size-5" />
                  </div>
                  <h3 className="text-base font-bold">Viaggio Live (In sella)</h3>
                  <p className="text-xs text-muted-foreground">
                    Inserisci spese, note e percorsi in tempo reale dal telefono. Potrai caricare la traccia GPX anche in un secondo momento.
                  </p>
                </div>
                <Button onClick={startLiveTrip} className="w-full gap-2 text-xs font-bold rounded-xl h-10">
                  Avvia Viaggio Live 🏍️
                </Button>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between space-y-4 shadow-sm">
                <div className="space-y-2">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapIcon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold">Importa File GPX</h3>
                  <p className="text-xs text-muted-foreground">
                    Crea un nuovo viaggio importando direttamente il file del navigatore per estrarre la mappa, i chilometri e configurare i costi.
                  </p>
                </div>
                <GpxUploader onFile={handleFile} loading={loading} error={error} />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground pb-2 border-b border-border/60">
                <FolderHeart className="size-4.5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Diario delle Avventure</h3>
              </div>
              
              {allTrips.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-4">Nessun viaggio salvato nel database.</p>
              ) : (
                <div className="divide-y divide-border/50 max-h-[350px] overflow-y-auto pr-1">
                  {allTrips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2.5 text-xs first:pt-0 last:pb-0">
                      <div className="space-y-0.5 max-w-[70%]">
                        <p className="font-bold text-foreground truncate text-sm">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(t.trip_date)} • <span className="font-mono font-medium text-foreground bg-secondary/60 px-1 rounded">{t.total_km > 0 ? `${t.total_km.toFixed(1)} km` : 'Solo Spese'}</span>
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-[11px] gap-1 shrink-0" onClick={() => startEditingExpenses(t.id, t.title, t.trip_date, t.trip_end_date)}>
                        <Pencil className="size-3" /> Gestisci
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
            
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Titolo Viaggio</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Es. Weekend in Trentino"
                    className="w-full rounded-lg border border-border bg-secondary/10 py-2 px-3 text-sm font-bold text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Data Inizio</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary/10 py-2 px-3 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Data Fine</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-secondary/10 py-2 px-3 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <div className="flex border border-border bg-card p-1 rounded-xl shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('planning')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'planning' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/30'}`}
            >
              <Route className="size-4" />
              Pianificazione
            </button>
              <button
                type="button"
                onClick={() => setActiveTab('expenses')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'expenses' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/30'}`}
              >
                <Receipt className="size-4" />
                Spese (€)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('map')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'map' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/30'}`}
              >
                <MapIcon className="size-4" />
                Mappa & GPX
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'notes' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-secondary/30'}`}
              >
                <FileText className="size-4" />
                Note Diario
              </button>
            </div>

            <div className="grid gap-4">
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

                  accommodations={accommodations}
                />
             )}

              {activeTab === 'expenses' && (
                <div className="space-y-4 grid lg:grid-cols-[1fr_320px] gap-4 lg:space-y-0">
                  
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Plus className="size-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Nuovo Movimento</h4>
                      </div>
                      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 bg-secondary/10 p-3 rounded-lg border border-border/40">
                        <div className="space-y-0.5 col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Categoria</span>
                          <select
                            value={selectedCatId}
                            onChange={(e) => setSelectedCatId(parseInt(e.target.value))}
                            className="w-full rounded-md border border-border bg-background p-1.5 text-xs font-medium text-foreground focus:outline-none"
                          >
                            {expenseCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Data Spesa</span>
                          <input
                            type="date"
                            value={expenseDate}
                            onChange={(e) => setExpenseDate(e.target.value)}
                            className="w-full rounded-md border border-border bg-background p-1.5 text-xs text-foreground focus:outline-none"
                          />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Cifra (€)</span>
                          <div className="relative flex items-center">
                            <Euro className="absolute left-2 size-3 text-muted-foreground" />
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={expenseAmount}
                              onChange={(e) => setExpenseAmount(e.target.value)}
                              className="w-full rounded-md border border-border bg-background py-1.5 pl-6 pr-1 text-xs font-bold text-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 sm:col-span-3 flex gap-2 items-end pt-1">
                          <div className="flex-1 space-y-0.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Dettagli / Note</span>
                            <input
                              type="text"
                              placeholder="Es. Benzina Total - Pieno"
                              value={expenseNotes}
                              onChange={(e) => setExpenseNotes(e.target.value)}
                              className="w-full rounded-md border border-border bg-background py-1.5 px-2.5 text-xs text-foreground focus:outline-none"
                            />
                          </div>
                          <Button type="button" onClick={addExpense} size="sm" className="h-8 px-3 font-bold text-xs gap-1 rounded-md">
                            Aggiungi
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lista Voci Inserite ({expenses.length})</h4>
                      {expenses.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-6 bg-secondary/5 rounded-lg border border-dashed border-border">
                          Nessun costo inserito in questo tour.
                        </p>
                      ) : (
                        <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1">
                          {expenses.map((exp, idx) => {
                            const catName = expenseCategories.find((c) => c.id === exp.category_id)?.name || 'Spesa'
                            return (
                              <div key={idx} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-background border border-border/50 shadow-sm">
                                <div className="truncate mr-2 space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-foreground text-xs">{catName}</span>
                                    <span className="text-[9px] text-muted-foreground font-mono bg-secondary px-1 rounded">
                                      {formatDate(exp.expense_date)}
                                    </span>
                                  </div>
                                  {exp.notes && <p className="text-muted-foreground italic text-[11px] truncate">"{exp.notes}"</p>}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-xs bg-secondary/50 px-2 py-0.5 rounded-md border border-border/10">€{exp.amount.toFixed(2)}</span>
                                  <button onClick={() => removeExpense(idx)} className="text-muted-foreground hover:text-destructive p-1 transition-colors">
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Totale Speso</span>
                        <span className="text-xl font-black text-primary font-mono">€ {totalExpensesCost}</span>
                      </div>
                      <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                        {expenseCategories.map((cat) => {
                          const subtotal = categorySubtotals[cat.id] || 0
                          return (
                            <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/10 border border-border/20 text-xs">
                              <span className="text-muted-foreground truncate mr-2">{cat.name}</span>
                              <span className="font-mono font-bold text-foreground shrink-0 bg-background px-1.5 py-0.5 rounded border border-border/30">
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
                    <div className="grid gap-3 grid-cols-2">
                      <StatCard icon={Route} label="Km totali" value={stats.km} unit="km" />
                      <StatCard icon={Gauge} label="Velocità max rilevata" value={stats.maxSpeed} unit="km/h" />
                    </div>
                  )}

                  <div className="relative h-[380px] sm:h-[450px] overflow-hidden rounded-xl border border-border bg-secondary/10 shadow-inner">
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

                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
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

            <Button onClick={handleSave} disabled={saveState === 'saving'} size="lg" className="w-full gap-2 font-bold py-5 text-sm rounded-xl shadow-md mt-2">
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
    </div>
  )
}