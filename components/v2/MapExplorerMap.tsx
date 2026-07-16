'use client'

import { Fragment, useEffect } from 'react'
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

function RefreshMapSize({
  dependencyKey,
}: {
  dependencyKey: string
}) {
  const map = useMap()

  useEffect(() => {
    let cancelled = false

    const refresh = () => {
      if (cancelled) return

      map.invalidateSize({
        animate: false,
        pan: false,
      })

      map.eachLayer((layer) => {
        const redrawable = layer as {
          redraw?: () => unknown
        }

        redrawable.redraw?.()
      })
    }

    const timers = [
      window.setTimeout(refresh, 0),
      window.setTimeout(refresh, 120),
      window.setTimeout(refresh, 350),
      window.setTimeout(refresh, 800),
    ]

    const container = map.getContainer()
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => refresh())
        : null

    observer?.observe(container)
    window.addEventListener('resize', refresh)
    window.addEventListener('orientationchange', refresh)

    return () => {
      cancelled = true
      timers.forEach((timer) => window.clearTimeout(timer))
      observer?.disconnect()
      window.removeEventListener('resize', refresh)
      window.removeEventListener('orientationchange', refresh)
    }
  }, [map, dependencyKey])

  return null
}

function FitVisibleTracks({
  trips,
}: {
  trips: ExplorerMapTrip[]
}) {
  const map = useMap()

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize({
        animate: false,
        pan: false,
      })

      const coordinates = trips.flatMap(
        (trip) => trip.points,
      )

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
          animate: false,
        },
      )
    }, 80)

    return () => window.clearTimeout(timer)
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
      preferCanvas
      className="h-full w-full"
      style={{
        height: '100%',
        width: '100%',
        minHeight: '100%',
        background: '#e5e7eb',
      }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxNativeZoom={19}
        maxZoom={20}
        keepBuffer={5}
        updateWhenIdle={false}
        updateWhenZooming={false}
        crossOrigin="anonymous"
      />

      <RefreshMapSize
        dependencyKey={`${selectedTripId}-${trips
          .map((trip) => `${trip.id}:${trip.points.length}`)
          .join('|')}`}
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
          <Fragment key={trip.id}>
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
          </Fragment>
        )
      })}
      <style jsx global>{`
        .leaflet-container {
          background: #e5e7eb !important;
        }

        .leaflet-tile-container {
          backface-visibility: hidden;
          transform: translateZ(0);
        }

        .leaflet-tile {
          image-rendering: auto;
        }
      `}</style>
    </MapContainer>
  )
}
