export interface TrackPoint {
  lat: number
  lon: number
  /** Elevation in meters (null if not present) */
  ele: number | null
  /** Speed in m/s from gpxtpx:speed extension (null if not present) */
  speed: number | null
  /** ISO timestamp (null if not present) */
  time: string | null
  /** Whether this point comes from a <wpt> (waypoint) rather than a <trkpt> */
  isWaypoint: boolean
}

export interface ParsedTrip {
  /** Trip / track name */
  name: string
  /** Total distance in kilometers (Haversine) */
  totalKm: number
  /** Trip date (ISO) or null */
  date: string | null
  /** Max plausible speed reached in km/h (outliers filtered out) */
  maxSpeedKmh: number
  /** Max elevation in meters (0/NaN readings ignored) */
  maxElevation: number | null
  /** Min elevation in meters (0/NaN readings ignored) */
  minElevation: number | null
  /** Average elevation in meters (0/NaN readings ignored) */
  avgElevation: number | null
  /** All track + waypoints in order */
  points: TrackPoint[]
}

const EARTH_RADIUS_KM = 6371

/**
 * Max plausible speed for a touring motorcycle (km/h). Anything above this is
 * treated as a GPS multipath glitch and ignored when computing "Velocità Max".
 */
export const MAX_PLAUSIBLE_SPEED_KMH = 140

/**
 * Harder ceiling (km/h) used to decide whether a per-point speed value is so
 * anomalous it should be persisted as `null` in the cloud database.
 */
export const ANOMALOUS_SPEED_KMH = 150

/**
 * Convert a raw gpxtpx:speed value (meters/second) into a sanitized speed in
 * km/h. Returns `null` when the value is missing, NaN, negative, or an
 * implausible outlier above the given ceiling.
 */
export function sanitizeSpeedKmh(
  speedMs: number | null,
  ceilingKmh: number = MAX_PLAUSIBLE_SPEED_KMH,
): number | null {
  if (speedMs === null || Number.isNaN(speedMs) || speedMs < 0) return null
  const kmh = speedMs * 3.6
  if (kmh > ceilingKmh) return null
  return kmh
}

/**
 * Great-circle distance between two lat/lon points using the Haversine formula.
 * Returns kilometers.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

/** Find the first descendant whose localName matches (namespace agnostic). */
function firstByLocalName(parent: Element, localName: string): Element | null {
  const lower = localName.toLowerCase()
  const all = parent.getElementsByTagName('*')
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName?.toLowerCase() === lower) return all[i]
  }
  return null
}

/** Read a direct-ish child value by local name, returning trimmed text. */
function childText(parent: Element, localName: string): string | null {
  const el = firstByLocalName(parent, localName)
  const txt = el?.textContent?.trim()
  return txt ? txt : null
}

function parsePoint(el: Element, isWaypoint: boolean): TrackPoint | null {
  const lat = parseFloat(el.getAttribute('lat') ?? '')
  const lon = parseFloat(el.getAttribute('lon') ?? '')
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null

  const eleRaw = childText(el, 'ele')
  const timeRaw = childText(el, 'time')

  // Speed lives inside <extensions><gpxtpx:speed> (or a plain <speed>).
  let speed: number | null = null
  const speedEl = firstByLocalName(el, 'speed')
  if (speedEl?.textContent) {
    const s = parseFloat(speedEl.textContent.trim())
    if (!Number.isNaN(s)) speed = s
  }

  return {
    lat,
    lon,
    ele: eleRaw !== null && !Number.isNaN(parseFloat(eleRaw)) ? parseFloat(eleRaw) : null,
    speed,
    time: timeRaw,
    isWaypoint,
  }
}

/**
 * Parse a PAJ / standard GPX (or XML) string into a ParsedTrip.
 * - Ignores any HTML/CDATA content inside <desc> tags.
 * - Extracts trkpt and wpt points with lat, lon, ele and gpxtpx:speed.
 * - Computes total distance via the Haversine formula.
 */
export function parseGpx(xmlString: string, fallbackName = 'Viaggio senza nome'): ParsedTrip {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlString, 'application/xml')

  const parserError = doc.getElementsByTagName('parsererror')
  if (parserError.length > 0) {
    throw new Error('Il file non è un XML/GPX valido.')
  }

  const root = doc.documentElement

  // --- Name (never taken from <desc>, which may contain HTML/CDATA) ---
  let name: string | null = null
  const trk = firstByLocalName(root, 'trk')
  if (trk) name = childText(trk, 'name')
  if (!name) {
    const metadata = firstByLocalName(root, 'metadata')
    if (metadata) name = childText(metadata, 'name')
  }
  if (!name) name = childText(root, 'name')
  if (!name) name = fallbackName

  // --- Collect points in document order ---
  const points: TrackPoint[] = []

  const trkpts = root.getElementsByTagName('trkpt')
  for (let i = 0; i < trkpts.length; i++) {
    const p = parsePoint(trkpts[i], false)
    if (p) points.push(p)
  }

  // Waypoints (<wpt>) — appended after track points.
  const wpts = root.getElementsByTagName('wpt')
  for (let i = 0; i < wpts.length; i++) {
    const p = parsePoint(wpts[i], true)
    if (p) points.push(p)
  }

  // --- Date: first timestamp found, else metadata time ---
  let date: string | null = null
  for (const p of points) {
    if (p.time) {
      date = p.time
      break
    }
  }
  if (!date) {
    const metadata = firstByLocalName(root, 'metadata')
    if (metadata) date = childText(metadata, 'time')
  }

  // --- Total distance (Haversine) over the track line only ---
  const trackOnly = points.filter((p) => !p.isWaypoint)
  const line = trackOnly.length > 1 ? trackOnly : points
  let totalKm = 0
  for (let i = 1; i < line.length; i++) {
    totalKm += haversineKm(line[i - 1].lat, line[i - 1].lon, line[i].lat, line[i].lon)
  }

  // --- Max speed: filter GPS multipath outliers, keep the real peak (km/h) ---
  let maxSpeedKmh = 0
  for (const p of points) {
    const kmh = sanitizeSpeedKmh(p.speed)
    if (kmh !== null && kmh > maxSpeedKmh) maxSpeedKmh = kmh
  }

  // --- Elevation min / max / avg: ignore 0, NaN and null (signal-loss fallbacks) ---
  let maxElevation: number | null = null
  let minElevation: number | null = null
  let eleSum = 0
  let eleCount = 0
  for (const p of points) {
    if (p.ele === null || Number.isNaN(p.ele) || p.ele === 0) continue
    if (maxElevation === null || p.ele > maxElevation) maxElevation = p.ele
    if (minElevation === null || p.ele < minElevation) minElevation = p.ele
    eleSum += p.ele
    eleCount++
  }
  const avgElevation = eleCount > 0 ? eleSum / eleCount : null

  return {
    name,
    totalKm,
    date,
    maxSpeedKmh,
    maxElevation,
    minElevation,
    avgElevation,
    points,
  }
}
