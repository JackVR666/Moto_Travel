import { supabase } from './supabase'

export interface ExpenseInput {
  category_id: number
  amount: number
  notes?: string
}

/**
 * Salva un nuovo viaggio con le sue coordinate e le sue spese (tutto in una transazione)
 */
export async function saveTripToSupabase(
  title: string,
  dateStr: string,
  totalKm: number,
  points: Array<{ lat: number; lng: number; ele?: number | null; time?: string | null; speed?: number | null }>,
  expenses: ExpenseInput[]
) {
  // 1. Inserisce il viaggio
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert([{ title, trip_date: dateStr, total_km: totalKm }])
    .select()
    .single()

  if (tripError) throw tripError
  const tripId = tripData.id

  // 2. Inserisce i punti mappa se presenti
  let pointCount = 0
  if (points.length > 0) {
    const pointsToInsert = points.map((p) => ({
      trip_id: tripId,
      latitude: p.lat,
      longitude: p.lng,
      elevation: p.ele ?? null,
      timestamp: p.time ?? null,
      speed: p.speed ? Math.round(p.speed) : null,
    }))

    // Inseriamo a blocchi di 2000 per evitare limiti di richiesta
    const chunkSize = 2000
    for (let i = 0; i < pointsToInsert.length; i += chunkSize) {
      const chunk = pointsToInsert.slice(i, i + chunkSize)
      const { error: ptsError } = await supabase.from('track_points').insert(chunk)
      if (ptsError) throw ptsError
    }
    pointCount = pointsToInsert.length
  }

  // 3. Inserisce le spese se presenti
  let expenseCount = 0
  if (expenses.length > 0) {
    const expensesToInsert = expenses.map((e) => ({
      trip_id: tripId,
      category_id: e.category_id,
      amount: e.amount,
      notes: e.notes ?? null,
    }))

    const { error: expError } = await supabase.from('expenses').insert(expensesToInsert)
    if (expError) throw expError
    expenseCount = expensesToInsert.length
  }

  return { tripId, pointCount, expenseCount }
}

/**
 * Associa una traccia GPX a un viaggio live pre-esistente
 */
export async function updateTripWithGpx(
  tripId: string,
  totalKm: number,
  points: Array<{ lat: number; lng: number; ele?: number | null; time?: string | null; speed?: number | null }>
) {
  const { error: tripUpdateError } = await supabase
    .from('trips')
    .update({ total_km: totalKm })
    .eq('id', tripId)

  if (tripUpdateError) throw tripUpdateError

  if (points.length > 0) {
    const pointsToInsert = points.map((p) => ({
      trip_id: tripId,
      latitude: p.lat,
      longitude: p.lng,
      elevation: p.ele ?? null,
      timestamp: p.time ?? null,
      speed: p.speed ? Math.round(p.speed) : null,
    }))

    const chunkSize = 2000
    for (let i = 0; i < pointsToInsert.length; i += chunkSize) {
      const chunk = pointsToInsert.slice(i, i + chunkSize)
      const { error: ptsError } = await supabase.from('track_points').insert(chunk)
      if (ptsError) throw ptsError
    }
    return pointsToInsert.length
  }
  return 0
}

/**
 * NOVITÀ: Sincronizza le spese aggiornate di un viaggio esistente
 */
export async function updateTripExpenses(tripId: string, expenses: ExpenseInput[]) {
  // Rimuove le vecchie spese di questo viaggio per evitare duplicati
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)

  if (deleteError) throw deleteError

  // Inserisce la nuova lista aggiornata
  if (expenses.length > 0) {
    const expensesToInsert = expenses.map((e) => ({
      trip_id: tripId,
      category_id: e.category_id,
      amount: e.amount,
      notes: e.notes ?? null,
    }))

    const { error: insertError } = await supabase.from('expenses').insert(expensesToInsert)
    if (insertError) throw insertError
  }
}