export type PdfTripDay = {
  id: string
  day_number: number
  travel_date: string
  title: string | null
  start_city: string | null
  end_city: string | null
  planned_km: number | null
  notes: string | null
}

export type PdfAccommodation = {
  id: string
  trip_day_id: string
  name: string
  address: string | null
  booking_url: string | null
  airbnb_url: string | null
  check_in_date: string | null
  check_out_date: string | null
  check_in_time: string | null
  check_out_time: string | null
  price: number | null
  parking_available: boolean | null
  breakfast_included: boolean | null
  notes: string | null
  free_cancellation_until: string | null
  payment_date: string | null
  pay_at_property: boolean | null
}

export type PdfExpense = {
  category_id: number
  amount: number
  notes?: string
  expense_date?: string
}

export type PdfExpenseCategory = {
  id: number
  name: string
}

export type PdfTrackPoint = {
  lat: number
  lon: number
  ele?: number | null
  speed?: number | null
  time?: string | null
  tripDayId?: string | null
}

export type ExportTripPdfInput = {
  title: string
  startDate: string
  endDate: string
  tripNotes: string
  tripDays: PdfTripDay[]
  accommodations: PdfAccommodation[]
  expenses: PdfExpense[]
  expenseCategories: PdfExpenseCategory[]
  trackPoints: PdfTrackPoint[]
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'

  const dateOnly = value.slice(0, 10)
  const [year, month, day] = dateOnly.split('-')

  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function formatTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : '—'
}

function formatMoney(value: number): string {
  return `€ ${value.toFixed(2)}`
}

function safeFileName(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'viaggio'
  )
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(`${value.slice(0, 10)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function countDays(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)

  if (!start || !end || end < start) return 0
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

function countNights(accommodation: PdfAccommodation): number {
  const checkIn = parseDateOnly(accommodation.check_in_date)
  const checkOut = parseDateOnly(accommodation.check_out_date)

  if (!checkIn) return 1
  if (!checkOut) return 1

  return Math.max(
    1,
    Math.round((checkOut.getTime() - checkIn.getTime()) / 86_400_000),
  )
}

function stayDayLabel(
  accommodation: PdfAccommodation,
  tripDays: PdfTripDay[],
): string {
  const linkedDay = tripDays.find(
    (day) => day.id === accommodation.trip_day_id,
  )

  if (!linkedDay) return '—'

  const first = Number(linkedDay.day_number)
  const nights = countNights(accommodation)
  const numbers = Array.from({ length: nights }, (_, index) => first + index)

  return numbers.length === 1
    ? `Giorno ${numbers[0]}`
    : `Giorni ${numbers.join('/')}`
}

function routeLabel(
  startCity: string | null,
  endCity: string | null,
): string {
  return `${startCity || '—'} - ${endCity || '—'}`
}

function paymentLabel(accommodation: PdfAccommodation): string {
  if (accommodation.pay_at_property) return 'In struttura'
  if (accommodation.payment_date) {
    return `Addebito ${formatDate(accommodation.payment_date)}`
  }
  return 'Non indicato'
}

function bookingLabel(accommodation: PdfAccommodation): string {
  if (accommodation.booking_url) return 'Booking'
  if (accommodation.airbnb_url) return 'Airbnb'
  return '—'
}

function bookingUrl(accommodation: PdfAccommodation): string | null {
  return accommodation.booking_url || accommodation.airbnb_url || null
}

function mapsUrl(address: string | null): string | null {
  if (!address) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`
}

async function loadImageAsDataUrl(path: string): Promise<string | null> {
  try {
    const response = await fetch(path)
    if (!response.ok) return null

    const blob = await response.blob()

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function trackPointsForDay(
  day: PdfTripDay,
  trackPoints: PdfTrackPoint[],
): PdfTrackPoint[] {
  const direct = trackPoints.filter(
    (point) => point.tripDayId === day.id,
  )

  if (direct.length > 0) return direct

  const dateKey = String(day.travel_date).slice(0, 10)

  return trackPoints.filter(
    (point) => point.time?.slice(0, 10) === dateKey,
  )
}

const OSM_TILE_SIZE = 256
const OSM_MAX_TILE_COUNT = 36

function clampLatitude(latitude: number): number {
  return Math.max(-85.05112878, Math.min(85.05112878, latitude))
}

function longitudeToWorldX(longitude: number, zoom: number): number {
  const scale = OSM_TILE_SIZE * 2 ** zoom
  return ((longitude + 180) / 360) * scale
}

function latitudeToWorldY(latitude: number, zoom: number): number {
  const scale = OSM_TILE_SIZE * 2 ** zoom
  const clamped = clampLatitude(latitude)
  const radians = (clamped * Math.PI) / 180
  const mercator =
    Math.log(Math.tan(Math.PI / 4 + radians / 2))

  return (1 - mercator / Math.PI) / 2 * scale
}

function chooseMapZoom(
  minLat: number,
  maxLat: number,
  minLon: number,
  maxLon: number,
  width: number,
  height: number,
  padding: number,
): number {
  for (let zoom = 15; zoom >= 2; zoom--) {
    const left = longitudeToWorldX(minLon, zoom)
    const right = longitudeToWorldX(maxLon, zoom)
    const top = latitudeToWorldY(maxLat, zoom)
    const bottom = latitudeToWorldY(minLat, zoom)

    const fitsWidth = right - left <= width - padding * 2
    const fitsHeight = bottom - top <= height - padding * 2

    if (fitsWidth && fitsHeight) return zoom
  }

  return 2
}

async function loadTileImage(
  zoom: number,
  x: number,
  y: number,
): Promise<HTMLImageElement | null> {
  try {
    const tileCount = 2 ** zoom
    const wrappedX = ((x % tileCount) + tileCount) % tileCount

    if (y < 0 || y >= tileCount) return null

    const response = await fetch(
      `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
      {
        mode: 'cors',
        cache: 'force-cache',
      },
    )

    if (!response.ok) return null

    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)

    try {
      return await new Promise<HTMLImageElement | null>((resolve) => {
        const image = new Image()

        image.onload = () => resolve(image)
        image.onerror = () => resolve(null)
        image.src = objectUrl
      })
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
    }
  } catch {
    return null
  }
}

async function drawOpenStreetMapBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  zoom: number,
  minWorldX: number,
  minWorldY: number,
  maxWorldX: number,
  maxWorldY: number,
): Promise<boolean> {
  const worldWidth = maxWorldX - minWorldX
  const worldHeight = maxWorldY - minWorldY

  if (worldWidth <= 0 || worldHeight <= 0) return false

  const scale = Math.min(width / worldWidth, height / worldHeight)
  const renderedWidth = worldWidth * scale
  const renderedHeight = worldHeight * scale
  const offsetX = (width - renderedWidth) / 2
  const offsetY = (height - renderedHeight) / 2

  const firstTileX = Math.floor(minWorldX / OSM_TILE_SIZE)
  const lastTileX = Math.floor(maxWorldX / OSM_TILE_SIZE)
  const firstTileY = Math.floor(minWorldY / OSM_TILE_SIZE)
  const lastTileY = Math.floor(maxWorldY / OSM_TILE_SIZE)

  const tileCoordinates: Array<{ x: number; y: number }> = []

  for (let tileY = firstTileY; tileY <= lastTileY; tileY++) {
    for (let tileX = firstTileX; tileX <= lastTileX; tileX++) {
      tileCoordinates.push({ x: tileX, y: tileY })
    }
  }

  if (
    tileCoordinates.length === 0 ||
    tileCoordinates.length > OSM_MAX_TILE_COUNT
  ) {
    return false
  }

  const loadedTiles = await Promise.all(
    tileCoordinates.map(async ({ x, y }) => ({
      x,
      y,
      image: await loadTileImage(zoom, x, y),
    })),
  )

  let drawnTiles = 0

  for (const tile of loadedTiles) {
    if (!tile.image) continue

    const tileWorldX = tile.x * OSM_TILE_SIZE
    const tileWorldY = tile.y * OSM_TILE_SIZE

    const destinationX =
      offsetX + (tileWorldX - minWorldX) * scale
    const destinationY =
      offsetY + (tileWorldY - minWorldY) * scale
    const destinationSize = OSM_TILE_SIZE * scale

    context.drawImage(
      tile.image,
      destinationX,
      destinationY,
      destinationSize + 1,
      destinationSize + 1,
    )

    drawnTiles++
  }

  return drawnTiles > 0
}

async function createTrackDiagram(
  points: PdfTrackPoint[],
  width = 1400,
  height = 700,
): Promise<string | null> {
  const valid = points.filter(
    (point) =>
      Number.isFinite(Number(point.lat)) &&
      Number.isFinite(Number(point.lon)),
  )

  if (valid.length < 2 || typeof document === 'undefined') return null

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return null

  context.fillStyle = '#eef2f5'
  context.fillRect(0, 0, width, height)

  const latitudes = valid.map((point) => Number(point.lat))
  const longitudes = valid.map((point) => Number(point.lon))

  let minLat = Math.min(...latitudes)
  let maxLat = Math.max(...latitudes)
  let minLon = Math.min(...longitudes)
  let maxLon = Math.max(...longitudes)

  if (minLat === maxLat) {
    minLat -= 0.001
    maxLat += 0.001
  }

  if (minLon === maxLon) {
    minLon -= 0.001
    maxLon += 0.001
  }

  const latPadding = Math.max((maxLat - minLat) * 0.08, 0.002)
  const lonPadding = Math.max((maxLon - minLon) * 0.08, 0.002)

  minLat -= latPadding
  maxLat += latPadding
  minLon -= lonPadding
  maxLon += lonPadding

  const visualPadding = Math.max(24, Math.round(width * 0.025))
  const zoom = chooseMapZoom(
    minLat,
    maxLat,
    minLon,
    maxLon,
    width,
    height,
    visualPadding,
  )

  const minWorldX = longitudeToWorldX(minLon, zoom)
  const maxWorldX = longitudeToWorldX(maxLon, zoom)
  const minWorldY = latitudeToWorldY(maxLat, zoom)
  const maxWorldY = latitudeToWorldY(minLat, zoom)

  const mapDrawn = await drawOpenStreetMapBackground(
    context,
    width,
    height,
    zoom,
    minWorldX,
    minWorldY,
    maxWorldX,
    maxWorldY,
  )

  if (!mapDrawn) {
    context.fillStyle = '#f8fafc'
    context.fillRect(0, 0, width, height)
  } else {
    context.fillStyle = 'rgba(255,255,255,0.12)'
    context.fillRect(0, 0, width, height)
  }

  const worldWidth = maxWorldX - minWorldX
  const worldHeight = maxWorldY - minWorldY
  const scale = Math.min(width / worldWidth, height / worldHeight)
  const renderedWidth = worldWidth * scale
  const renderedHeight = worldHeight * scale
  const offsetX = (width - renderedWidth) / 2
  const offsetY = (height - renderedHeight) / 2

  const project = (point: PdfTrackPoint) => ({
    x:
      offsetX +
      (longitudeToWorldX(Number(point.lon), zoom) - minWorldX) *
        scale,
    y:
      offsetY +
      (latitudeToWorldY(Number(point.lat), zoom) - minWorldY) *
        scale,
  })

  context.strokeStyle = 'rgba(0,0,0,0.55)'
  context.lineWidth = Math.max(8, width / 150)
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()

  const maximumPoints = 4500
  const step = Math.max(1, Math.ceil(valid.length / maximumPoints))
  let firstProjectedPoint = true

  valid.forEach((point, index) => {
    if (index % step !== 0 && index !== valid.length - 1) return

    const projected = project(point)

    if (firstProjectedPoint) {
      context.moveTo(projected.x, projected.y)
      firstProjectedPoint = false
    } else {
      context.lineTo(projected.x, projected.y)
    }
  })

  context.stroke()

  context.strokeStyle = '#d4af37'
  context.lineWidth = Math.max(4, width / 260)
  context.beginPath()
  firstProjectedPoint = true

  valid.forEach((point, index) => {
    if (index % step !== 0 && index !== valid.length - 1) return

    const projected = project(point)

    if (firstProjectedPoint) {
      context.moveTo(projected.x, projected.y)
      firstProjectedPoint = false
    } else {
      context.lineTo(projected.x, projected.y)
    }
  })

  context.stroke()

  const start = project(valid[0])
  const end = project(valid[valid.length - 1])
  const markerRadius = Math.max(8, width / 125)

  context.fillStyle = '#16a34a'
  context.strokeStyle = '#ffffff'
  context.lineWidth = Math.max(3, width / 420)
  context.beginPath()
  context.arc(start.x, start.y, markerRadius, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = '#dc2626'
  context.beginPath()
  context.arc(end.x, end.y, markerRadius, 0, Math.PI * 2)
  context.fill()
  context.stroke()

  context.fillStyle = 'rgba(255,255,255,0.90)'
  context.fillRect(8, height - 28, 245, 20)

  context.fillStyle = '#475569'
  context.font = `${Math.max(12, Math.round(width / 95))}px sans-serif`
  context.textBaseline = 'middle'
  context.fillText(
    mapDrawn
      ? '© OpenStreetMap contributors'
      : 'Sfondo cartografico non disponibile',
    14,
    height - 18,
  )

  context.strokeStyle = '#cbd5e1'
  context.lineWidth = 2
  context.strokeRect(1, 1, width - 2, height - 2)

  return canvas.toDataURL('image/png')
}


export async function exportTripPdf({
  title,
  startDate,
  endDate,
  tripNotes,
  tripDays,
  accommodations,
  expenses,
  expenseCategories,
  trackPoints,
}: ExportTripPdfInput): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const logoDataUrl = await loadImageAsDataUrl('/logo/logo-horizontal.png')

  const margin = 10
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const sortedDays = [...tripDays].sort(
    (a, b) => Number(a.day_number) - Number(b.day_number),
  )

  const totalDays = countDays(startDate, endDate)
  const expectedNights = Math.max(totalDays - 1, 0)
  const bookedNights = accommodations.reduce(
    (sum, accommodation) => sum + countNights(accommodation),
    0,
  )

  const totalKm = sortedDays.reduce(
    (sum, day) => sum + Number(day.planned_km || 0),
    0,
  )

  const totalHotelCost = accommodations.reduce(
    (sum, accommodation) => sum + Number(accommodation.price || 0),
    0,
  )

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  )

  const grandTotal = totalHotelCost + totalExpenses

  const expensesByCategory = expenseCategories
    .map((category) => ({
      name: category.name,
      total: expenses
        .filter((expense) => Number(expense.category_id) === Number(category.id))
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
    }))
    .filter((item) => item.total > 0)

  const generatedAt = new Date().toLocaleString('it-IT', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  const footer = () => {
    const current = doc.getCurrentPageInfo().pageNumber
    const total = doc.getNumberOfPages()

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(95)

    doc.text(
      `${title || 'Viaggio'} · Moto /=\\ Viaggi`,
      margin,
      pageHeight - 5,
    )

    doc.text(
      `Pagina ${current} di ${total}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' },
    )
  }

  const sectionHeader = (label: string, subtitle?: string) => {
    doc.setFillColor(8, 8, 8)
    doc.roundedRect(margin, 12, pageWidth - margin * 2, 18, 2.5, 2.5, 'F')

    if (logoDataUrl) {
      doc.addImage(
        logoDataUrl,
        'PNG',
        margin + 4,
        15,
        43,
        11,
        undefined,
        'FAST',
      )
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(255)
    doc.text(label, logoDataUrl ? margin + 53 : margin + 5, 21)

    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(210)
      doc.text(subtitle, logoDataUrl ? margin + 53 : margin + 5, 26)
    }
  }

  // ==========================================================
  // PAGINA 1 — COPERTINA + RIEPILOGO
  // ==========================================================
  doc.setFillColor(8, 8, 8)
  doc.roundedRect(margin, 12, pageWidth - margin * 2, 34, 3, 3, 'F')

  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      'PNG',
      margin + 5,
      16,
      63,
      16,
      undefined,
      'FAST',
    )
  }

  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text(
    title || 'Viaggio senza titolo',
    logoDataUrl ? margin + 75 : margin + 7,
    26,
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(215)
  doc.text(
    `${formatDate(startDate)} → ${formatDate(endDate)}`,
    logoDataUrl ? margin + 75 : margin + 7,
    34,
  )

  doc.setFontSize(6.5)
  doc.text(
    `Generato il ${generatedAt}`,
    logoDataUrl ? margin + 75 : margin + 7,
    40,
  )

  doc.setTextColor(35)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Riepilogo generale', margin, 56)

  autoTable(doc, {
    startY: 60,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      'Giorni',
      'Tappe',
      'Hotel',
      'Notti',
      'Km previsti',
      'Costo hotel',
      'Spese',
      'Totale',
    ]],
    body: [[
      totalDays || '—',
      sortedDays.length,
      accommodations.length,
      `${bookedNights}/${expectedNights || '—'}`,
      `${totalKm.toFixed(1)} km`,
      formatMoney(totalHotelCost),
      formatMoney(totalExpenses),
      formatMoney(grandTotal),
    ]],
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      halign: 'center',
      valign: 'middle',
      lineColor: 210,
      lineWidth: 0.2,
      textColor: 35,
    },
    headStyles: {
      fillColor: [48, 59, 76],
      textColor: 255,
      fontStyle: 'bold',
    },
  })

  let y =
    ((doc as typeof doc & { lastAutoTable?: { finalY: number } })
      .lastAutoTable?.finalY ?? 80) + 8

  if (expensesByCategory.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Spese per categoria', margin, y)

    autoTable(doc, {
      startY: y + 3,
      margin: { left: margin, right: margin },
      theme: 'striped',
      tableWidth: 100,
      head: [['Categoria', 'Importo']],
      body: expensesByCategory.map((item) => [
        item.name,
        formatMoney(item.total),
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineColor: 220,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [73, 85, 104],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 32 },
      },
    })

    y =
      ((doc as typeof doc & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY ?? y) + 8
  }

  if (tripNotes.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Note generali', margin, y)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(60)

    const lines = doc.splitTextToSize(
      tripNotes.trim(),
      pageWidth - margin * 2,
    )

    doc.text(lines, margin, y + 4)
  }

  footer()

  // ==========================================================
  // PAGINA 2 — TABELLA RIEPILOGATIVA UNIFORME
  // ==========================================================
  doc.addPage('a4', 'landscape')
  sectionHeader(
    'Tabella riepilogativa',
    'Sintesi essenziale di tappe, pernottamenti e costi',
  )

  const summaryRows: string[][] = []

  for (const day of sortedDays) {
    const dayAccommodations = accommodations.filter(
      (accommodation) => accommodation.trip_day_id === day.id,
    )

    if (dayAccommodations.length === 0) {
      summaryRows.push([
        `Giorno ${day.day_number}`,
        routeLabel(day.start_city, day.end_city),
        formatDate(day.travel_date),
        day.planned_km !== null
          ? Number(day.planned_km).toFixed(0)
          : '—',
        '—',
        '—',
        '—',
        '—',
      ])
      continue
    }

    dayAccommodations.forEach((accommodation, index) => {
      summaryRows.push([
        index === 0 ? `Giorno ${day.day_number}` : '',
        index === 0
          ? routeLabel(day.start_city, day.end_city)
          : 'Stesso soggiorno',

        index === 0 ? formatDate(day.travel_date) : '',

        index === 0 && day.planned_km !== null
          ? Number(day.planned_km).toFixed(0)
          : '',

        accommodation.name,

        accommodation.address || '—',

        `${formatDate(accommodation.check_in_date)}
      ${formatTime(accommodation.check_in_time)}`,

        `${formatDate(accommodation.check_out_date)}
      ${formatTime(accommodation.check_out_time)}`,

        accommodation.price !== null
          ? formatMoney(Number(accommodation.price))
          : '—',

        accommodation.free_cancellation_until
          ? formatDate(accommodation.free_cancellation_until)
          : '—',

        paymentLabel(accommodation),

        accommodation.breakfast_included
          ? 'Inclusa'
          : '—',
      ])
    })
  }

  autoTable(doc, {
    startY: 36,
    margin: { left: margin, right: margin, bottom: 12 },
    theme: 'grid',
    head: [[
      'Giorno',
      'Tappa',
      'Data',
      'Km',
      'Pernottamento',
      'Indirizzo',
      'Check-in',
      'Check-out',
      'Costo',
      'Disdetta',
      'Pagamento',
      'Colazione',
    ]],
    body: summaryRows,
    styles: {
      font: 'helvetica',
      fontStyle: 'normal',
      fontSize: 7.3,
      cellPadding: 2,
      valign: 'middle',
      overflow: 'linebreak',
      lineColor: 205,
      lineWidth: 0.15,
      textColor: 35,
      minCellHeight: 8,
    },
    headStyles: {
      font: 'helvetica',
      fontStyle: 'bold',
      fillColor: [30, 41, 59],
      textColor: 255,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [246, 248, 250],
    },
    columnStyles: {
      0: {
        cellWidth: 15,
        halign: 'center',
        font: 'helvetica',
        fontStyle: 'normal',
      },
      1: {
        cellWidth: 40,
        font: 'helvetica',
        fontStyle: 'normal',
        overflow: 'linebreak',
      },
      2: {
        cellWidth: 20,
        halign: 'center',
        font: 'helvetica',
        fontStyle: 'normal',
      },
      3: {
        cellWidth: 10,
        halign: 'right',
        font: 'helvetica',
        fontStyle: 'normal',
      },
      4: {
        cellWidth: 40,
        font: 'helvetica',
        fontStyle: 'normal',
        overflow: 'linebreak',
      },
      5: {
        cellWidth: 50,
        font: 'helvetica',
        fontStyle: 'normal',
      },
      6: {
        cellWidth: 20,
        font: 'helvetica',
        halign: 'center',
        fontStyle: 'normal',
        overflow: 'linebreak',
      },
      7: {
        cellWidth: 20,
        halign: 'center',
        font: 'helvetica',
        fontStyle: 'normal',
      },
      8: {
        cellWidth: 15,
        font: 'helvetica',
        fontStyle: 'normal',
      },
      9: {
        cellWidth: 20,
        halign: 'center',
        font: 'helvetica',
        fontStyle: 'normal',
      },
      10: {
        cellWidth: 15,
        halign: 'center',
        font: 'helvetica',
        fontStyle: 'normal',
      },
      11: {
        cellWidth: 15,
        halign: 'center',
        font: 'helvetica',
        fontStyle: 'normal',
      },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        data.cell.styles.font = 'helvetica'
        data.cell.styles.fontStyle = 'normal'
        data.cell.styles.charSpace = 0
      }
    },
    didDrawPage: footer,
  })

  // ==========================================================
  // PAGINA — TRACCIA COMPLETA
  // ==========================================================
  if (trackPoints.length > 1) {
    const fullTrackImage = await createTrackDiagram(trackPoints)

    if (fullTrackImage) {
      doc.addPage('a4', 'landscape')
      sectionHeader(
        'Traccia completa del viaggio',
        `${trackPoints.length} punti GPS · ${totalKm.toFixed(1)} km`,
      )

      doc.addImage(
        fullTrackImage,
        'PNG',
        margin,
        36,
        pageWidth - margin * 2,
        145,
        undefined,
        'FAST',
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(90)
      doc.text(
        'Mappa OpenStreetMap: punto verde = partenza, punto rosso = arrivo.',
        margin,
        187,
      )

      footer()
    }
  }

  // ==========================================================
  // PAGINE SUCCESSIVE — DETTAGLIO GIORNATE
  // ==========================================================
  for (const day of sortedDays) {
    const dayAccommodations = accommodations.filter(
      (accommodation) => accommodation.trip_day_id === day.id,
    )

    doc.addPage('a4', 'landscape')

    const primaryAccommodation = dayAccommodations[0]
    const pageLabel = primaryAccommodation
      ? stayDayLabel(primaryAccommodation, sortedDays)
      : `Giorno ${day.day_number}`

    sectionHeader(
      `${pageLabel} · ${routeLabel(day.start_city, day.end_city)}`,
      `${formatDate(day.travel_date)} · ${
        day.planned_km !== null
          ? `${Number(day.planned_km).toFixed(0)} km`
          : 'Km non indicati'
      }`,
    )

    // Colonna sinistra: tappa e note
    doc.setFillColor(246, 248, 250)
    doc.roundedRect(10, 36, 88, 155, 2.5, 2.5, 'F')

    doc.setTextColor(35)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('Tappa', 15, 46)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    const routeLines = doc.splitTextToSize(
      routeLabel(day.start_city, day.end_city),
      76,
    )
    doc.text(routeLines, 15, 53)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Data', 15, 70)
    doc.text('Km previsti', 52, 70)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(formatDate(day.travel_date), 15, 76)
    doc.text(
      day.planned_km !== null
        ? `${Number(day.planned_km).toFixed(1)} km`
        : '—',
      52,
      76,
    )

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Note della tappa', 15, 90)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(65)
    const dayNoteLines = doc.splitTextToSize(day.notes || '—', 76)
    doc.text(dayNoteLines.slice(0, 5), 15, 97)

    const dailyTrackPoints = trackPointsForDay(day, trackPoints)
    const dailyTrackImage = await createTrackDiagram(
      dailyTrackPoints,
      900,
      520,
    )

    if (dailyTrackImage) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(35)
      doc.text('Traccia del giorno', 15, 129)

      doc.addImage(
        dailyTrackImage,
        'PNG',
        15,
        134,
        76,
        48,
        undefined,
        'FAST',
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(90)
      doc.text(
        `${dailyTrackPoints.length} punti GPS`,
        15,
        187,
      )
    }

    // Colonna destra: pernottamenti
    const rightX = 104
    const rightWidth = pageWidth - rightX - margin

    if (dayAccommodations.length === 0) {
      doc.setDrawColor(195)
      doc.setLineDashPattern([2, 2], 0)
      doc.roundedRect(rightX, 36, rightWidth, 55, 2.5, 2.5, 'S')
      doc.setLineDashPattern([], 0)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(60)
      doc.text('Nessun pernottamento associato', rightX + 8, 54)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(95)
      doc.text(
        'Questa giornata può essere una tappa senza pernottamento oppure una giornata coperta da un soggiorno precedente.',
        rightX + 8,
        63,
        { maxWidth: rightWidth - 16 },
      )
    }

    let hotelY = 36

    dayAccommodations.forEach((accommodation) => {
      const cardHeight = 70

      if (hotelY + cardHeight > pageHeight - 15) {
        footer()
        doc.addPage('a4', 'landscape')
        sectionHeader(
          `${pageLabel} · Pernottamenti`,
          routeLabel(day.start_city, day.end_city),
        )
        hotelY = 36
      }

      doc.setFillColor(252, 252, 252)
      doc.setDrawColor(205)
      doc.roundedRect(
        rightX,
        hotelY,
        rightWidth,
        cardHeight,
        2.5,
        2.5,
        'FD',
      )

      doc.setTextColor(35)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(
        accommodation.name,
        rightX + 7,
        hotelY + 10,
        { maxWidth: rightWidth - 50 },
      )

      if (accommodation.price !== null) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.text(
          formatMoney(Number(accommodation.price)),
          rightX + rightWidth - 7,
          hotelY + 10,
          { align: 'right' },
        )
      }

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(75)

      const addressLines = doc.splitTextToSize(
        accommodation.address || 'Indirizzo non indicato',
        rightWidth - 14,
      )
      doc.text(addressLines, rightX + 7, hotelY + 17)

      const leftCol = rightX + 7
      const centerCol = rightX + 58
      const infoY = hotelY + 33

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(95)
      doc.text('CHECK-IN', leftCol, infoY)
      doc.text('CHECK-OUT', centerCol, infoY)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(35)
      doc.text(
        `${formatDate(accommodation.check_in_date)} ${formatTime(
          accommodation.check_in_time,
        )}`,
        leftCol,
        infoY + 6,
      )
      doc.text(
        `${formatDate(accommodation.check_out_date)} ${formatTime(
          accommodation.check_out_time,
        )}`,
        centerCol,
        infoY + 6,
      )

      const detailX = rightX + 112

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(95)
      doc.text('PAGAMENTO', detailX, infoY)
      doc.text('DISDETTA', detailX, infoY + 12)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(35)
      doc.text(paymentLabel(accommodation), detailX, infoY + 6)
      doc.text(
        accommodation.free_cancellation_until
          ? formatDate(accommodation.free_cancellation_until)
          : '—',
        detailX,
        infoY + 18,
      )

      const serviceX = rightX + rightWidth - 57

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(95)
      doc.text('SERVIZI', serviceX, infoY)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(35)
      doc.text(
        accommodation.parking_available
          ? 'Parcheggio moto: sì'
          : 'Parcheggio moto: no',
        serviceX,
        infoY + 6,
      )
      doc.text(
        accommodation.breakfast_included
          ? 'Colazione: inclusa'
          : 'Colazione: non inclusa',
        serviceX,
        infoY + 12,
      )

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(95)
      doc.text('NOTE HOTEL', leftCol, hotelY + 58)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(65)
      const hotelNotes = doc.splitTextToSize(
        accommodation.notes || '—',
        rightWidth - 14,
      )
      doc.text(hotelNotes.slice(0, 2), leftCol, hotelY + 64)

      const booking = bookingUrl(accommodation)
      const map = mapsUrl(accommodation.address)

      if (booking) {
        doc.setTextColor(25, 90, 160)
        doc.textWithLink(
          `${bookingLabel(accommodation)}: apri prenotazione`,
          rightX + rightWidth - 72,
          hotelY + 61,
          { url: booking },
        )
      }

      if (map) {
        doc.setTextColor(25, 90, 160)
        doc.textWithLink(
          'Google Maps',
          rightX + rightWidth - 72,
          hotelY + 67,
          { url: map },
        )
      }

      hotelY += cardHeight + 7
    })

    footer()
  }

  // ==========================================================
  // ULTIMA PAGINA — RIEPILOGO ECONOMICO
  // ==========================================================
  doc.addPage('a4', 'landscape')
  sectionHeader(
    'Riepilogo economico',
    'Costi pianificati e spese già registrate',
  )

  const economicRows = [
    ['Hotel', formatMoney(totalHotelCost)],
    ...expensesByCategory.map((item) => [
      item.name,
      formatMoney(item.total),
    ]),
    ['Totale spese registrate', formatMoney(totalExpenses)],
    ['Totale complessivo', formatMoney(grandTotal)],
  ]

  autoTable(doc, {
    startY: 40,
    margin: { left: 40, right: 40 },
    theme: 'grid',
    head: [['Voce', 'Importo']],
    body: economicRows,
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 3,
      lineColor: 210,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      1: {
        halign: 'right',
        cellWidth: 45,
        fontStyle: 'bold',
      },
    },
    didParseCell: (data) => {
      if (
        data.section === 'body' &&
        data.row.index === economicRows.length - 1
      ) {
        data.cell.styles.fillColor = [239, 230, 200]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  footer()

  // Aggiorna la numerazione dopo che tutte le pagine esistono.
  const finalPageCount = doc.getNumberOfPages()

  for (let page = 1; page <= finalPageCount; page++) {
    doc.setPage(page)

    doc.setFillColor(255, 255, 255)
    doc.rect(pageWidth - 45, pageHeight - 9, 38, 6, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(95)
    doc.text(
      `Pagina ${page} di ${finalPageCount}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' },
    )
  }

  doc.save(`${safeFileName(title)}-roadbook.pdf`)
}
