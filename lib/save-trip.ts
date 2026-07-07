import { supabase, type TrackPointRow, type TripRow } from '@/lib/supabase'
import { ANOMALOUS_SPEED_KMH, sanitizeSpeedKmh, type ParsedTrip } from '@/lib/gpx-parser'

export interface ExpenseInput {
  category_id: number
  amount: number
  notes?: string
}

export interface SaveResult {
  trip: TripRow
  pointCount: number
  expenseCount: number
}

/**
 * Crea un viaggio da zero (può essere un viaggio Live manuale senza GPX, oppure un viaggio completo con GPX)
 */
export async function saveTripToSupabase(
  title: string,
  tripDate: string,
  totalKm: number = 0,
  points: ParsedTrip['points'] = [],
  expenses: ExpenseInput[] = []
): Promise<SaveResult> {
  // 1. Inserimento del viaggio principale
  const { data: inserted, error: tripError } = await supabase
    .from('trips')
    .insert({
      title: title.trim(),
      trip_date: tripDate,
      total_km: Number(totalKm.toFixed(3)),
    })
    .select()
    .single()

  if (tripError || !inserted) {
    throw new Error(tripError?.message ?? 'Impossibile creare il viaggio.')
  }

  const tripRow = inserted as TripRow

  // 2. Inserimento punti GPS se presenti
  if (points.length > 0) {
    const rows: TrackPointRow[] = points.map((p) => {
      const plausibleKmh = sanitizeSpeedKmh(p.speed, ANOMALOUS_SPEED_KMH)
      const speed = plausibleKmh !== null && p.speed !== null ? Math.round(p.speed) : null

      return {
        trip_id: tripRow.id,
        latitude: p.lat,
        longitude: p.lon,
        elevation: p.ele && p.ele !== 0 ? p.ele : null,
        timestamp: p.time,
        speed,
      }
    })

    const { error: pointsError } = await supabase.from('track_points').insert(rows)
    if (pointsError) {
      await supabase.from('trips').delete().eq('id', tripRow.id)
      throw new Error(`Errore nel salvataggio dei punti: ${pointsError.message}`)
    }
  }

  // 3. Inserimento delle spese se presenti
  if (expenses.length > 0) {
    const expenseRows = expenses.map((exp) => ({
      trip_id: tripRow.id,
      category_id: exp.category_id,
      amount: exp.amount,
      notes: exp.notes || null,
    }))

    const { error: expensesError } = await supabase.from('expenses').insert(expenseRows)
    if (expensesError) {
      await supabase.from('trips').delete().eq('id', tripRow.id)
      throw new Error(`Errore nel salvataggio delle spese: ${expensesError.message}`)
    }
  }

  return {
    trip: tripRow,
    pointCount: points.length,
    expenseCount: expenses.length
  }
}

/**
 * Associa una traccia GPX a un viaggio già esistente nel database
 */
export async function updateTripWithGpx(
  tripId: string,
  totalKm: number,
  points: ParsedTrip['points']
): Promise<number> {
  // Update dei km totali sul viaggio esistente
  const { error: updateError } = await supabase
    .from('trips')
    .update({ total_km: Number(totalKm.toFixed(3)) })
    .eq('id', tripId)

  if (updateError) {
    throw new Error(`Impossibile aggiornare i km del viaggio: ${updateError.message}`)
  }

  // Inserimento massivo dei punti mappa legati a questo specifico tripId
  if (points.length > 0) {
    const rows: TrackPointRow[] = points.map((p) => {
      const plausibleKmh = sanitizeSpeedKmh(p.speed, ANOMALOUS_SPEED_KMH)
      const speed = plausibleKmh !== null && p.speed !== null ? Math.round(p.speed) : null

      return {
        trip_id: tripId,
        latitude: p.lat,
        longitude: p.lon,
        elevation: p.ele && p.ele !== 0 ? p.ele : null,
        timestamp: p.time,
        speed,
      }
    })

    const { error: pointsError } = await supabase.from('track_points').insert(rows)
    if (pointsError) {
      throw new Error(`Errore nell'inserimento dei punti GPS: ${pointsError.message}`)
    }
  }

  return points.length;
}