'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrackPoint } from '@/lib/gpx-parser'

type LatLng = [number, number]

type ManualPlace = {
  id: string
  name: string
  description?: string | null
  lat: number
  lon: number
  category?: string | null
  visitedAt?: string | null
}

function FitBounds({ positions }: { positions: LatLng[] }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length === 0) return
    if (positions.length === 1) {
      map.setView(positions[0], 13)
      return
    }
    const lats = positions.map((p) => p[0])
    const lons = positions.map((p) => p[1])
    const bounds: [LatLng, LatLng] = [
      [Math.min(...lats), Math.min(...lons)],
      [Math.max(...lats), Math.max(...lons)],
    ]
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, positions])
  return null
}

export default function TripMap({
  points,
  manualPlaces = [],
}: {
  points: TrackPoint[]
  manualPlaces?: ManualPlace[]
}) {
  const track = useMemo(
    () => points.filter((p) => !p.isWaypoint).map((p) => [p.lat, p.lon] as LatLng),
    [points],
  )
  const waypoints = useMemo(() => points.filter((p) => p.isWaypoint), [points])
  const positions = useMemo(() => {
    const trackPositions = track.length
      ? track
      : points.map((p) => [p.lat, p.lon] as LatLng)
    const manualPositions = manualPlaces.map(
      (place) => [place.lat, place.lon] as LatLng,
    )
    return [...trackPositions, ...manualPositions]
  }, [track, points, manualPlaces])

  const start = track[0]
  const end = track[track.length - 1]
  const center: LatLng = positions[0] ?? [45.4642, 9.19] // Milano fallback

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: '#10131b' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {track.length > 1 && (
        <>
          <Polyline positions={track} pathOptions={{ color: '#0b0d13', weight: 8, opacity: 0.6 }} />
          <Polyline positions={track} pathOptions={{ color: '#e8b23a', weight: 4, opacity: 1 }} />
        </>
      )}

      {start && (
        <CircleMarker
          center={start}
          radius={7}
          pathOptions={{ color: '#0b0d13', weight: 2, fillColor: '#3ecf8e', fillOpacity: 1 }}
        >
          <Tooltip>Partenza</Tooltip>
        </CircleMarker>
      )}
      {end && track.length > 1 && (
        <CircleMarker
          center={end}
          radius={7}
          pathOptions={{ color: '#0b0d13', weight: 2, fillColor: '#e5484d', fillOpacity: 1 }}
        >
          <Tooltip>Arrivo</Tooltip>
        </CircleMarker>
      )}

      {waypoints.map((w, i) => (
        <CircleMarker
          key={`wpt-${i}`}
          center={[w.lat, w.lon]}
          radius={5}
          pathOptions={{ color: '#0b0d13', weight: 2, fillColor: '#e8b23a', fillOpacity: 1 }}
        >
          <Tooltip>Waypoint {i + 1}</Tooltip>
        </CircleMarker>
      ))}

      {manualPlaces.map((place) => (
        <CircleMarker
          key={`manual-${place.id}`}
          center={[place.lat, place.lon]}
          radius={8}
          pathOptions={{
            color: '#071523',
            weight: 3,
            fillColor: '#1689ff',
            fillOpacity: 1,
          }}
        >
          <Tooltip>{place.name}</Tooltip>
          <Popup>
            <div className="min-w-[150px]">
              <strong>{place.name}</strong>
              {place.category && <div>{place.category}</div>}
              {place.description && <div>{place.description}</div>}
              {place.visitedAt && (
                <div>
                  {new Date(place.visitedAt).toLocaleDateString('it-IT')}
                </div>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}

      <FitBounds positions={positions} />
    </MapContainer>
  )
}
