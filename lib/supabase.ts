import { createClient } from '@supabase/supabase-js'

// Sostituisci QUESTE DUE STRINGHE con i tuoi valori reali presi da Supabase
const supabaseUrl = 'https://hlbkafbmpbhjbayuapwo.supabase.co/rest/v1/' 
const supabaseAnonKey = 'sb_publishable_3OLSJvAakL-rSGui9ss05Q_OLjhyxxc'

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
  speed: number | null
}