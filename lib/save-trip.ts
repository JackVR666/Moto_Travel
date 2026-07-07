import { supabase, type TrackPointRow, type TripRow } from '@/lib/supabase'
import { ANOMALOUS_SPEED_KMH, sanitizeSpeedKmh, type ParsedTrip } from '@/lib/gpx-parser'

// Definiamo la struttura di una singola spesa da inviare a Supabase
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
 * Persist a parsed trip along with its expenses to Supabase.
 */
export async function saveTripToSupabase(
  trip: ParsedTrip, 
  expenses: ExpenseInput[] = [] // Aggiunto il parametro opzionale per le spese
): Promise<SaveResult> {
  // Trip date: first GPS timestamp, else today (YYYY-MM-DD).
  const tripDate = trip.date
    ? new Date(trip.date).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  // --- 1. Insert trip, return inserted row (need its id) ---
  const { data: inserted, error: tripError } = await supabase
    .from('trips')
    .insert({
      title: trip.name,
      trip_date: tripDate,
      total_km: Number(trip.totalKm.toFixed(3)),
    })
    .select()
    .single()

  if (tripError || !inserted) {
    throw new Error(tripError?.message ?? 'Impossibile creare il viaggio.')
  }

  const tripRow = inserted as TripRow

  // --- 2. Bulk insert all track points in one call ---
  const rows: TrackPointRow[] = trip.points.map((p) => {
    const plausibleKmh = sanitizeSpeedKmh(p.speed, ANOMALOUS_SPEED_KMH)
    const speed =
      plausibleKmh !== null && p.speed !== null ? Math.round(p.speed) : null

    return {
      trip_id: tripRow.id,
      latitude: p.lat,
      longitude: p.lon,
      elevation: p.ele && p.ele !== 0 ? p.ele : null,
      timestamp: p.time,
      speed,
    }
  })

  if (rows.length > 0) {
    const { error: pointsError } = await supabase.from('track_points').insert(rows)

    if (pointsError) {
      // Rollback of the orphaned trip if points fail.
      await supabase.from('trips').delete().eq('id', tripRow.id)
      throw new Error(`Errore nel salvataggio dei punti: ${pointsError.message}`)
    }
  }

  // --- 3. Bulk insert expenses if any exist ---
  if (expenses.length > 0) {
    const expenseRows = expenses.map((exp) => ({
      trip_id: tripRow.id, // Collegamento UUID perfetto!
      category_id: exp.category_id,
      amount: exp.amount,
      notes: exp.notes || null,
    }))

    const { error: expensesError } = await supabase.from('expenses').insert(expenseRows)

    if (expensesError) {
      // Rollback completo (cancella viaggio e punti a cascata) se falliscono le spese
      await supabase.from('trips').delete().eq('id', tripRow.id)
      throw new Error(`Errore nel salvataggio delle spese: ${expensesError.message}`)
    }
  }

  return { 
    trip: tripRow, 
    pointCount: rows.length, 
    expenseCount: expenses.length 
  }
}