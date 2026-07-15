import L from 'leaflet'

function createMarkerIcon(path: string) {
  return L.icon({
    iconUrl: path,
    iconSize: [36, 48],
    iconAnchor: [18, 48],
    popupAnchor: [0, -44],
  })
}

export const hotelMarkerIcon = createMarkerIcon(
  '/markers/marker-hotel.png'
)

export const fuelMarkerIcon = createMarkerIcon(
  '/markers/marker-fuel.png'
)

export const restaurantMarkerIcon = createMarkerIcon(
  '/markers/marker-restaurant.png'
)

export const scenicMarkerIcon = createMarkerIcon(
  '/markers/marker-scenic.png'
)

export const attractionMarkerIcon = createMarkerIcon(
  '/markers/marker-attraction.png'
)

export const stopMarkerIcon = createMarkerIcon(
  '/markers/marker-stop.png'
)
