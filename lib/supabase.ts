import { createClient } from '@supabase/supabase-js'

// Sostituisci QUESTE DUE STRINGHE con i tuoi valori reali presi da Supabase
const supabaseUrl = 'https://hlbkafbmpbhjbayuapwo.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsYmthZmJtcGJoamJheXVhcHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMzMyNzYsImV4cCI6MjA5ODkwOTI3Nn0.4M5bQpBarxfXuTytO8gR_MJt9Mt1AR34IqdDp92zuEU'

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