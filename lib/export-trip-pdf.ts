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

export type ExportTripPdfInput = {
  title: string
  startDate: string
  endDate: string
  tripNotes: string
  tripDays: PdfTripDay[]
  accommodations: PdfAccommodation[]
  expenses: PdfExpense[]
  expenseCategories: PdfExpenseCategory[]
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

export async function exportTripPdf({
  title,
  startDate,
  endDate,
  tripNotes,
  tripDays,
  accommodations,
  expenses,
  expenseCategories,
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

  sortedDays.forEach((day) => {
    const dayAccommodations = accommodations.filter(
      (accommodation) => accommodation.trip_day_id === day.id,
    )

    if (dayAccommodations.length === 0) {
      summaryRows.push([
        String(day.day_number),
        `${day.start_city || '—'} → ${day.end_city || '—'}`,
        formatDate(day.travel_date),
        day.planned_km !== null
          ? Number(day.planned_km).toFixed(0)
          : '—',
        '—',
        '—',
        '—',
        '—',
      ])
      return
    }

    dayAccommodations.forEach((accommodation, index) => {
      summaryRows.push([
        index === 0 ? stayDayLabel(accommodation, sortedDays) : '',
        index === 0
          ? `${day.start_city || '—'} → ${day.end_city || '—'}`
          : '↳ stesso soggiorno',
        index === 0 ? formatDate(day.travel_date) : '',
        index === 0 && day.planned_km !== null
          ? Number(day.planned_km).toFixed(0)
          : '',
        accommodation.name,
        accommodation.price !== null
          ? formatMoney(Number(accommodation.price))
          : '—',
        paymentLabel(accommodation),
        accommodation.breakfast_included ? 'Inclusa' : 'No',
      ])
    })
  })

  autoTable(doc, {
    startY: 36,
    margin: { left: margin, right: margin, bottom: 12 },
    theme: 'grid',
    head: [[
      'Giorno/i',
      'Tappa',
      'Data',
      'Km',
      'Pernottamento',
      'Costo',
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
      0: { cellWidth: 23, halign: 'center' },
      1: { cellWidth: 55, font: 'helvetica', fontStyle: 'normal' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 63, font: 'helvetica', fontStyle: 'normal' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 42 },
      7: { cellWidth: 22, halign: 'center' },
    },
    didDrawPage: footer,
  })

  // ==========================================================
  // PAGINE SUCCESSIVE — DETTAGLIO GIORNATE
  // ==========================================================
  sortedDays.forEach((day) => {
    const dayAccommodations = accommodations.filter(
      (accommodation) => accommodation.trip_day_id === day.id,
    )

    doc.addPage('a4', 'landscape')

    const primaryAccommodation = dayAccommodations[0]
    const pageLabel = primaryAccommodation
      ? stayDayLabel(primaryAccommodation, sortedDays)
      : `Giorno ${day.day_number}`

    sectionHeader(
      `${pageLabel} · ${day.start_city || '—'} → ${day.end_city || '—'}`,
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
      `${day.start_city || '—'} → ${day.end_city || '—'}`,
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
    doc.text(dayNoteLines, 15, 97)

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
          `${day.start_city || '—'} → ${day.end_city || '—'}`,
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
  })

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
