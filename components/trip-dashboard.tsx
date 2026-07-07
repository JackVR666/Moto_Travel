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
  History,
  FolderHeart,
  Pencil,
  PieChart,
  Receipt,
  FileText,
  Calendar,
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
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function TripDashboard() {
  const [mode, setMode] = useState<AppMode>('select')
  const [trip, setTrip] = useState<ParsedTrip | null>(null)
  const [customName, setCustomName] = useState<string>('')
  const [customDate, setCustomDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')
  
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [allTrips, setAllTrips] = useState<any[]>([])
  const [editingTripId, setEditingTripId] = useState<string | null>(null)
  const [updatingTripId, setUpdatingTripId] = useState<string | null>(null)

  // Stati singola spesa
  const [expenses, setExpenses] = useState<ExpenseInput[]>([])
  const [selectedCatId, setSelectedCatId] = useState<number>(1)
  const [expenseAmount, setExpenseAmount] = useState<string>('')
  const [expenseNotes, setExpenseNotes] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')

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
    const { data } = await supabase
      .from('trips')
      .select('id, title, trip_date, trip_end_date, total_km')
      .order('trip_date', { ascending: false })
    
    if (data) {
      setAllTrips(data)
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchAllTrips()
  }, [mode, saveState])

  const startLiveTrip = () => {
    const today = new Date().toISOString().slice(0, 10)
    setMode('live')
    setCustomName('Nuovo Giro Goldwing')
    setCustomDate(today)
    setCustomEndDate(today)
    setExpenseDate(today)
    setExpenses([])
    setTrip(null)
    setEditingTripId(null)
  }

  const startEditingExpenses = async (tripId: string, title: string, dateStr: string, endDateStr: string) => {
    setLoading(true)
    setEditingTripId(tripId)
    setCustomName(title)
    const start = dateStr ? dateStr.slice(0, 10) : ''
    setCustomDate(start)
    setCustomEndDate(endDateStr ? endDateStr.slice(0, 10) : start)
    setExpenseDate(start || new Date().toISOString().slice(0, 10))
    setExpenses([])
    setTrip(null)

    const { data, error } = await supabase
      .from('expenses')
      .select('category_id, amount, notes, expense_date')
      .eq('trip_id', tripId)

    if (!error && data) {
      setExpenses(data.map(e => ({
        category_id: e.category_id,
        amount: Number(e.amount),
        notes: e.notes || undefined,
        expense_date: e.expense_date ? e.expense_date.slice(0, 10) : start
      })))
    }

    const { data: pointsData } = await supabase
      .from('track_points')
      .select('latitude, longitude')
      .eq('trip_id', tripId)
      .order('id', { ascending: true })

    if (pointsData && pointsData.length > 0) {
      setTrip({
        name: title,
        date: dateStr,
        totalKm: 0,
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

  // Calcola il totale generale delle spese
  const totalExpensesCost = useMemo(() => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)
  }, [expenses])

  // NOVITÀ: Calcola i subtotali suddivisi per categoria in tempo reale
  const categorySubtotals = useMemo(() => {
    const subtotals: Record<number, number> = {}
    // Inizializza tutte le categorie note a 0
    expenseCategories.forEach(cat => { subtotals[cat.id] = 0 })
    
    // Somma le spese inserite
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
          const fileDate = parsed.date ? parsed.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
          setTrip(parsed)
          setCustomName(parsed.name)
          setCustomDate(fileDate)
          setCustomEndDate(fileDate)
          setExpenseDate(fileDate)
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
    try {
      if (mode === 'edit_expenses' && editingTripId) {
        await updateTripExpenses(editingTripId, expenses)
        setSaveState('saved')
        alert('Spese del viaggio aggiornate nel cloud!')
        setMode('select')
      } else if (updatingTripId && trip) {
        const pointsAdded = await updateTripWithGpx(updatingTripId, trip.totalKm, trip.points)
        setSaveState('saved')
        setUpdatingTripId(null)
        setTrip(null)
        setMode('select')
        alert(`Mappa agganciata correttamente! Aggiunti ${pointsAdded} punti GPS.`)
      } else {
        const titleToSave = customName.trim() || 'Giro Goldwing'
        const startToSave = customDate || new Date().toISOString().slice(0, 10)
        const endToSave = customEndDate || startToSave
        const kmToSave = trip ? trip.totalKm : 0
        const pointsToSave = trip ? trip.points : []

        await saveTripToSupabase(titleToSave, startToSave, endToSave, kmToSave, pointsToSave, expenses)
        setSaveState('saved')
        setExpenses([])
        setTrip(null)
        setMode('select')
        alert('Viaggio memorizzato con successo nel cloud!')
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

            {/* VIAGGI LIVE IN ATTESA */}
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
                        <p className="text-xs text-muted-foreground">Ininizio: {formatDate(t.trip_date)}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => { setUpdatingTripId(t.id); setCustomName(t.title); }}>
                        Associa Mappa GPX
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DIARIO DI BORDO GENERALE */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FolderHeart className="size-5 text-primary" />
                <h3 className="font-bold text-foreground">Diario di Bordo: Gestisci i tuoi Viaggi nel Cloud</h3>
              </div>
              
              {allTrips.length === 0 ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">Nessun viaggio ancora salvato nel cloud.</p>
              ) : (
                <div className="divide-y divide-border/60 max-h-[400px] overflow-y-auto pr-2">
                  {allTrips.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Dal {formatDate(t.trip_date)} al {formatDate(t.trip_end_date || t.trip_date)} • <span className="font-mono">{t.total_km > 0 ? `${t.total_km.toFixed(1)} km` : 'Modalità Live'}</span>
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startEditingExpenses(t.id, t.title, t.trip_date, t.trip_end_date)}>
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
            <p className="text-sm text-muted-foreground">Seleziona il file GPX del giro.</p>
            <GpxUploader onFile={handleFile} loading={loading} error={error} />
            <Button variant="ghost" size="sm" onClick={() => setUpdatingTripId(null)} className="w-full">Annulla</Button>
          </div>
        )}

        {/* --- NUOVA INTERFACCIA CRUSCOTTO STRUTTURATA A QUATTRO RIQUADRI --- */}
        {(mode === 'live' || mode === 'gpx' || mode === 'edit_expenses') && (
          <div className="space-y-6">
            
            {/* RIQUADRO 1: PARTE GENERALE - DESCRIZIONE E DATE DEL VIAGGIO */}
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <FileText className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">1. Informazioni Generali del Viaggio</h3>
              </div>
              <div className="grid gap-4 md:grid-cols-3 items-end">
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Titolo del Tour / Località</span>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    disabled={mode === 'edit_expenses'}
                    placeholder="Es. Fine settimana sulle Dolomiti"
                    className="w-full rounded-xl border border-border bg-secondary/15 py-2.5 px-4 text-base font-semibold text-foreground focus:outline-none disabled:opacity-75"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Data Partenza</span>
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    disabled={mode === 'edit_expenses'}
                    className="w-full rounded-xl border border-border bg-secondary/15 py-2.5 px-4 text-sm font-medium text-foreground focus:outline-none disabled:opacity-75"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Data Ritorno</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    disabled={mode === 'edit_expenses'}
                    className="w-full rounded-xl border border-border bg-secondary/15 py-2.5 px-4 text-sm font-medium text-foreground focus:outline-none disabled:opacity-75"
                  />
                </div>
              </div>
            </section>

            {/* GRIGLIA OPERATIVA DELLE SPESE E MAPPA */}
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              
              {/* COLONNA SINISTRA: TUTTO IL BLOCCO CONTABILITÀ DIVISO IN RIQUADRI */}
              <div className="space-y-6">
                
                {/* RIQUADRO 2: INSERIMENTO NUOVA SPESA */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-4">
                    <Receipt className="size-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">2. Inserimento Rapido Spesa</h3>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-3 bg-secondary/10 p-3.5 rounded-xl border border-border/40">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Categoria blindata</span>
                      <select
                        value={selectedCatId}
                        onChange={(e) => setSelectedCatId(parseInt(e.target.value))}
                        className="w-full rounded-lg border border-border bg-background p-2 text-xs font-medium text-foreground focus:outline-none"
                      >
                        {expenseCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Data Spesa</span>
                      <input
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background p-2 text-xs text-foreground focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground">Cifra in Euro (€)</span>
                      <div className="relative flex items-center">
                        <Euro className="absolute left-2.5 size-3.5 text-muted-foreground" />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-2 text-xs font-bold text-foreground focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3 flex gap-2 items-end pt-1">
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Note aggiuntive / Dettagli</span>
                        <input
                          type="text"
                          placeholder="Es. Benzina ENI - Pieno Passo Giau"
                          value={expenseNotes}
                          onChange={(e) => setExpenseNotes(e.target.value)}
                          className="w-full rounded-lg border border-border bg-background py-2 px-3 text-xs text-foreground focus:outline-none"
                        />
                      </div>
                      <Button type="button" onClick={addExpense} size="sm" className="h-9 px-4 font-bold gap-1">
                        <Plus className="size-4" /> Aggiungi Spesa
                      </Button>
                    </div>
                  </div>
                </section>

                {/* RIQUADRO 3: RIEPILOGO STATISTICHE E SUBTOTALI PER CATEGORIA */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <PieChart className="size-4 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">3. Riepilogo e Statistiche Categorie</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground block font-medium">TOTALE SPESO</span>
                      <span className="text-xl font-black text-primary font-mono">€ {totalExpensesCost}</span>
                    </div>
                  </div>

                  {/* Tabella / Griglia dei Subtotali */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {expenseCategories.map((cat) => {
                      const subtotal = categorySubtotals[cat.id] || 0
                      return (
                        <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-border/30 text-xs">
                          <span className="font-medium text-muted-foreground truncate mr-2">{cat.name}</span>
                          <span className="font-mono font-bold text-foreground shrink-0 bg-background px-2 py-1 rounded border border-border/40">
                            € {subtotal.toFixed(2)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </section>

                {/* RIQUADRO 4: CRONOLOGIA DELLE SINGOLE SPESE */}
                <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <History className="size-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">4. Registro analitico voci di spesa ({expenses.length})</h3>
                  </div>

                  {expenses.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6 bg-secondary/5 rounded-xl border border-dashed border-border">
                      Nessuna voce inserita nel registro spese per il momento.
                    </p>
                  ) : (
                    <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                      {expenses.map((exp, idx) => {
                        const catName = expenseCategories.find((c) => c.id === exp.category_id)?.name || 'Spesa'
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-3 rounded-xl bg-background border border-border/60 shadow-sm hover:border-border transition-colors">
                            <div className="truncate mr-3 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground text-sm">{catName}</span>
                                <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono font-medium flex items-center gap-1">
                                  <Calendar className="size-3" /> {formatDate(exp.expense_date)}
                                </span>
                              </div>
                              {exp.notes && <p className="text-muted-foreground italic text-xs">"{exp.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-mono font-black text-base text-foreground bg-secondary/30 px-2.5 py-1 rounded-lg border border-border/20">€{exp.amount.toFixed(2)}</span>
                              <button onClick={() => removeExpense(idx)} className="text-muted-foreground hover:text-destructive p-1 rounded-lg hover:bg-destructive/5 transition-colors">
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>

                {/* PULSANTE DI SALVATAGGIO CLOUD GENERALE */}
                <Button onClick={handleSave} disabled={saveState === 'saving'} size="lg" className="w-full gap-2 font-bold py-6 text-base rounded-xl shadow-md">
                  {saveState === 'saving' && <Loader2 className="size-5 animate-spin" />}
                  {saveState === 'saved' && <CheckCircle2 className="size-5" />}
                  {saveState === 'idle' && <CloudUpload className="size-5" />}
                  {saveState === 'saving'
                    ? 'Sincronizzazione dati cloud in corso…'
                    : mode === 'edit_expenses'
                      ? 'Salva Modifiche Spese nel Cloud ☁️'
                      : 'Salva Intero Viaggio nel Cloud ☁️'}
                </Button>

              </div>

              {/* COLONNA DESTRA: MAPPA E TELEMETRIA PERCORSO */}
              <div className="space-y-6">
                {stats && (
                  <div className="grid gap-3 grid-cols-2">
                    <StatCard icon={Route} label="Km totali traccia" value={stats.km} unit="km" />
                    <StatCard icon={Gauge} label="Velocità max" value={stats.maxSpeed} unit="km/h" />
                  </div>
                )}

                <div className="relative h-[400px] overflow-hidden rounded-2xl border border-border bg-secondary/30 lg:h-[580px] shadow-inner">
                  {trip ? (
                    <TripMap points={trip.points} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center bg-card/20">
                      <Play className="size-8 text-primary animate-pulse" />
                      <p className="max-w-xs text-xs text-muted-foreground font-medium">
                        {mode === 'edit_expenses' ? 'Nessuna mappa GPS associata a questo storico.' : 'Modalità Live On-The-Road attiva. Mappa disponibile al caricamento del GPX finale.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  )
}