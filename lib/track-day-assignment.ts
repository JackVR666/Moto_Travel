import { supabase } from '@/lib/supabase'

export type TrackDay = {
  id: string
  day_number: number
  travel_date: string
}

export type AssignableTrackPoint = {
  lat: number
  lon: number
  ele?: number | null
  speed?: number | null
  time?: string | null
  tripDayId?: string | null
  trip_day_id?: string | null
}

function dateKeyInTimeZone(
  timestamp: string,
  timeZone: string,
): string | null {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return null

  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return timestamp.slice(0, 10)
  }
}

export function pointDateKey(
  timestamp: string | null | undefined,
  timeZone = 'Europe/Rome',
): string | null {
  if (!timestamp) return null

  const zoned = dateKeyInTimeZone(timestamp, timeZone)
  if (zoned) return zoned

  return timestamp.slice(0, 10) || null
}

export function associateTrackPointsToDays<T extends AssignableTrackPoint>(
  points: T[],
  tripDays: TrackDay[],
  timeZone = 'Europe/Rome',
): Array<T & { tripDayId: string | null }> {
  const dayByDate = new Map(
    tripDays.map((day) => [
      String(day.travel_date).slice(0, 10),
      day.id,
    ]),
  )

  return points.map((point) => {
    const existingDayId = point.tripDayId ?? point.trip_day_id ?? null
    const dateKey = pointDateKey(point.time, timeZone)
    const inferredDayId = dateKey ? dayByDate.get(dateKey) ?? null : null

    return {
      ...point,
      tripDayId: existingDayId || inferredDayId,
    }
  })
}

function chunks<T>(items: T[], chunkSize: number): T[][] {
  const result: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    result.push(items.slice(index, index + chunkSize))
  }

  return result
}

export async function persistTrackPointDayAssignments(
  tripId: string,
  tripDays: TrackDay[],
  timeZone = 'Europe/Rome',
): Promise<{
  assigned: number
  unassigned: number
}> {
  if (!tripId || tripDays.length === 0) {
    return { assigned: 0, unassigned: 0 }
  }

  const dayByDate = new Map(
    tripDays.map((day) => [
      String(day.travel_date).slice(0, 10),
      day.id,
    ]),
  )

  const pageSize = 1000
  let from = 0
  const rows: Array<{
    id: string
    timestamp: string | null
    trip_day_id: string | null
  }> = []

  while (true) {
    const { data, error } = await supabase
      .from('track_points')
      .select('id, timestamp, trip_day_id')
      .eq('trip_id', tripId)
      .order('timestamp', { ascending: true })
      .range(from, from + pageSize - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    rows.push(...data)

    if (data.length < pageSize) break
    from += pageSize
  }

  const idsByDay = new Map<string, string[]>()
  const unassignedIds: string[] = []

  for (const row of rows) {
    const dateKey = pointDateKey(row.timestamp, timeZone)
    const dayId = dateKey ? dayByDate.get(dateKey) ?? null : null

    if (dayId) {
      const current = idsByDay.get(dayId) ?? []
      current.push(row.id)
      idsByDay.set(dayId, current)
    } else {
      unassignedIds.push(row.id)
    }
  }

  for (const [dayId, ids] of idsByDay) {
    for (const idChunk of chunks(ids, 300)) {
      const { error } = await supabase
        .from('track_points')
        .update({ trip_day_id: dayId })
        .in('id', idChunk)

      if (error) throw error
    }
  }

  for (const idChunk of chunks(unassignedIds, 300)) {
    const { error } = await supabase
      .from('track_points')
      .update({ trip_day_id: null })
      .in('id', idChunk)

    if (error) throw error
  }

  return {
    assigned: rows.length - unassignedIds.length,
    unassigned: unassignedIds.length,
  }
}
