import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variabili Supabase mancanti: imposta NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Row shape for the `trips` table. */
export interface TripRow {
  id: string
  title: string
  trip_date: string | null
  total_km: number
}

/** Row shape for the `track_points` table (insert payload). */
export interface TrackPointRow {
  trip_id: string
  latitude: number
  longitude: number
  elevation: number | null
  timestamp: string | null
  /** Integer speed in m/s (column is typed as integer in the DB). */
  speed: number | null
}
