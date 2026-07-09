import { Plus, Route, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  editingTripId: string | null
  tripDays: TripDay[]

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
}: PlanningTabProps) {
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

      <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-3 bg-secondary/10 p-3 rounded-lg border border-border/40">
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
            onClick={addTripDay}
            disabled={!editingTripId}
            size="sm"
            className="h-8 px-3 font-bold text-xs gap-1 rounded-md"
          >
            <Plus className="size-3.5" />
            Aggiungi giornata
          </Button>
        </div>
      </div>
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
          {tripDays.map((day) => (
            <div
              key={day.id}
              className="rounded-lg bg-background border border-border/50 p-3 text-xs shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
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
                </div>

                <button
                  type="button"
                  onClick={() => removeTripDay(day.id)}
                  className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>

 )
}