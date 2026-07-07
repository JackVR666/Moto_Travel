import { supabase, type TrackPointRow, type TripRow } from '@/lib/supabase'
import { ANOMALOUS_SPEED_KMH, sanitizeSpeedKmh, type ParsedTrip } from '@/lib/gpx-parser'

export interface SaveResult {
  trip: TripRow
  pointCount: number
}

/**
 * Persist a parsed trip to Supabase.
 *
 * 1. Insert the trip (title, trip_date, total_km) and return the new row via .select().
 * 2. Use the returned id to bulk-insert all GPS points into `track_points`
 *    in a single call for maximum performance.
 *
 * If the bulk insert fails, the partially-created trip is rolled back
 * (best-effort) so we don't leave orphaned trips behind.
 */
export async function saveTripToSupabase(trip: ParsedTrip): Promise<SaveResult> {
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
    // Keep the cloud DB clean: drop implausible GPS-glitch speeds (> 200 km/h).
    const plausibleKmh = sanitizeSpeedKmh(p.speed, ANOMALOUS_SPEED_KMH)
    // The `speed` column is an integer (m/s), so round to match the schema.
    const speed =
      plausibleKmh !== null && p.speed !== null ? Math.round(p.speed) : null

    return {
      trip_id: tripRow.id,
      latitude: p.lat,
      longitude: p.lon,
      // Signal-loss fallbacks (ele = 0) are stored as null, not fake sea level.
      elevation: p.ele && p.ele !== 0 ? p.ele : null,
      timestamp: p.time,
      speed,
    }
  })

  if (rows.length > 0) {
    const { error: pointsError } = await supabase.from('track_points').insert(rows)

    if (pointsError) {
      // Best-effort rollback of the orphaned trip.
      await supabase.from('trips').delete().eq('id', tripRow.id)
      throw new Error(`Errore nel salvataggio dei punti: ${pointsError.message}`)
    }
  }

  return { trip: tripRow, pointCount: rows.length }
}
