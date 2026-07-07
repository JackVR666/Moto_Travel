import { supabase } from './supabase'

export interface ExpenseInput {
  category_id: number
  amount: number
  notes?: string
  expense_date: string
}

/**
 * Salva un nuovo viaggio con le sue coordinate e le sue spese
 */
export async function saveTripToSupabase(
  title: string,
  startDateStr: string,
  endDateStr: string,
  totalKm: number,
  points: Array<{ lat: number; lng: number; ele?: number | null; time?: string | null; speed?: number | null }>,
  expenses: ExpenseInput[]
) {
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

  if (expenses.length > 0) {
    const expensesToInsert = expenses.map((e) => ({
      trip_id: tripId,
      category_id: e.category_id,
      amount: e.amount,
      notes: e.notes ?? null,
      expense_date: e.expense_date,
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
 * CORREZIONE BLINDATA: Sincronizza le spese rimuovendo i duplicati con certezza
 */
export async function updateTripExpenses(tripId: string, expenses: ExpenseInput[]) {
  // 1. Forza la cancellazione totale delle vecchie spese per questo viaggio
  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)

  if (deleteError) {
    console.error("Errore durante la cancellazione delle spese vecchie:", deleteError)
    throw deleteError
  }

  // 2. Se l'utente ha svuotato tutto o rimosso tutto, ci fermiamo qui
  if (!expenses || expenses.length === 0) return

  // 3. Rimuoviamo eventuali duplicati IDP/identici presenti nell'array locale prima di inviarlo
  const uniqueExpenses = expenses.filter((expense, index, self) =>
    index === self.findIndex((t) => (
      t.category_id === expense.category_id && 
      t.amount === expense.amount && 
      t.expense_date === expense.expense_date &&
      t.notes === expense.notes
    ))
  )

  // 4. Prepariamo i dati puliti per Supabase
  const expensesToInsert = uniqueExpenses.map((e) => ({
    trip_id: tripId,
    category_id: e.category_id,
    amount: e.amount,
    notes: e.notes ?? null,
    expense_date: e.expense_date,
  }))

  // 5. Inseriamo le spese fresche sul database
  const { error: insertError } = await supabase
    .from('expenses')
    .insert(expensesToInsert)

  if (insertError) {
    console.error("Errore durante l'inserimento delle nuove spese:", insertError)
    throw insertError
  }
}