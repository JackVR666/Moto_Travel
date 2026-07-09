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
    address: string | null
    check_in_date: string | null
    check_out_date: string | null
    check_in_time: string | null
    check_out_time: string | null
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

type Accommodation = {
  id: string
  trip_day_id: string
  name: string
  booking_url: string | null
  airbnb_url: string | null
  price: number | null
  parking_available: boolean | null
  notes: string | null
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
                  
                  {accommodations
                    .filter((a) => a.trip_day_id === day.id)
                    .map((a) => (
                        <div
                        key={a.id}
                        className="mt-2 rounded-lg border border-border/50 bg-secondary/10 p-2 text-[11px]"
                        >
                        <p className="font-bold text-foreground">🏨 {a.name}</p>

                        {a.address && (
                            <p className="text-[11px] text-muted-foreground">
                                📍 {a.address}
                            </p>
                            )}

                            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            {a.check_in_date && (
                                <span>
                                Check-in {formatDate(a.check_in_date)}
                                {a.check_in_time ? ` ${a.check_in_time}` : ''}
                                </span>
                            )}

                            {a.check_out_date && (
                                <span>
                                Check-out {formatDate(a.check_out_date)}
                                {a.check_out_time ? ` ${a.check_out_time}` : ''}
                                </span>
                            )}
                            </div>

                        <div className="mt-1 flex flex-wrap gap-2 text-muted-foreground">
                            {a.price !== null && <span>€ {Number(a.price).toFixed(2)}</span>}
                            {a.parking_available && <span>Parcheggio moto</span>}
                            {a.booking_url && <span>Booking</span>}
                            {a.airbnb_url && <span>Airbnb</span>}
                        </div>

                        {a.notes && (
                            <p className="mt-1 text-muted-foreground">
                            {a.notes}
                            </p>
                        )}

                        <div className="mt-2 flex gap-2">
                            <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => startEditAccommodation(a)}
                            className="h-7 text-[11px]"
                            >
                            Modifica
                            </Button>

                            <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => deleteAccommodation(a.id)}
                            className="h-7 text-[11px]"
                            >
                            Elimina
                            </Button>
                        </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDayForAccommodation(day.id)}
                        className="mt-2 h-8 rounded-md text-[11px]"
                        >
                        + Pernottamento
                    </Button>

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

                        <label className="flex items-center gap-2 text-xs">
                        <input
                            type="checkbox"
                            checked={accommodationParking}
                            onChange={(e) => setAccommodationParking(e.target.checked)}
                        />
                        Parcheggio moto
                        </label>

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

                </div>

                <button
                    type="button"
                    onClick={() => startEditTripDay(day)}
                    className="text-muted-foreground hover:text-primary p-1 transition-colors"
                    >
                    Modifica
                </button>

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