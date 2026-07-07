'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Bike,
  Route,
  Gauge,
  CalendarDays,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  Plus,
  Trash2,
  Euro,
  Play,
  History,
  FolderHeart,
  Pencil,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GpxUploader } from '@/components/gpx-uploader'
import { StatCard } from '@/components/stat-card'
import { parseGpx, type ParsedTrip } from '@/lib/gpx-parser'
import { saveTripToSupabase, updateTripWithGpx, updateTripExpenses, type ExpenseInput } from '@/lib/save-trip'
import { supabase } from '@/lib/supabase'

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

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function TripDashboard() {
  const [mode, setMode] = useState<AppMode>('select')
  const [trip, setTrip] = useState<ParsedTrip | null>(null)
  const [customName, setCustomName] = useState<string>('')
  const [customDate, setCustomDate] = useState<string>('')
  
  // Stati per il database
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [allTrips, setAllTrips] = useState<any[]>([])
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null)

  // Spese temporanee (sia per nuovi viaggi che per modifiche)
  const [expenses, setExpenses] = useState<ExpenseInput[]>([])
  const [selectedCatId, setSelectedCatId] = useState<number>(1)
  const [expenseAmount, setExpenseAmount] = useState<string>('')
  const [expenseNotes, setExpenseNotes] = useState<string>('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Scarica le categorie di spesa
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

  // Scarica TUTTI i viaggi salvati nel database per il Diario di Bordo
  const fetchAllTrips = async () => {
    const { data } = await supabase
      .from('trips')
      .select('id, title, trip_date, total_km')
      .order('trip_date', { ascending: false })
    
    if (data) {
      setAllTrips(data)
    }
  }

  // Carica i dati all'avvio e dopo ogni salvataggio
  useEffect(() => {
    fetchCategories()
    fetchAllTrips()
  }, [mode, saveState])

  const startLiveTrip = () => {
    setMode('live')
    setCustomName('Nuovo Giro Goldwing')
    setCustomDate(new Date().toISOString().slice(0, 10))
    setExpenses([])
    setTrip(null)
    setEditingTripId(null)
  }

  // Attiva la modalità modifica spese per un viaggio esistente
  const startEditingExpenses = async (tripId: string, title: string, dateStr: string) => {
    setLoading(true)
    setEditingTripId(tripId)
    setCustomName(title)
    setCustomDate(dateStr ? dateStr.slice(0, 10) : '')
    setExpenses([])
    setTrip(null)

    // Scarica le spese correnti di questo specifico viaggio
    const { data, error } = await supabase
      .from('expenses')
      .select('category_id, amount, notes')
      .eq('trip_id', tripId)

    if (!error && data) {
      setExpenses(data.map(e => ({
        category_id: e.category_id,
        amount: Number(e.amount),
        notes: e.notes || undefined
      })))
    }

    // Scarica anche i punti mappa se esistono per farli vedere nello schermo laterale
    const { data: pointsData } = await supabase
      .from('track_points')
      .select('latitude, longitude')
      .eq('trip_id', tripId)
      .order('id', { ascending: true })

    if (pointsData && pointsData.length > 0) {
      setTrip({
        name: title,
        date: dateStr,
        totalKm: 0, // non serve ricalcolarlo per la sola visualizzazione
        points: pointsData.map(p => ({ lat: p.latitude, lng: p.longitude })),
        maxSpeedKmh: 0,
        maxElevation: null
      })
    }

    setMode('edit_expenses')
    setLoading(false)
  }

  const addExpense = () => {
    const amount = parseFloat(expenseAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Inserisci un importo valido.')
      return
    }
    setExpenses((prev) => [...prev, {
      category_id: selectedCatId,
      amount: amount,
      notes: expenseNotes.trim() || undefined,
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

  const handleFile = useCallback((fileName: string, content: string) => {
    setError(null)
    setSaveState('idle')
    setSaveMessage(null)

    if (content === '__INVALID__') {
      setError(`Formato non supportato per "${fileName}". Usa un file .gpx o .xml.`)
      return
    }

    setLoading(true)
    setTimeout(() => {
      try {
        const fallback = fileName.replace(/\.(gpx|xml)$/i, '')
        const parsed = parseGpx(content, fallback)
        if (parsed.points.length === 0) {
          setError('Nessun punto traccia trovato nel file.')
          setTrip(null)
        } else {
          setTrip(parsed)
          setCustomName(parsed.name)
          setCustomDate(parsed.date ? parsed.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
          if (!updatingTripId) {
            setMode('gpx')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore nella lettura del file.')
        setTrip(null)
      } finally {
        setLoading(false)
      }
    }, 60)
  }, [updatingTripId])

  const handleSave = async () => {
    setSaveState('saving')
    setSaveMessage(null)

    try {
      if (mode === 'edit_expenses' && editingTripId) {
        // Aggiorna solo la lista spese del viaggio esistente
        await updateTripExpenses(editingTripId, expenses)
        setSaveState('saved')
        alert('Spese del viaggio aggiornate con successo nel cloud!')
        setMode('select')
      } else if (updatingTripId && trip) {
        // Associa GPX a viaggio live esistente
        const pointsAdded = await updateTripWithGpx(updatingTripId, trip.totalKm, trip.points)
        setSaveState('saved')
        setUpdatingTripId(null)
        setTrip(null)
        setMode('select')
        alert(`Mappa agganciata! Aggiunti ${pointsAdded} punti GPS.`)
      } else {
        // Nuovo viaggio (Live o GPX)
        const titleToSave = customName.trim() || 'Giro Goldwing'
        const dateToSave = customDate || new Date().toISOString().slice(0, 10)
        const kmToSave = trip ? trip.totalKm : 0
        const pointsToSave = trip ? trip.points : []

        await saveTripToSupabase(titleToSave, dateToSave, kmToSave, pointsToSave, expenses)
        setSaveState('saved')
        setExpenses([])
        setTrip(null)
        setMode('select')
        alert('Nuovo viaggio memorizzato nel cloud!')
      }
    } catch (err) {
      setSaveState('idle')
      alert(`Errore nel salvataggio: ${err instanceof Error ? err.message : 'Errore generico'}`)
    }
  }

  const stats = useMemo(() => {
    if (!trip || mode === 'edit_expenses') return null
    return {
      km: trip.totalKm.toFixed(1),
      maxSpeed: trip.maxSpeedKmh > 0 ? trip.maxSpeedKmh.toFixed(0) : '—',
      maxEle: trip.maxElevation !== null ? Math.round(trip.maxElevation).toString() : '—',
    }
  }, [trip, mode])

  // Filtra i viaggi "Incomplete" (ovvero quelli inseriti live con km = 0)
  const incompleteTrips = useMemo(() => {
    return allTrips.filter(t => t.total_km === 0)
  }, [allTrips])

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Bike className="size-6" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight text-foreground">GoldWing Rides</h1>
              <p className="text-sm text-muted-foreground">Diario di viaggio e contabilità per la tua Honda Goldwing</p>
            </div>
          </div>
          {mode !== 'select' && (
            <Button variant="outline" size="sm" onClick={() => { setMode('select'); setTrip(null); setUpdatingTripId(null); setEditingTripId(null); }}>
              Torna al Menu
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {mode === 'select' && (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                <div className="space-y-2">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Play className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold">Inizia un Viaggio Live (In sella)</h3>
                  <p className="text-sm text-muted-foreground">
                    Ottimo dal telefono durante il giro: inserisci al volo benzina, pedaggi e note senza mappa.
                  </p>
                </div>
                <Button onClick={startLiveTrip} className="w-full gap-2 font-medium">
                  Avvia Viaggio Live 🏍️
                </Button>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                <div className="space-y-2">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapIcon className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold">Carica Traccia GPX (Da PC / Casa)</h3>
                  <p className="text-sm text-muted-foreground">
                    Carica il file GPS esportato per calcolare chilometri reali, telemetria e inserire spese.
                  </p>
                </div>
                <GpxUploader onFile={handleFile} loading={loading} error={error} />
              </div>
            </div>

            {/* SEZIONE 1: VIAGGI LIVE DA ASSOCIARE */}
            {incompleteTrips.length > 0 && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 space-y-4">
                <div className="flex items-center gap-2 text-orange-500">
                  <History className="size-5" />
                  <h3 className="font-bold text-foreground">Viaggi Live in attesa di file GPX</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {incompleteTrips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-background text-sm">
                      <div className="truncate mr-3">
                        <p className="font-bold text-foreground truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.trip_date)}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setUpdatingTripId(t.id); setCustomName(t.title); }}>
                        Associa Mappa GPX
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SEZIONE 2: DIARIO DI BORDO GENERALE (MODIFICA SPESE) */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderHeart className="size-5 text-primary" />
                <h3 className="font-bold text-foreground">Diario di Bordo: Gestisci i tuoi Viaggi nel Cloud</h3>
              </div>
              
              {allTrips.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Nessun viaggio ancora salvato nel cloud. Inizia il tuo primo giro!</p>
              ) : (
                <div className="divide-y divide-border/60 max-h-[400px] overflow-y-auto pr-2">
                  {allTrips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.trip_date)} • <span className="font-mono">{t.total_km > 0 ? `${t.total_km.toFixed(1)} km` : 'Modalità Live'}</span>
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startEditingExpenses(t.id, t.title, t.trip_date)}>
                        <Pencil className="size-3.5" /> Gestisci Spese
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {updatingTripId && !trip && (
          <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 space-y-4 text-center">
            <MapIcon className="size-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold">Inietta traccia mappa per: "{customName}"</h3>
            <p className="text-sm text-muted-foreground">Seleziona il file GPX del giro per inserire mappa e statistiche.</p>
            <GpxUploader onFile={handleFile} loading={loading} error={error} />
            <Button variant="ghost" size="sm" onClick={() => setUpdatingTripId(null)} className="w-full">Annulla</Button>
          </div>
        )}

        {(mode === 'live' || mode === 'gpx' || mode === 'edit_expenses') && (
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                <div className="space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {mode === 'edit_expenses' ? 'Modifica Registro Spese' : 'Dettagli del Viaggio'}
                  </label>
                  
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={customName}
                      disabled={mode === 'edit_expenses'}
                      className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-4 text-base font-semibold text-foreground focus:outline-none"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type="date"
                      value={customDate}
                      disabled={mode === 'edit_expenses'}
                      className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 px-4 text-base font-semibold text-foreground focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-border/60 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Contabilità Spese</label>
                    <span className="text-sm font-bold text-primary">Totale: €{totalExpensesCost}</span>
                  </div>

                  <div className="space-y-2 rounded-xl bg-secondary/10 p-3 border border-border/40">
                    <select
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground focus:outline-none"
                    >
                      {expenseCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <div className="relative flex items-center flex-1">
                        <Euro className="absolute left-2.5 size-4 text-muted-foreground" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Importo €"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm text-foreground focus:outline-none"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Note"
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="w-full flex-[1.5] rounded-lg border border-border bg-background py-1.5 px-3 text-sm text-foreground focus:outline-none"
                      />
                      <Button type="button" onClick={addExpense} size="sm" className="px-2.5">
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {expenses.length > 0 && (
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1">
                      {expenses.map((exp, idx) => {
                        const catName = expenseCategories.find((c) => c.id === exp.category_id)?.name || 'Spesa'
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30 border border-border/20">
                            <div className="truncate mr-2">
                              <p className="font-semibold text-foreground truncate">{catName}</p>
                              {exp.notes && <p className="text-muted-foreground text-[10px] truncate italic">"{exp.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-foreground">€{exp.amount.toFixed(2)}</span>
                              <button onClick={() => removeExpense(idx)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Button onClick={handleSave} disabled={saveState === 'saving'} size="lg" className="w-full gap-2 font-medium border-t border-border/40">
                  {saveState === 'saving' && <Loader2 className="size-4 animate-spin" />}
                  {saveState === 'saved' && <CheckCircle2 className="size-4" />}
                  {saveState === 'idle' && <CloudUpload className="size-4" />}
                  {saveState === 'saving'
                    ? 'Allineamento dati cloud…'
                    : mode === 'edit_expenses'
                      ? 'Salva Modifiche Spese nel Cloud'
                      : 'Salva Viaggio nel Cloud'}
                </Button>
              </div>
            </section>

            <section className="space-y-6">
              {stats && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard icon={Route} label="Km totali traccia" value={stats.km} unit="km" />
                  <StatCard icon={Gauge} label="Velocità max" value={stats.maxSpeed} unit="km/h" />
                </div>
              )}

              <div className="relative h-[440px] overflow-hidden rounded-2xl border border-border bg-secondary/30 lg:h-[560px]">
                {trip ? (
                  <TripMap points={trip.points} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <Play className="size-7 text-primary animate-pulse" />
                    <p className="max-w-xs text-sm text-muted-foreground">
                      {mode === 'edit_expenses' ? 'Questo viaggio non conteneva una mappa GPX.' : 'Sei in sella! Registrazione contabilità attiva.'}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}