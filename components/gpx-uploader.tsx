'use client'

import { useCallback, useRef, useState } from 'react'
import { UploadCloud, FileWarning, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GpxUploaderProps {
  onFile: (fileName: string, content: string) => void
  loading?: boolean
  error?: string | null
}

const ACCEPTED = ['.gpx', '.xml']

export function GpxUploader({ onFile, loading, error }: GpxUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const file = files[0]
      const isValid = ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))
      if (!isValid) {
        onFile(file.name, '__INVALID__')
        return
      }
      const reader = new FileReader()
      reader.onload = () => onFile(file.name, String(reader.result ?? ''))
      reader.readAsText(file)
    },
    [onFile],
  )

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Carica un file GPS trascinandolo qui o cliccando per selezionarlo"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragOver
            ? 'border-primary bg-accent/60'
            : 'border-border bg-secondary/30 hover:border-primary/60 hover:bg-secondary/50',
        )}
      >
        <div
          className={cn(
            'flex size-14 items-center justify-center rounded-full transition-colors',
            dragOver ? 'bg-primary text-primary-foreground' : 'bg-accent text-primary',
          )}
        >
          {loading ? (
            <Loader2 className="size-7 animate-spin" />
          ) : (
            <UploadCloud className="size-7" />
          )}
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium text-foreground">
            {loading ? 'Analisi della traccia in corso…' : 'Trascina qui il tuo file GPS'}
          </p>
          <p className="text-sm text-muted-foreground">
            oppure <span className="font-medium text-primary">clicca per selezionarlo</span> —
            formati <span className="font-mono text-xs">.gpx</span> e{' '}
            <span className="font-mono text-xs">.xml</span> (PAJ)
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".gpx,.xml,application/gpx+xml,text/xml,application/xml"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <FileWarning className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
