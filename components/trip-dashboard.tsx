'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  Bike,
  Route,
  Gauge,
  Mountain,
  CalendarDays,
  MapPin,
  CloudUpload,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  AlertCircle,
  Type,
  Plus,
  Trash2,
  Euro,
  Play,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GpxUploader } from '@/components/gpx-uploader'
import { StatCard } from '@/components/stat-card'
import { parseGpx, type ParsedTrip } from '@/lib/gpx-parser'
import { saveTripToSupabase, updateTripWithGpx, type ExpenseInput } from '@/lib/save-trip'
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
type AppMode = 'select' | 'live' | 'gpx'

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
  
  // Categorie dinamiche scaricate da Supabase
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [incompleteTrips, setIncompleteTrips] = useState<any[]>([])
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null)

  // Spese temporanee
  const [expenses, setExpenses] = useState<ExpenseInput[]>([])
  const [selectedCatId, setSelectedCatId] = useState<number>(1)
  const [expenseAmount, setExpenseAmount] = useState<string>('')
  const [expenseNotes, setExpenseNotes] = useState<string>('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

 // Scarica le categorie di spesa reali da Supabase
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name')
        .order('id', { ascending: true })
      
      if (error) {
        console.error("Errore Supabase Categorie:", error)
        setError(`Errore nel caricamento delle categorie: ${error.message}`)
        return
      }

      if (data && data.length > 0) {
        setExpenseCategories(data)
        setSelectedCatId(data[0].id)
      }
    } catch (e) {
      console.error("Errore di rete Categorie:", e)
    }
  }

  // Carica i viaggi senza mappa da Supabase
  const fetchIncompleteTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('id, title, trip_date, total_km')
        .eq('total_km', 0)
        .order('trip_date', { ascending: false })
      
      if (!error && data) {
        setIncompleteTrips(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Esegui il caricamento dei dati in modo sicuro all'avvio
  useEffect(() => {
    fetchCategories()
    fetchIncompleteTrips()
  }, []) // Esegui una volta sola al caricamento della pagina

  const startLiveTrip = () => {
    setMode('live')
    setCustomName('Nuovo Giro Goldwing')
    setCustomDate(new Date().toISOString().slice(0, 10))
    setExpenses([])
    setTrip(null)
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
    setSaveError(null)

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
      } finally { // <--- CORRETTO DA FINAL A FINALLY!
        setLoading(false)
      }
    }, 60)
  }, [updatingTripId])

  const handleSave = async () => {
    setSaveState('saving')
    setSaveError(null)
    setSaveMessage(null)

    try {
      if (updatingTripId && trip) {
        const pointsAdded = await updateTripWithGpx(updatingTripId, trip.totalKm, trip.points)
        setSaveState('saved')
        setSaveMessage(`Mappa sincronizzata con successo! Aggiunti ${pointsAdded} punti GPS.`)
        setUpdatingTripId(null)
        setTrip(null)
        setMode('select')
      } else {
        const titleToSave = customName.trim() || 'Giro Goldwing'
        const dateToSave = customDate || new Date().toISOString().slice(0, 10)
        const kmToSave = trip ? trip.totalKm : 0
        const pointsToSave = trip ? trip.points : []

        const { pointCount, expenseCount } = await saveTripToSupabase(
          titleToSave,
          dateToSave,
          kmToSave,
          pointsToSave,
          expenses
        )

        setSaveState('saved')
        setSaveMessage(`Viaggio salvato! (${pointCount} punti mappa, ${expenseCount} spese salvate nel cloud)`)
        setExpenses([])
        setTrip(null)
        setMode('select')
      }
    } catch (err) {
      setSaveState('idle')
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio.'
      setSaveError(message)
      alert(`Errore: ${message}`)
    }
  }

  const stats = useMemo(() => {
    if (!trip) return null
    return {
      km: trip.totalKm.toFixed(1),
      maxSpeed: trip.maxSpeedKmh > 0 ? trip.maxSpeedKmh.toFixed(0) : '—',
      maxEle: trip.maxElevation !== null ? Math.round(trip.maxElevation).toString() : '—',
    }
  }, [trip])

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
              <p className="text-sm text-muted-foreground">Diario di viaggio per la tua Honda Goldwing</p>
            </div>
          </div>
          {mode !== 'select' && (
            <Button variant="outline" size="sm" onClick={() => { setMode('select'); setTrip(null); setUpdatingTripId(null); }}>
              Menu Principale
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {mode === 'select' && !updatingTripId && (
          <div className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                <div className="space-y-2">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Play className="size-6" />
                  </div>
                  <h3 className="text-lg font-bold">Inizia un Viaggio Live (In viaggio)</h3>
                  <p className="text-sm text-muted-foreground text-balance">
                    Apri questa modalità direttamente dal telefono durante il giro per segnare i rifornimenti di benzina, pedaggi e note senza bisogno della mappa GPS.
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
                  <h3 className="text-lg font-bold">Carica Traccia GPX (Da casa)</h3>
                  <p className="text-sm text-muted-foreground text-balance">
                    Hai già completato il tour? Trascina il file GPX esportato dal tuo navigatore per generare la mappa, calcolare le statistiche e inserire le spese finali.
                  </p>
                </div>
                <div className="border border-dashed border-border rounded-xl p-2 bg-secondary/10">
                  <GpxUploader onFile={handleFile} loading={loading} error={error} />
                </div>
              </div>
            </div>

            {incompleteTrips.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <History className="size-5 text-primary" />
                  <h3 className="font-bold text-foreground">I tuoi viaggi On-The-Road (Senza mappa GPS)</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {incompleteTrips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-secondary/20 text-sm">
                      <div className="truncate mr-3">
                        <p className="font-bold text-foreground truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.trip_date)}</p>
                      </div>
                      <Button size="sm" onClick={() => { setUpdatingTripId(t.id); setCustomName(t.title); }}>
                        Associa Mappa GPX
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {updatingTripId && !trip && (
          <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 space-y-4 text-center">
            <MapIcon className="size-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold">Carica la traccia per: "{customName}"</h3>
            <p className="text-sm text-muted-foreground">Seleziona il file GPS per questo giro per calcolare la telemetria ed inserire la mappa.</p>
            <GpxUploader onFile={handleFile} loading={loading} error={error} />
            <Button variant="ghost" size="sm" onClick={() => setUpdatingTripId(null)} className="w-full">Annulla</Button>
          </div>
        )}

        {(mode === 'live' || mode === 'gpx' || (updatingTripId && trip)) && (
          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <section className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                <div className="space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {updatingTripId ? 'Sincronizzazione Traccia GPS' : 'Dettagli del Viaggio'}
                  </label>
                  
                  <div className="relative flex items-center">
                    <Type className="absolute left-3 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      disabled={!!updatingTripId}
                      placeholder="Nome del viaggio..."
                      className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-base font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="relative flex items-center">
                    <CalendarDays className="absolute left-3 size-4 text-muted-foreground" />
                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      disabled={!!updatingTripId}
                      className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-base font-semibold text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                {!updatingTripId && (
                  <div className="border-t border-border/60 pt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">Contabilità Spese Giro</label>
                      <span className="text-sm font-bold text-primary">Totale: €{totalExpensesCost}</span>
                    </div>

                    <div className="space-y-2 rounded-xl bg-secondary/10 p-3 border border-border/40">
                      {/* Menu a tendina DINAMICO popolato da Supabase */}
                      <select
                        value={selectedCatId}
                        onChange={(e) => setSelectedCatId(parseInt(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:outline-none"
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
                            className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-sm text-foreground focus:border-primary focus:outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Note"
                          value={expenseNotes}
                          onChange={(e) => setExpenseNotes(e.target.value)}
                          className="w-full flex-[1.5] rounded-lg border border-border bg-background py-1.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                        />
                        <Button type="button" onClick={addExpense} size="sm" className="px-2.5">
                          <Plus className="size-4" />
                        </Button>
                      </div>
                    </div>

                    {expenses.length > 0 && (
                      <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
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
                )}

                <Button onClick={handleSave} disabled={saveState === 'saving'} size="lg" className="w-full gap-2 font-medium border-t border-border/40">
                  {saveState === 'saving' && <Loader2 className="size-4 animate-spin" />}
                  {saveState === 'saved' && <CheckCircle2 className="size-4" />}
                  {saveState === 'idle' && <CloudUpload className="size-4" />}
                  {saveState === 'saving'
                    ? 'Salvataggio nel cloud in corso…'
                    : updatingTripId
                      ? 'Inietta Traccia GPS e Chiudi'
                      : mode === 'live'
                        ? 'Salva Viaggio Live nel Cloud'
                        : 'Salva Viaggio + Mappa nel Cloud'}
                </Button>
              </div>
            </section>

            <section className="space-y-6">
              {stats ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatCard icon={Route} label="Km totali traccia" value={stats.km} unit="km" />
                  <StatCard icon={Gauge} label="Velocità massima raggiunta" value={stats.maxSpeed} unit="km/h" />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-card/30 p-6 text-center text-sm text-muted-foreground">
                  🚨 Modalità Viaggio Live attiva: Statistiche chilometriche e telemetria si attiveranno non appena caricherai il file GPX a fine giro.
                </div>
              )}

              <div className="relative h-[440px] overflow-hidden rounded-2xl border border-border bg-secondary/30 lg:h-[560px]">
                {trip ? (
                  <TripMap points={trip.points} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground">
                      <Play className="size-7 text-primary animate-pulse" />
                    </div>
                    <p className="max-w-xs text-balance text-sm text-muted-foreground font-medium">
                      Sei in sella! Il viaggio è in corso di registrazione dati. Nessuna traccia mappa da disegnare al momento.
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