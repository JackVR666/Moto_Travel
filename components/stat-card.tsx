import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string
  unit?: string
  accentClass?: string
}

export function StatCard({ icon: Icon, label, value, unit, accentClass }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card/60 p-4">
      <div
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary',
          accentClass,
        )}
      >
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-xl font-semibold text-foreground">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
        </p>
      </div>
    </div>
  )
}
