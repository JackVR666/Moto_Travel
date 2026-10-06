'use client'

import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export type PlannedMapPoint = {
  label: string
  lat: number
  lon: number
  dayNumber: number
  kind: 'start' | 'end'
}

function Fit({ points }: { points: PlannedMapPoint[] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    const refresh = () => {
      map.invalidateSize({ pan: false })
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lon] as [number, number]))
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 11 })
    }
    refresh()
    const first = window.setTimeout(refresh, 100)
    const second = window.setTimeout(refresh, 350)
    return () => {
      window.clearTimeout(first)
      window.clearTimeout(second)
    }
  }, [map, points])
  return null
}

function numberedIcon(number: number, kind: 'start' | 'end') {
  return L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${kind === 'start' ? '#0f6fba' : '#1689ff'};color:#fff;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);font:800 12px system-ui">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

export default function PlanningMap({
  points,
  route,
}: {
  points: PlannedMapPoint[]
  route: [number, number][]
}) {
  const center = useMemo<[number, number]>(() => points.length ? [points[0].lat, points[0].lon] : [45.5, 10.5], [points])

  return (
    <MapContainer center={center} zoom={6} className="h-full w-full" style={{ minHeight: "55vh", width: "100%" }} scrollWheelZoom>
      <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {route.length > 1 && <Polyline positions={route} pathOptions={{ color: '#1689ff', weight: 5, opacity: 0.85 }} />}
      {points.map((point, index) => (
        <Marker key={`${point.dayNumber}-${point.kind}-${index}`} position={[point.lat, point.lon]} icon={numberedIcon(point.dayNumber, point.kind)}>
          <Tooltip>{`Giorno ${point.dayNumber} · ${point.label}`}</Tooltip>
          <Popup><strong>Giorno {point.dayNumber}</strong><br />{point.label}</Popup>
        </Marker>
      ))}
      <Fit points={points} />
    </MapContainer>
  )
}
