import {
  ClipboardList,
  FileText,
  Map as MapIcon,
  Receipt,
  Route,
} from 'lucide-react'

export type TripTab =
  | 'overview'
  | 'planning'
  | 'roadbook'
  | 'expenses'
  | 'map'
  | 'notes'

type TripTabsProps = {
  activeTab: TripTab
  onChange: (tab: TripTab) => void
}

const tabs: Array<{
  value: TripTab
  mobileLabel: string
  desktopLabel: string
  icon: typeof FileText
}> = [
  {
    value: 'overview',
    mobileLabel: 'Riepilogo',
    desktopLabel: 'Overview',
    icon: ClipboardList,
  },
  {
    value: 'planning',
    mobileLabel: 'Tappe',
    desktopLabel: 'Pianificazione',
    icon: Route,
  },
  {
    value: 'roadbook',
    mobileLabel: 'Roadbook',
    desktopLabel: 'Roadbook',
    icon: FileText,
  },
  {
    value: 'expenses',
    mobileLabel: 'Spese',
    desktopLabel: 'Spese (€)',
    icon: Receipt,
  },
  {
    value: 'map',
    mobileLabel: 'Mappa',
    desktopLabel: 'Mappa & GPX',
    icon: MapIcon,
  },
  {
    value: 'notes',
    mobileLabel: 'Note',
    desktopLabel: 'Note Diario',
    icon: FileText,
  },
]

export function TripTabs({ activeTab, onChange }: TripTabsProps) {
  return (
    <div className="sticky bottom-2 z-40 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur sm:static sm:rounded-xl sm:shadow-sm">
      <div className="flex w-full min-w-0 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:overflow-visible sm:pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const selected = activeTab === tab.value

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              aria-pressed={selected}
              className={`
                flex min-w-[88px] shrink-0 flex-col items-center justify-center gap-1
                rounded-xl px-2 py-2 text-[10px] font-bold transition-all
                sm:min-w-0 sm:flex-1 sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-xs
                ${
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary/30'
                }
              `}
            >
              <Icon className="size-4" />
              <span className="sm:hidden">{tab.mobileLabel}</span>
              <span className="hidden sm:inline">{tab.desktopLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
