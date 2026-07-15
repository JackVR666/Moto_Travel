'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  exportTripPdf,
  type PdfAccommodation,
  type PdfExpense,
  type PdfExpenseCategory,
  type PdfTripDay,
  type PdfTrackPoint,
} from '@/lib/export-trip-pdf'

type ExportTripPdfButtonProps = {
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

export function ExportTripPdfButton({
  title,
  startDate,
  endDate,
  tripNotes,
  tripDays,
  accommodations,
  expenses,
  expenseCategories,
  trackPoints,
}: ExportTripPdfButtonProps) {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (tripDays.length === 0) {
      alert('Aggiungi almeno una giornata prima di esportare il Roadbook.')
      return
    }

    setExporting(true)

    try {
      await exportTripPdf({
        title,
        startDate,
        endDate,
        tripNotes,
        tripDays,
        accommodations,
        expenses,
        expenseCategories,
        trackPoints,
      })
    } catch (error) {
      console.error('Errore generazione PDF:', error)
      alert(
        `Errore durante la generazione del PDF: ${
          error instanceof Error ? error.message : String(error)
        }`,
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleExport}
      disabled={exporting || tripDays.length === 0}
      className="h-8 gap-1.5 rounded-lg px-3 text-[9px] font-bold sm:h-9 sm:text-xs"
    >
      {exporting ? (
        <Loader2 className="size-3 animate-spin sm:size-4" />
      ) : (
        <Download className="size-3 sm:size-4" />
      )}

      {exporting ? 'Creazione PDF…' : 'Esporta PDF'}
    </Button>
  )
}
