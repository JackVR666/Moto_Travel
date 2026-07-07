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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GpxUploader } from '@/components/gpx-uploader'
import { StatCard } from '@/components/stat-card'
import { parseGpx, type ParsedTrip } from '@/lib/gpx-parser'
import { saveTripToSupabase, type ExpenseInput } from '@/lib/save-trip'

const TripMap = dynamic(() => import('@/components/trip-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-secondary/30">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

type SaveState = 'idle' | 'saving' | 'saved'

// Categorie rigide allineate con gli ID del database Supabase
const EXPENSE_CATEGORIES = [
  { id: 1, name: 'Carburante' },
  { id: 2, name: 'Pedaggio Autostradale / Traghetto' },
  { id: 3, name: 'Parcheggio' },
  { id: 4, name: 'Manutenzione / Riparazioni' },
  { id: 5, name: 'Varie / Souvenir' },
]

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function TripDashboard() {
  const [trip, setTrip] = useState<ParsedTrip | null>(null)
  const [customName, setCustomName] = useState<string>('')
  
  // Stato per gestire la lista delle spese dinamiche
  const [expenses, setExpenses] = useState<ExpenseInput[]>([])
  
  // Stati per i campi del modulo della nuova spesa
  const [selectedCatId, setSelectedCatId] = useState<number>(1)
  const [expenseAmount, setExpenseAmount] = useState<string>('')
  const [expenseNotes, setExpenseNotes] = useState<string>('')

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Sincronizza i dati quando carichi un nuovo file GPX
  useEffect(() => {
    if (trip) {
      setCustomName(trip.name)
      setExpenses([]) // Resetta le spese per il nuovo viaggio
    } else {
      setCustomName('')
      setExpenses([])
    }
  }, [trip])

  // Aggiunge una spesa alla lista temporanea nell'interfaccia
  const addExpense = () => {
    const amount = parseFloat(expenseAmount)
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Inserisci un importo valido e maggiore di zero.')
      return
    }

    const newExpense: ExpenseInput = {
      category_id: selectedCatId,
      amount: amount,
      notes: expenseNotes.trim() || undefined,
    }

    setExpenses((prev) => [...prev, newExpense])
    setExpenseAmount('')
    setExpenseNotes('')
  }

  // Rimuove una spesa inserita per errore
  const removeExpense = (index: number) => {
    setExpenses((prev) => prev.filter((_, i) => i !== index))
  }

  // Calcola il totale delle spese inserite
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
          setError('Nessun punto traccia (trkpt/wpt) trovato nel file.')
          setTrip(null)
        } else {
          setTrip(parsed)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore durante la lettura del file.')
        setTrip(null)
      } finally {
        setLoading(false)
      }
    }, 60)
  }, [])

  const handleSave = useCallback(async () => {
    if (!trip) return
    setSaveState('saving')
    setSaveError(null)
    setSaveMessage(null)
    try {
      const tripWithCustomName = {
        ...trip,
        name: customName.trim() || trip.name,
      }
      
      // Invia sia il viaggio che la lista delle spese compilate!
      const { pointCount, expenseCount } = await saveTripToSupabase(tripWithCustomName, expenses)
      
      setSaveState('saved')
      setSaveMessage(
        `Viaggio Goldwing salvato nel database con successo! (${pointCount} punti GPS, ${expenseCount} spese registrate)`,
      )
    } catch (err) {
      setSaveState('idle')
      const message = err instanceof Error ? err.message : 'Errore sconosciuto durante il salvataggio.'
      setSaveError(message)
      alert(`Salvataggio non riuscito: ${message}`)
    }
  }, [trip, customName, expenses])

  const stats = useMemo(() => {
    if (!trip) return null
    return {
      km: trip.totalKm.toFixed(1),
      maxSpeed: trip.maxSpeedKmh > 0 ? trip.maxSpeedKmh.toFixed(0) : '—',
      maxEle: trip.maxElevation !== null ? Math.round(trip.maxElevation).toString() : '—',
      points: trip.points.length,
    }
  }, [trip])

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-5 sm:px-6">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Bike className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight text-foreground">
              GoldWing Rides
            </h1>
            <p className="text-sm text-muted-foreground">
              Diario di viaggio per la tua Honda Goldwing
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          {/* Left column — upload, name + expenses management */}
          <section className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                  Carica traccia GPS
                </h2>
              </div>
              <GpxUploader onFile={handleFile} loading={loading} error={error} />
            </div>

            {trip && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                {/* Info Principali */}
                <div className="space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Nome del Viaggio (Modificabile)
                  </label>
                  <div className="relative flex items-center">
                    <Type className="absolute left-3 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="Dai un nome a questo giro..."
                      className="w-full rounded-xl border border-border bg-secondary/20 py-2.5 pl-10 pr-4 text-base font-semibold text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                    />
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="size-4" />
                      {formatDate(trip.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapIcon className="size-4" />
                      {trip.points.length} punti
                    </span>
                  </div>
                </div>

                {/* Blocco Inserimento Spese Gestione Relazionale */}
                <div className="border-t border-border/60 pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Contabilità Spese Giro
                    </label>
                    <span className="text-sm font-bold text-primary">Totale: €{totalExpensesCost}</span>
                  </div>

                  {/* Form input rapido */}
                  <div className="space-y-2 rounded-xl bg-secondary/10 p-3 border border-border/40">
                    <select
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(parseInt(e.target.value))}
                      className="w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    >
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
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
                        placeholder="Note (es: Pieno Cortina)"
                        value={expenseNotes}
                        onChange={(e) => setExpenseNotes(e.target.value)}
                        className="w-full flex-[1.5] rounded-lg border border-border bg-background py-1.5 px-3 text-sm text-foreground focus:border-primary focus:outline-none"
                      />
                      <Button type="button" onClick={addExpense} size="sm" className="px-2.5">
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Lista Spese Aggiunte temporanee */}
                  {expenses.length > 0 && (
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1">
                      {expenses.map((exp, idx) => {
                        const catName = EXPENSE_CATEGORIES.find((c) => c.id === exp.category_id)?.name
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-secondary/30 border border-border/20">
                            <div className="space-y-0.5 truncate mr-2">
                              <p className="font-semibold text-foreground truncate">{catName}</p>
                              {exp.notes && <p className="text-muted-foreground truncate italic">"{exp.notes}"</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono font-bold text-foreground">€{exp.amount.toFixed(2)}</span>
                              <button onClick={() => removeExpense(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Pulsante di Salvataggio Globale */}
                <Button
                  onClick={handleSave}
                  disabled={saveState === 'saving'}
                  size="lg"
                  className="w-full gap-2 font-medium border-t border-border/40"
                >
                  {saveState === 'saving' && <Loader2 className="size-4 animate-spin" />}
                  {saveState === 'saved' && <CheckCircle2 className="size-4" />}
                  {saveState === 'idle' && <CloudUpload className="size-4" />}
                  {saveState === 'saving'
                    ? 'Salvataggio nel cloud in corso…'
                    : saveState === 'saved'
                      ? 'Salvato nel Cloud con Spese'
                      : 'Salva nel Cloud Supabase'}
                </Button>

                {saveMessage && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{saveMessage}</span>
                  </div>
                )}

                {saveError && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <span>{saveError}</span>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right column — stats + map */}
          <section className="space-y-6">
            {stats ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard icon={Route} label="Km totali" value={stats.km} unit="km" />
                <StatCard
                  icon={Gauge}
                  label="Velocità max"
                  value={stats.maxSpeed}
                  unit={stats.maxSpeed !== '—' ? 'km/h' : undefined}
                />
                <StatCard
                  icon={Mountain}
                  label="Elevazione max"
                  value={stats.maxEle}
                  unit={stats.maxEle !== '—' ? 'm' : undefined}
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Route, label: 'Km totali' },
                  { icon: Gauge, label: 'Velocità max' },
                  { icon: Mountain, label: 'Elevazione max' },
                ].map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/30 p-4"
                  >
                    <div className="flex size-11 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground">
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </p>
                      <p className="font-mono text-xl font-semibold text-muted-foreground/50">—</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="relative h-[440px] overflow-hidden rounded-2xl border border-border bg-secondary/30 lg:h-[560px]">
              {trip ? (
                <TripMap points={trip.points} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex size-14 items-center justify-center rounded-full bg-secondary/60 text-muted-foreground">
                    <MapIcon className="size-7" />
                  </div>
                  <p className="max-w-xs text-balance text-sm text-muted-foreground">
                    Carica un file GPS per disegnare il percorso del tuo viaggio sulla mappa.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}