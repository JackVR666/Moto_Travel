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
  notes: string | null
  free_cancellation_until: string | null
  payment_date: string | null
  pay_at_property: boolean | null
  breakfast_included: boolean | null
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

function countDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0

  const start = new Date(`${startDate.slice(0, 10)}T12:00:00`)
  const end = new Date(`${endDate.slice(0, 10)}T12:00:00`)

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start
  ) {
    return 0
  }

  return Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1
}

function paymentLabel(accommodation: PdfAccommodation): string {
  if (accommodation.pay_at_property) return 'Pagamento in struttura'
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

function mapsUrl(address: string | null): string | null {
  if (!address) return null

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`
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

  const logoDataUrl = await loadImageAsDataUrl(
    '/logo/logo-horizontal.png'
  )

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 10

  const sortedDays = [...tripDays].sort((a, b) => {
    const orderDiff = Number(a.day_number) - Number(b.day_number)
    if (orderDiff !== 0) return orderDiff
    return String(a.travel_date).localeCompare(String(b.travel_date))
  })

  const totalDays = countDays(startDate, endDate)
  const expectedNights = Math.max(totalDays - 1, 0)
  const totalPlannedKm = sortedDays.reduce(
    (sum, day) => sum + Number(day.planned_km || 0),
    0,
  )
  const totalHotelCost = accommodations.reduce(
    (sum, accommodation) => sum + Number(accommodation.price || 0),
    0,
  )
  const totalRegisteredExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0,
  )
  const indicativeTotal = totalHotelCost + totalRegisteredExpenses

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

  const addPageHeader = (pageNumber: number) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(70)
    doc.text(title || 'Viaggio senza titolo', margin, 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.text(
      `Roadbook · generato ${generatedAt}`,
      pageWidth - margin,
      7,
      { align: 'right' },
    )

    doc.setDrawColor(210)
    doc.line(margin, 9, pageWidth - margin, 9)

    doc.setFontSize(6.5)
    doc.setTextColor(90)
    doc.text(
      `Pagina ${pageNumber}`,
      pageWidth - margin,
      pageHeight - 5,
      { align: 'right' },
    )
  }

  // Copertina / riepilogo
  doc.setFillColor(8, 8, 8)
  doc.roundedRect(margin, 14, pageWidth - margin * 2, 30, 3, 3, 'F')

  if (logoDataUrl) {
    doc.addImage(
      logoDataUrl,
      'PNG',
      margin + 5,
      17,
      58,
      15,
      undefined,
      'FAST'
    )
  }

  doc.setTextColor(255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(
    title || 'Viaggio senza titolo',
    logoDataUrl ? margin + 70 : margin + 7,
    27
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(220)
  doc.text(
    `${formatDate(startDate)} → ${formatDate(endDate)}`,
    logoDataUrl ? margin + 70 : margin + 7,
    34
  )

  doc.setTextColor(30)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Riepilogo generale', margin, 52)

  autoTable(doc, {
    startY: 56,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [[
      'Giorni',
      'Tappe pianificate',
      'Pernottamenti',
      'Km previsti',
      'Costo hotel',
      'Spese registrate',
      'Totale indicativo',
    ]],
    body: [[
      totalDays || '—',
      sortedDays.length,
      `${accommodations.length}/${expectedNights || '—'}`,
      `${totalPlannedKm.toFixed(1)} km`,
      formatMoney(totalHotelCost),
      formatMoney(totalRegisteredExpenses),
      formatMoney(indicativeTotal),
    ]],
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.3,
      valign: 'middle',
      textColor: 35,
      lineColor: 210,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      halign: 'center',
    },
  })

  const summaryFinalY =
    (doc as typeof doc & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 70

  let currentY = summaryFinalY + 7

  if (expensesByCategory.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Spese registrate per categoria', margin, currentY)

    autoTable(doc, {
      startY: currentY + 3,
      margin: { left: margin, right: margin },
      theme: 'striped',
      head: [['Categoria', 'Importo']],
      body: expensesByCategory.map((item) => [
        item.name,
        formatMoney(item.total),
      ]),
      tableWidth: 95,
      styles: {
        font: 'helvetica',
        fontSize: 8,
        cellPadding: 2,
        lineColor: 220,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: 255,
      },
      columnStyles: {
        1: { halign: 'right', cellWidth: 30 },
      },
    })

    currentY =
      ((doc as typeof doc & { lastAutoTable?: { finalY: number } })
        .lastAutoTable?.finalY ?? currentY) + 7
  }

  if (tripNotes.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('Note generali', margin, currentY)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const noteLines = doc.splitTextToSize(
      tripNotes.trim(),
      pageWidth - margin * 2,
    )
    doc.text(noteLines, margin, currentY + 4)
  }

  doc.addPage('a4', 'landscape')

  // Tabella pianificazione
  const planningRows: string[][] = []

  sortedDays.forEach((day) => {
    const dayAccommodations = accommodations.filter(
      (accommodation) => accommodation.trip_day_id === day.id,
    )

    if (dayAccommodations.length === 0) {
      planningRows.push([
        String(day.day_number),
        `${day.start_city || '—'} → ${day.end_city || '—'}`,
        formatDate(day.travel_date),
        formatDate(day.travel_date),
        day.planned_km !== null
          ? Number(day.planned_km).toFixed(0)
          : '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        '—',
        day.notes || '—',
      ])
      return
    }

    dayAccommodations.forEach((accommodation, index) => {
      planningRows.push([
        index === 0 ? String(day.day_number) : '',
        index === 0
          ? `${day.start_city || '—'} → ${day.end_city || '—'}`
          : '↳ altro pernottamento',
        index === 0 ? formatDate(day.travel_date) : '',
        accommodation.check_out_date
          ? formatDate(accommodation.check_out_date)
          : formatDate(day.travel_date),
        index === 0 && day.planned_km !== null
          ? Number(day.planned_km).toFixed(0)
          : '',
        accommodation.name,
        accommodation.address || '—',
        `${formatDate(accommodation.check_in_date)} ${formatTime(
          accommodation.check_in_time,
        )}`,
        `${formatDate(accommodation.check_out_date)} ${formatTime(
          accommodation.check_out_time,
        )}`,
        accommodation.price !== null
          ? formatMoney(Number(accommodation.price))
          : '—',
        [
          accommodation.free_cancellation_until
            ? `Disdetta: ${formatDate(
                accommodation.free_cancellation_until,
              )}`
            : 'Disdetta: —',
          paymentLabel(accommodation),
          accommodation.parking_available
            ? 'Parcheggio moto: sì'
            : 'Parcheggio moto: no',
          accommodation.breakfast_included
            ? 'Colazione: inclusa'
            : 'Colazione: non inclusa',
        ].join('\n'),
        [day.notes, accommodation.notes].filter(Boolean).join('\n') || '—',
      ])
    })
  })

  autoTable(doc, {
    startY: 13,
    margin: { left: 7, right: 7, top: 13, bottom: 10 },
    theme: 'grid',
    head: [[
      'G.',
      'Tappa',
      'Arrivo',
      'Partenza',
      'Km',
      'Pernottamento',
      'Indirizzo',
      'Check-in',
      'Check-out',
      'Costo',
      'Prenotazione / pagamento',
      'Note',
    ]],
    body: planningRows,
    styles: {
      font: 'helvetica',
      fontSize: 6.2,
      cellPadding: 1.5,
      valign: 'top',
      overflow: 'linebreak',
      lineColor: 205,
      lineWidth: 0.15,
      textColor: 35,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [246, 248, 250],
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 28 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 10, halign: 'right' },
      5: { cellWidth: 27 },
      6: { cellWidth: 36 },
      7: { cellWidth: 22 },
      8: { cellWidth: 22 },
      9: { cellWidth: 18, halign: 'right' },
      10: { cellWidth: 38 },
      11: { cellWidth: 41 },
    },
    didDrawPage: (data) => {
      addPageHeader(data.pageNumber + 1)
    },
  })

  // Appendice link cliccabili
  const accommodationsWithLinks = accommodations.filter(
    (accommodation) =>
      bookingUrl(accommodation) || mapsUrl(accommodation.address),
  )

  if (accommodationsWithLinks.length > 0) {
    doc.addPage('a4', 'portrait')

    const portraitWidth = doc.internal.pageSize.getWidth()
    const portraitHeight = doc.internal.pageSize.getHeight()

    doc.setTextColor(30)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.text('Link utili e prenotazioni', 14, 19)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(90)
    doc.text(
      'I collegamenti restano cliccabili aprendo il PDF da computer o smartphone.',
      14,
      25,
    )

    let y = 34

    accommodationsWithLinks.forEach((accommodation, index) => {
      const relatedDay = sortedDays.find(
        (day) => day.id === accommodation.trip_day_id,
      )
      const booking = bookingUrl(accommodation)
      const map = mapsUrl(accommodation.address)

      if (y > portraitHeight - 35) {
        doc.addPage('a4', 'portrait')
        y = 20
      }

      doc.setDrawColor(220)
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(14, y - 5, portraitWidth - 28, 27, 2, 2, 'FD')

      doc.setTextColor(30)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(
        `${relatedDay ? `Giorno ${relatedDay.day_number} · ` : ''}${
          accommodation.name
        }`,
        18,
        y + 1,
      )

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(70)

      if (accommodation.address) {
        doc.text(accommodation.address, 18, y + 6)
      }

      let linkY = y + 12

      if (booking) {
        doc.setTextColor(25, 90, 160)
        doc.textWithLink(
          `${bookingLabel(accommodation)}: apri prenotazione`,
          18,
          linkY,
          { url: booking },
        )
        linkY += 5
      }

      if (map) {
        doc.setTextColor(25, 90, 160)
        doc.textWithLink('Google Maps: apri posizione', 18, linkY, {
          url: map,
        })
      }

      y += 32
    })

    const pageCount = doc.getNumberOfPages()
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page)
      const width = doc.internal.pageSize.getWidth()
      const height = doc.internal.pageSize.getHeight()

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(90)
      doc.text(`Pagina ${page} di ${pageCount}`, width - 10, height - 5, {
        align: 'right',
      })
    }
  } else {
    const pageCount = doc.getNumberOfPages()
    for (let page = 1; page <= pageCount; page++) {
      doc.setPage(page)
      const width = doc.internal.pageSize.getWidth()
      const height = doc.internal.pageSize.getHeight()

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(90)
      doc.text(`Pagina ${page} di ${pageCount}`, width - 10, height - 5, {
        align: 'right',
      })
    }
  }

  doc.save(`${safeFileName(title)}-roadbook.pdf`)
}
