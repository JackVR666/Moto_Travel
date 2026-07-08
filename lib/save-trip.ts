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
      title: title.trim() || 'Giro Goldwing', 
      trip_date: startDateStr, 
      trip_end_date: endDateStr 
    }])
    .select()
    .single()

  if (tripError) throw tripError
  const tripId = tripData.id

  if (!tripId) throw new Error("Impossibile salvare le spese: ID viaggio non generato.")

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
 * Associa una traccia GPX a un viaggio live pre-esistente (Svuota i vecchi punti prima dell'aggiornamento)
 */
export async function updateTripWithGpx(
  tripId: string,
  totalKm: number,
  points: Array<{ lat: number; lng: number; ele?: number | null; time?: string | null; speed?: number | null }>
) {
  if (!tripId || tripId === 'undefined' || tripId === '') {
    throw new Error("Impossibile associare il GPX: ID del viaggio mancante o non valido.")
  }

  // 1. Aggiorna i chilometri totali del viaggio
  const { error: tripUpdateError } = await supabase
    .from('trips')
    .update({ total_km: totalKm })
    .eq('id', tripId)

  if (tripUpdateError) throw tripUpdateError

  // 2. CORREZIONE FONDAMENTALE: Cancella i vecchi punti traccia per evitare record infiniti e duplicati
  const { error: deletePtsError } = await supabase
    .from('track_points')
    .delete()
    .eq('trip_id', tripId)

  if (deletePtsError) throw deletePtsError

  // 3. Se ci sono nuovi punti, inseriscili a blocchi
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
 * Sincronizza le spese rimuovendo i duplicati con certezza e controllo di sicurezza anti-wipe
 */
export async function updateTripExpenses(tripId: string, expenses: ExpenseInput[]) {
  if (!tripId || tripId === 'undefined' || tripId === '') {
    console.error("Tentativo di cancellazione intercettato e bloccato: tripId vuoto.")
    return
  }

  const { error: deleteError } = await supabase
    .from('expenses')
    .delete()
    .eq('trip_id', tripId)

  if (deleteError) {
    console.error("Errore durante la cancellazione delle spese vecchie:", deleteError)
    throw deleteError
  }

  if (!expenses || expenses.length === 0) return

  const uniqueExpenses = expenses.filter((expense, index, self) =>
    index === self.findIndex((t) => (
      t.category_id === expense.category_id && 
      t.amount === expense.amount && 
      t.expense_date === expense.expense_date &&
      t.notes === expense.notes
    ))
  )

  const expensesToInsert = uniqueExpenses.map((e) => ({
    trip_id: tripId,
    category_id: e.category_id,
    amount: e.amount,
    notes: e.notes ?? null,
    expense_date: e.expense_date,
  }))

  const { error: insertError } = await supabase
    .from('expenses').insert(expensesToInsert)

  if (insertError) {
    console.error("Errore durante l'inserimento delle nuove spese:", insertError)
    throw insertError
  }
}