import { supabase } from './supabase'

export interface ExpenseInput {
  category_id: number
  amount: number
  notes?: string
  expense_date: string // Nuova data della spesa
}

/**
 * Salva un nuovo viaggio con le sue coordinate e le sue spese
 */
export async function saveTripToSupabase(
  title: string,
  startDateStr: string,
  endDateStr: string, // Nuova data fine
  totalKm: number,
  points: Array<{ lat: number; lng: number; ele?: number | null; time?: string | null; speed?: number | null }>,
  expenses: ExpenseInput[]
) {
  // 1. Inserisce il viaggio con data inizio e fine
  const { data: tripData, error: tripError } = await supabase
    .from('trips')
    .insert([{ 
      title, 
      trip_date: startDateStr, 
      trip_end_date: endDateStr 
    }])
    .select()
    .single()

  if (tripError) throw tripError
  const tripId = tripData.id

  // 2. Inserisce i punti mappa se presenti
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
  }

  // 3. Inserisce le spese con la loro data specifica
  if (expenses.length > 0) {
    const expensesToInsert = expenses.map((e) => ({
      trip_id: tripId,
      category_id: e.category_id,
      amount: e.amount,
      notes: e.notes ?? null,
      expense_date: e.expense_date, // Nuova colonna
    }))

    const { error: expError } = await supabase.from('expenses').insert(expensesToInsert)
    if (expError) throw expError
  }

  return { tripId }
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
 * Sincronizza le spese aggiornate di un viaggio esistente
 */
export async function updateTripExpenses(tripId: string, expenses: ExpenseInput[]) {
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)

  if (deleteError) throw deleteError

  if (expenses.length > 0) {
    const expensesToInsert = expenses.map((e) => ({
      trip_id: tripId,
      category_id: e.category_id,
      amount: e.amount,
      notes: e.notes ?? null,
      expense_date: e.expense_date, // Nuova colonna salvata in modifica
    }))

    const { error: insertError } = await supabase.from('expenses').insert(expensesToInsert)
    if (insertError) throw insertError
  }
}