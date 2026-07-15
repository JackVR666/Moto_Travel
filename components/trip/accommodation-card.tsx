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
  free_cancellation_until: string | null
  payment_date: string | null
  pay_at_property: boolean | null
  breakfast_included: boolean | null
}

type AccommodationCardProps = {
  accommodation: Accommodation
  formatDate: (iso: string | null) => string
  onEdit: (accommodation: Accommodation) => void
  onDelete: (id: string) => void
  stayDayLabel?: string
}

function formatTime(time: string | null): string {
  return time ? time.slice(0, 5) : ''
}

export function AccommodationCard({
  accommodation,
  formatDate,
  onEdit,
  onDelete,
  stayDayLabel,
}: AccommodationCardProps) {
  const bookingLink =
    accommodation.booking_url || accommodation.airbnb_url

  const bookingLabel = accommodation.booking_url
    ? 'Booking'
    : accommodation.airbnb_url
      ? 'Airbnb'
      : null

  const mapsUrl = accommodation.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        accommodation.address
      )}`
    : null

  return (
    <div className="mt-2 rounded-lg border border-border/60 bg-secondary/10 p-2 text-[9px] shadow-sm sm:mt-3 sm:rounded-xl sm:p-3 sm:text-xs">
      {stayDayLabel && (
        <div className="mb-2">
          <span className="inline-flex rounded border border-border/40 bg-background px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground sm:text-[10px]">
            {stayDayLabel}
          </span>
        </div>
      )}

      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="break-words text-[11px] font-bold leading-tight text-foreground sm:text-sm">
            🏨 {accommodation.name}
          </p>

          {accommodation.address && (
            <p className="mt-1 flex items-start gap-1 text-[9px] leading-snug text-muted-foreground sm:text-[11px]">
              <MapPin className="mt-0.5 size-2.5 shrink-0 sm:size-3" />
              <span className="break-words">{accommodation.address}</span>
            </p>
          )}
        </div>

        {accommodation.price !== null && (
          <span className="shrink-0 rounded border border-border/40 bg-background px-1.5 py-1 font-mono text-[10px] font-bold sm:rounded-md sm:px-2 sm:text-xs">
            € {Number(accommodation.price).toFixed(2)}
          </span>
        )}
      </div>

      {(accommodation.check_in_date ||
        accommodation.check_out_date ||
        accommodation.check_in_time ||
        accommodation.check_out_time) && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
          <div className="min-w-0 rounded-md border border-border/30 bg-background/60 p-1.5 sm:rounded-lg sm:p-2">
            <p className="text-[7px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[9px]">
              Check-in
            </p>
            <p className="mt-0.5 break-words text-[9px] font-medium leading-tight text-foreground sm:mt-1 sm:text-xs">
              {accommodation.check_in_date
                ? formatDate(accommodation.check_in_date)
                : '—'}
              {accommodation.check_in_time && (
                <>
                  <br />
                  {formatTime(accommodation.check_in_time)}
                </>
              )}
            </p>
          </div>

          <div className="min-w-0 rounded-md border border-border/30 bg-background/60 p-1.5 sm:rounded-lg sm:p-2">
            <p className="text-[7px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[9px]">
              Check-out
            </p>
            <p className="mt-0.5 break-words text-[9px] font-medium leading-tight text-foreground sm:mt-1 sm:text-xs">
              {accommodation.check_out_date
                ? formatDate(accommodation.check_out_date)
                : '—'}
              {accommodation.check_out_time && (
                <>
                  <br />
                  {formatTime(accommodation.check_out_time)}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {accommodation.free_cancellation_until && (
          <div className="rounded-md border border-border/30 bg-background/60 p-1.5 sm:rounded-lg sm:p-2">
            <p className="text-[7px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[9px]">
              Disdetta gratuita
            </p>
            <p className="mt-0.5 text-[9px] font-medium leading-tight text-foreground sm:text-xs">
              Entro {formatDate(accommodation.free_cancellation_until)}
            </p>
          </div>
        )}

        <div className="rounded-md border border-border/30 bg-background/60 p-1.5 sm:rounded-lg sm:p-2">
          <p className="text-[7px] font-bold uppercase tracking-wide text-muted-foreground sm:text-[9px]">
            Pagamento
          </p>
          <p className="mt-0.5 text-[9px] font-medium leading-tight text-foreground sm:text-xs">
            {accommodation.pay_at_property
              ? 'In struttura'
              : accommodation.payment_date
                ? `Addebito ${formatDate(accommodation.payment_date)}`
                : 'Non indicato'}
          </p>
        </div>
      </div>

      {(accommodation.parking_available ||
        accommodation.breakfast_included) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {accommodation.parking_available && (
            <span className="inline-flex rounded bg-background px-1.5 py-1 text-[9px] text-muted-foreground sm:rounded-md sm:px-2 sm:text-[11px]">
              🅿️ Parcheggio moto
            </span>
          )}

          {accommodation.breakfast_included && (
            <span className="inline-flex rounded bg-background px-1.5 py-1 text-[9px] text-muted-foreground sm:rounded-md sm:px-2 sm:text-[11px]">
              ☕ Colazione inclusa
            </span>
          )}
        </div>
      )}

      {accommodation.notes && (
        <p className="mt-2 whitespace-pre-line rounded-md bg-background/60 p-1.5 text-[9px] leading-snug text-muted-foreground sm:rounded-lg sm:p-2 sm:text-[11px] sm:leading-relaxed">
          {accommodation.notes}
        </p>
      )}

      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:flex sm:flex-wrap sm:gap-2">
        {bookingLink && bookingLabel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-0 gap-1 rounded-md px-2 text-[9px] sm:h-8 sm:text-[11px]"
            asChild
          >
            <a href={bookingLink}>
              {bookingLabel}
              <ExternalLink className="size-2.5 sm:size-3" />
            </a>
          </Button>
        )}

        {mapsUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 min-w-0 gap-1 rounded-md px-2 text-[9px] sm:h-8 sm:text-[11px]"
            asChild
          >
            <a href={mapsUrl} target="_blank" rel="noreferrer">
              Maps
              <MapPin className="size-2.5 sm:size-3" />
            </a>
          </Button>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onEdit(accommodation)}
          className="h-7 min-w-0 gap-1 rounded-md px-2 text-[9px] sm:h-8 sm:text-[11px]"
        >
          <Pencil className="size-2.5 sm:size-3" />
          Modifica
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onDelete(accommodation.id)}
          className="h-7 min-w-0 gap-1 rounded-md px-2 text-[9px] text-destructive hover:text-destructive sm:h-8 sm:text-[11px]"
        >
          <Trash2 className="size-2.5 sm:size-3" />
          Elimina
        </Button>
      </div>
    </div>
  )
}
