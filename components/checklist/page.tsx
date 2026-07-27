import TravelChecklist from '@/components/checklist/TravelChecklist'

export default function ChecklistPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TravelChecklist />
      </div>
    </main>
  )
}