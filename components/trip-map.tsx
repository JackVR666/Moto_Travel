'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { TrackPoint } from '@/lib/gpx-parser'

type LatLng = [number, number]

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

export default function TripMap({ points }: { points: TrackPoint[] }) {
  const track = useMemo(
    () => points.filter((p) => !p.isWaypoint).map((p) => [p.lat, p.lon] as LatLng),
    [points],
  )
  const waypoints = useMemo(() => points.filter((p) => p.isWaypoint), [points])
  const positions = useMemo(
    () => (track.length ? track : points.map((p) => [p.lat, p.lon] as LatLng)),
    [track, points],
  )

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
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
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

      <FitBounds positions={positions} />
    </MapContainer>
  )
}
