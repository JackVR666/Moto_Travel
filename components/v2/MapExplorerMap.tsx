'use client'

import { Fragment, useEffect, useMemo } from 'react'
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

function MapLayoutController({
  trips,
}: {
  trips: ExplorerMapTrip[]
}) {
  const map = useMap()

  const coordinates = useMemo(
    () => trips.flatMap((trip) => trip.points),
    [trips],
  )

  useEffect(() => {
    let cancelled = false
    let animationFrame = 0

    const updateMap = () => {
      if (cancelled) return

      map.invalidateSize({
        animate: false,
        pan: false,
      })

      if (coordinates.length === 0) {
        map.setView([46.2, 11.2], 5, {
          animate: false,
        })
      } else if (coordinates.length === 1) {
        map.setView(coordinates[0], 11, {
          animate: false,
        })
      } else {
        map.fitBounds(
          coordinates as LatLngBoundsExpression,
          {
            padding: [35, 35],
            maxZoom: 12,
            animate: false,
          },
        )
      }
    }

    const runAfterLayout = () => {
      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = window.requestAnimationFrame(updateMap)
      })
    }

    runAfterLayout()

    const timers = [
      window.setTimeout(updateMap, 150),
      window.setTimeout(updateMap, 450),
      window.setTimeout(updateMap, 900),
    ]

    const container = map.getContainer()

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            runAfterLayout()
          })
        : null

    observer?.observe(container)
    window.addEventListener('resize', runAfterLayout)
    window.addEventListener(
      'orientationchange',
      runAfterLayout,
    )

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
      timers.forEach((timer) => window.clearTimeout(timer))
      observer?.disconnect()
      window.removeEventListener('resize', runAfterLayout)
      window.removeEventListener(
        'orientationchange',
        runAfterLayout,
      )
    }
  }, [map, coordinates])

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
  const mapKey = `${selectedTripId}-${trips
    .map((trip) => `${trip.id}:${trip.points.length}`)
    .join('|')}`

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden bg-[#e5e7eb]">
      <MapContainer
        key={mapKey}
        center={[46.2, 11.2]}
        zoom={5}
        scrollWheelZoom
        zoomControl
        className="absolute inset-0 h-full w-full"
        style={{
          height: '100%',
          width: '100%',
          background: '#e5e7eb',
        }}
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          keepBuffer={4}
        />

        <MapLayoutController trips={trips} />

        {trips.map((trip) => {
          if (trip.points.length < 2) return null

          const selected =
            selectedTripId === trip.id ||
            selectedTripId === 'tutti'

          const start = trip.points[0]
          const end = trip.points[trip.points.length - 1]

          return (
            <Fragment key={trip.id}>
              <Polyline
                positions={trip.points}
                pathOptions={{
                  color: trip.color,
                  weight:
                    selectedTripId === trip.id ? 7 : 5,
                  opacity: selected ? 1 : 0.28,
                  lineCap: 'round',
                  lineJoin: 'round',
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
                radius={selectedTripId === trip.id ? 8 : 6}
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
                radius={selectedTripId === trip.id ? 8 : 6}
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
            </Fragment>
          )
        })}
      </MapContainer>

      <style jsx global>{`
        .leaflet-container {
          height: 100% !important;
          width: 100% !important;
          background: #e5e7eb !important;
        }

        .leaflet-container img.leaflet-tile {
          width: 256px !important;
          height: 256px !important;
          max-width: none !important;
          max-height: none !important;
        }

        .leaflet-pane,
        .leaflet-tile,
        .leaflet-marker-icon,
        .leaflet-marker-shadow,
        .leaflet-tile-container,
        .leaflet-pane > svg,
        .leaflet-pane > canvas {
          position: absolute;
          left: 0;
          top: 0;
        }

        .leaflet-overlay-pane svg {
          max-width: none !important;
          max-height: none !important;
        }
      `}</style>
    </div>
  )
}
