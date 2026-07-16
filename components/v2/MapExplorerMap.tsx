'use client'

import { useEffect } from 'react'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import type { LatLngBoundsExpression } from 'leaflet'

export type ExplorerMapTrip = {
  id: string
  title: string
  tripDate: string | null
  tripEndDate: string | null
  totalKm: number
  status: 'pianificato' | 'in_corso' | 'completato'
  color: string
  points: Array<[number, number]>
}

type MapExplorerMapProps = {
  trips: ExplorerMapTrip[]
  selectedTripId: string
  onSelectTrip: (tripId: string) => void
}

function FitVisibleTracks({
  trips,
}: {
  trips: ExplorerMapTrip[]
}) {
  const map = useMap()

  useEffect(() => {
    const coordinates = trips.flatMap((trip) => trip.points)

    if (coordinates.length === 0) {
      map.setView([46.2, 11.2], 5)
      return
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 11)
      return
    }

    map.fitBounds(
      coordinates as LatLngBoundsExpression,
      {
        padding: [28, 28],
        maxZoom: 12,
      },
    )
  }, [map, trips])

  return null
}

function formatDate(value: string | null): string {
  if (!value) return '—'

  return new Date(
    `${value.slice(0, 10)}T12:00:00`,
  ).toLocaleDateString('it-IT')
}

function statusLabel(
  status: ExplorerMapTrip['status'],
): string {
  if (status === 'in_corso') return 'In corso'
  if (status === 'completato') return 'Completato'
  return 'Pianificato'
}

export default function MapExplorerMap({
  trips,
  selectedTripId,
  onSelectTrip,
}: MapExplorerMapProps) {
  return (
    <MapContainer
      center={[46.2, 11.2]}
      zoom={5}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitVisibleTracks trips={trips} />

      {trips.map((trip) => {
        if (trip.points.length === 0) return null

        const selected =
          selectedTripId === trip.id ||
          selectedTripId === 'tutti'

        const start = trip.points[0]
        const end = trip.points[trip.points.length - 1]

        return (
          <div key={trip.id}>
            <Polyline
              positions={trip.points}
              pathOptions={{
                color: trip.color,
                weight: selectedTripId === trip.id ? 6 : 4,
                opacity: selected ? 0.95 : 0.32,
              }}
              eventHandlers={{
                click: () => onSelectTrip(trip.id),
              }}
            >
              <Popup>
                <div className="min-w-[190px]">
                  <p className="font-bold">{trip.title}</p>
                  <p className="mt-1 text-xs">
                    {formatDate(trip.tripDate)}
                    {' → '}
                    {formatDate(
                      trip.tripEndDate || trip.tripDate,
                    )}
                  </p>
                  <p className="mt-1 text-xs">
                    {trip.totalKm.toFixed(1)} km
                  </p>
                  <p className="mt-1 text-xs">
                    {statusLabel(trip.status)}
                  </p>
                </div>
              </Popup>
            </Polyline>

            <CircleMarker
              center={start}
              radius={selectedTripId === trip.id ? 7 : 5}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#16a34a',
                fillOpacity: 1,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onSelectTrip(trip.id),
              }}
            >
              <Popup>
                <strong>Partenza</strong>
                <br />
                {trip.title}
              </Popup>
            </CircleMarker>

            <CircleMarker
              center={end}
              radius={selectedTripId === trip.id ? 7 : 5}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#dc2626',
                fillOpacity: 1,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onSelectTrip(trip.id),
              }}
            >
              <Popup>
                <strong>Arrivo</strong>
                <br />
                {trip.title}
              </Popup>
            </CircleMarker>
          </div>
        )
      })}
    </MapContainer>
  )
}
