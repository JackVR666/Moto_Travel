import { ExternalLink, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type Accommodation = {
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
}

type AccommodationCardProps = {
  accommodation: Accommodation
  formatDate: (iso: string | null) => string
  onEdit: (accommodation: Accommodation) => void
  onDelete: (id: string) => void
}

function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : ''
}

export function AccommodationCard({
  accommodation,
  formatDate,
  onEdit,
  onDelete,
}: AccommodationCardProps) {
  const bookingLink = accommodation.booking_url || accommodation.airbnb_url
  const bookingLabel = accommodation.booking_url
    ? 'Apri Booking'
    : accommodation.airbnb_url
      ? 'Apri Airbnb'
      : null
  const mapsUrl = accommodation.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(accommodation.address)}`
    : null

  return (
    <div className="mt-3 rounded-xl border border-border/60 bg-secondary/10 p-3 text-xs shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-foreground">🏨 {accommodation.name}</p>
          {accommodation.address && (
            <p className="mt-1 flex items-start gap-1 text-[11px] text-muted-foreground">
              <MapPin className="mt-0.5 size-3 shrink-0" />
              <span>{accommodation.address}</span>
            </p>
          )}
        </div>
        {accommodation.price !== null && (
          <span className="w-fit shrink-0 rounded-md border border-border/40 bg-background px-2 py-1 font-mono font-bold">
            € {Number(accommodation.price).toFixed(2)}
          </span>
        )}
      </div>

      {(accommodation.check_in_date || accommodation.check_out_date || accommodation.check_in_time || accommodation.check_out_time) && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/30 bg-background/60 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Check-in</p>
            <p className="mt-1 font-medium text-foreground">
              {accommodation.check_in_date ? formatDate(accommodation.check_in_date) : 'Non inserito'}
              {accommodation.check_in_time && ` · ${formatTime(accommodation.check_in_time)}`}
            </p>
          </div>
          <div className="rounded-lg border border-border/30 bg-background/60 p-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Check-out</p>
            <p className="mt-1 font-medium text-foreground">
              {accommodation.check_out_date ? formatDate(accommodation.check_out_date) : 'Non inserito'}
              {accommodation.check_out_time && ` · ${formatTime(accommodation.check_out_time)}`}
            </p>
          </div>
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {accommodation.parking_available && (
          <span className="rounded-md bg-background px-2 py-1">🅿️ Parcheggio moto</span>
        )}
      </div>

      {accommodation.notes && (
        <p className="mt-2 whitespace-pre-line rounded-lg bg-background/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
          {accommodation.notes}
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {bookingLink && bookingLabel && (
          <a
            href={bookingLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-[11px] font-medium hover:bg-secondary/40"
          >
            {bookingLabel}
            <ExternalLink className="size-3" />
          </a>
        )}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-border bg-background px-3 text-[11px] font-medium hover:bg-secondary/40"
          >
            Maps
            <MapPin className="size-3" />
          </a>
        )}
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(accommodation)} className="h-10 gap-1 text-[11px]">
          <Pencil className="size-3" /> Modifica
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onDelete(accommodation.id)} className="h-10 gap-1 text-[11px] text-destructive hover:text-destructive">
          <Trash2 className="size-3" /> Elimina
        </Button>
      </div>
    </div>
  )
}
