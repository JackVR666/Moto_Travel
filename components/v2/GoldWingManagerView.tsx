'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Bike,
  CalendarClock,
  CheckCircle2,
  Euro,
  Gauge,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  Save,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type MaintenanceRow = {
  id: string
  maintenance_date: string
  odometer_km: number | null
  category: string
  description: string
  cost: number
  workshop: string | null
  notes: string | null
  next_due_date: string | null
  next_due_km: number | null
}

type DocumentRow = {
  id: string
  document_type: string
  title: string
  issue_date: string | null
  expiry_date: string | null
  cost: number
  provider: string | null
  notes: string | null
  completed: boolean
}

type ActiveSection = 'maintenance' | 'documents'

const MAINTENANCE_CATEGORIES = [
  'Tagliando',
  'Olio motore',
  'Filtro aria',
  'Pneumatici',
  'Freni',
  'Batteria',
  'Liquidi',
  'Revisione',
  'Accessorio',
  'Altro',
]

const DOCUMENT_TYPES = [
  'Assicurazione',
  'Bollo',
  'Revisione',
  'Garanzia',
  'Soccorso stradale',
  'Altro',
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('it-IT')
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value || 0)
}

function daysUntil(value: string | null): number | null {
  if (!value) return null
  const target = new Date(`${value}T12:00:00`).getTime()
  const today = new Date(`${todayIso()}T12:00:00`).getTime()
  return Math.ceil((target - today) / 86_400_000)
}

export function GoldWingManagerView() {
  const [activeSection, setActiveSection] =
    useState<ActiveSection>('maintenance')
  const [maintenance, setMaintenance] = useState<MaintenanceRow[]>([])
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editingMaintenanceId, setEditingMaintenanceId] =
    useState<string | null>(null)
  const [maintenanceDate, setMaintenanceDate] = useState(todayIso())
  const [odometerKm, setOdometerKm] = useState('')
  const [maintenanceCategory, setMaintenanceCategory] =
    useState(MAINTENANCE_CATEGORIES[0])
  const [maintenanceDescription, setMaintenanceDescription] =
    useState('')
  const [maintenanceCost, setMaintenanceCost] = useState('')
  const [workshop, setWorkshop] = useState('')
  const [maintenanceNotes, setMaintenanceNotes] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [nextDueKm, setNextDueKm] = useState('')

  const [editingDocumentId, setEditingDocumentId] =
    useState<string | null>(null)
  const [documentType, setDocumentType] =
    useState(DOCUMENT_TYPES[0])
  const [documentTitle, setDocumentTitle] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [documentCost, setDocumentCost] = useState('')
  const [provider, setProvider] = useState('')
  const [documentNotes, setDocumentNotes] = useState('')
  const [documentCompleted, setDocumentCompleted] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)

    try {
      const [maintenanceResult, documentsResult] = await Promise.all([
        supabase
          .from('motorcycle_maintenance')
          .select('*')
          .order('maintenance_date', { ascending: false }),
        supabase
          .from('motorcycle_documents')
          .select('*')
          .order('expiry_date', { ascending: true }),
      ])

      if (maintenanceResult.error) throw maintenanceResult.error
      if (documentsResult.error) throw documentsResult.error

      setMaintenance((maintenanceResult.data || []) as MaintenanceRow[])
      setDocuments((documentsResult.data || []) as DocumentRow[])
    } catch (loadError) {
      console.error(loadError)
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Errore durante il caricamento dei dati GoldWing.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchAll()
  }, [])

  const summary = useMemo(() => {
    const totalMaintenanceCost = maintenance.reduce(
      (sum, item) => sum + Number(item.cost || 0),
      0,
    )
    const totalDocumentCost = documents.reduce(
      (sum, item) => sum + Number(item.cost || 0),
      0,
    )
    const latestKm = Math.max(
      0,
      ...maintenance.map((item) => Number(item.odometer_km || 0)),
    )

    const upcoming = [
      ...maintenance
        .filter((item) => item.next_due_date)
        .map((item) => ({
          id: `m-${item.id}`,
          title: item.description,
          date: item.next_due_date,
          type: 'Manutenzione',
        })),
      ...documents
        .filter((item) => item.expiry_date && !item.completed)
        .map((item) => ({
          id: `d-${item.id}`,
          title: item.title,
          date: item.expiry_date,
          type: item.document_type,
        })),
    ]
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 5)

    return {
      totalMaintenanceCost,
      totalDocumentCost,
      latestKm,
      upcoming,
    }
  }, [maintenance, documents])

  const resetMaintenanceForm = () => {
    setEditingMaintenanceId(null)
    setMaintenanceDate(todayIso())
    setOdometerKm('')
    setMaintenanceCategory(MAINTENANCE_CATEGORIES[0])
    setMaintenanceDescription('')
    setMaintenanceCost('')
    setWorkshop('')
    setMaintenanceNotes('')
    setNextDueDate('')
    setNextDueKm('')
  }

  const resetDocumentForm = () => {
    setEditingDocumentId(null)
    setDocumentType(DOCUMENT_TYPES[0])
    setDocumentTitle('')
    setIssueDate('')
    setExpiryDate('')
    setDocumentCost('')
    setProvider('')
    setDocumentNotes('')
    setDocumentCompleted(false)
  }

  const saveMaintenance = async () => {
    if (!maintenanceDescription.trim()) {
      alert('Inserisci una descrizione dell’intervento.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        maintenance_date: maintenanceDate,
        odometer_km: odometerKm ? Number(odometerKm) : null,
        category: maintenanceCategory,
        description: maintenanceDescription.trim(),
        cost: maintenanceCost ? Number(maintenanceCost) : 0,
        workshop: workshop.trim() || null,
        notes: maintenanceNotes.trim() || null,
        next_due_date: nextDueDate || null,
        next_due_km: nextDueKm ? Number(nextDueKm) : null,
        updated_at: new Date().toISOString(),
      }

      const query = editingMaintenanceId
        ? supabase
            .from('motorcycle_maintenance')
            .update(payload)
            .eq('id', editingMaintenanceId)
        : supabase.from('motorcycle_maintenance').insert([payload])

      const { error: saveError } = await query
      if (saveError) throw saveError

      resetMaintenanceForm()
      await fetchAll()
    } catch (saveError) {
      alert(
        saveError instanceof Error
          ? saveError.message
          : 'Errore salvataggio manutenzione.',
      )
    } finally {
      setSaving(false)
    }
  }

  const editMaintenance = (item: MaintenanceRow) => {
    setEditingMaintenanceId(item.id)
    setMaintenanceDate(item.maintenance_date)
    setOdometerKm(
      item.odometer_km !== null ? String(item.odometer_km) : '',
    )
    setMaintenanceCategory(item.category)
    setMaintenanceDescription(item.description)
    setMaintenanceCost(String(item.cost || ''))
    setWorkshop(item.workshop || '')
    setMaintenanceNotes(item.notes || '')
    setNextDueDate(item.next_due_date || '')
    setNextDueKm(
      item.next_due_km !== null ? String(item.next_due_km) : '',
    )
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteMaintenance = async (id: string) => {
    if (!confirm('Eliminare questo intervento?')) return
    const { error: deleteError } = await supabase
      .from('motorcycle_maintenance')
      .delete()
      .eq('id', id)

    if (deleteError) {
      alert(deleteError.message)
      return
    }

    await fetchAll()
  }

  const saveDocument = async () => {
    if (!documentTitle.trim()) {
      alert('Inserisci il titolo del documento o della scadenza.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        document_type: documentType,
        title: documentTitle.trim(),
        issue_date: issueDate || null,
        expiry_date: expiryDate || null,
        cost: documentCost ? Number(documentCost) : 0,
        provider: provider.trim() || null,
        notes: documentNotes.trim() || null,
        completed: documentCompleted,
        updated_at: new Date().toISOString(),
      }

      const query = editingDocumentId
        ? supabase
            .from('motorcycle_documents')
            .update(payload)
            .eq('id', editingDocumentId)
        : supabase.from('motorcycle_documents').insert([payload])

      const { error: saveError } = await query
      if (saveError) throw saveError

      resetDocumentForm()
      await fetchAll()
    } catch (saveError) {
      alert(
        saveError instanceof Error
          ? saveError.message
          : 'Errore salvataggio documento.',
      )
    } finally {
      setSaving(false)
    }
  }

  const editDocument = (item: DocumentRow) => {
    setEditingDocumentId(item.id)
    setDocumentType(item.document_type)
    setDocumentTitle(item.title)
    setIssueDate(item.issue_date || '')
    setExpiryDate(item.expiry_date || '')
    setDocumentCost(String(item.cost || ''))
    setProvider(item.provider || '')
    setDocumentNotes(item.notes || '')
    setDocumentCompleted(item.completed)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteDocument = async (id: string) => {
    if (!confirm('Eliminare questo documento o scadenza?')) return
    const { error: deleteError } = await supabase
      .from('motorcycle_documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      alert(deleteError.message)
      return
    }

    await fetchAll()
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Caricamento GoldWing Manager…
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <h2 className="font-black text-destructive">
          GoldWing Manager non disponibile
        </h2>
        <p className="mt-2 text-xs text-muted-foreground">{error}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Verifica di aver eseguito lo script Supabase incluso nel pacchetto.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-zinc-950 via-black to-amber-950/70 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-400/15 text-amber-300">
              <Bike className="size-5" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">
                Versione 2.3 · GoldWing Manager
              </p>
              <h2 className="mt-1 text-xl font-black text-white sm:text-3xl">
                La tua GoldWing sotto controllo
              </h2>
              <p className="mt-2 max-w-2xl text-[10px] text-zinc-300 sm:text-sm">
                Manutenzione, chilometraggio, costi e scadenze in un’unica schermata.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
        <StatCard label="Km registrati" value={summary.latestKm.toFixed(0)} icon={Gauge} />
        <StatCard label="Costo manutenzione" value={formatMoney(summary.totalMaintenanceCost)} icon={Wrench} />
        <StatCard label="Documenti e scadenze" value={formatMoney(summary.totalDocumentCost)} icon={Receipt} />
        <StatCard label="Prossime scadenze" value={String(summary.upcoming.length)} icon={CalendarClock} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl border border-border bg-card p-2">
            <button
              type="button"
              onClick={() => setActiveSection('maintenance')}
              className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black sm:text-xs ${
                activeSection === 'maintenance'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              Manutenzione
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('documents')}
              className={`flex-1 rounded-lg px-3 py-2 text-[10px] font-black sm:text-xs ${
                activeSection === 'documents'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              Documenti e scadenze
            </button>
          </div>

          {activeSection === 'maintenance' ? (
            <>
              <MaintenanceForm
                editing={!!editingMaintenanceId}
                saving={saving}
                maintenanceDate={maintenanceDate}
                setMaintenanceDate={setMaintenanceDate}
                odometerKm={odometerKm}
                setOdometerKm={setOdometerKm}
                category={maintenanceCategory}
                setCategory={setMaintenanceCategory}
                description={maintenanceDescription}
                setDescription={setMaintenanceDescription}
                cost={maintenanceCost}
                setCost={setMaintenanceCost}
                workshop={workshop}
                setWorkshop={setWorkshop}
                notes={maintenanceNotes}
                setNotes={setMaintenanceNotes}
                nextDueDate={nextDueDate}
                setNextDueDate={setNextDueDate}
                nextDueKm={nextDueKm}
                setNextDueKm={setNextDueKm}
                onSave={saveMaintenance}
                onCancel={resetMaintenanceForm}
              />

              <div className="space-y-3">
                {maintenance.map((item) => (
                  <article key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[8px] font-black uppercase text-primary">
                          {item.category}
                        </span>
                        <h3 className="mt-2 text-sm font-black">{item.description}</h3>
                        <p className="mt-1 text-[9px] text-muted-foreground sm:text-xs">
                          {formatDate(item.maintenance_date)}
                          {item.odometer_km !== null ? ` · ${item.odometer_km.toFixed(0)} km` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-black">{formatMoney(item.cost)}</p>
                    </div>

                    {(item.workshop || item.notes) && (
                      <div className="mt-3 rounded-lg bg-secondary/20 p-3 text-[9px] text-muted-foreground sm:text-xs">
                        {item.workshop && <p>Officina: {item.workshop}</p>}
                        {item.notes && <p className="mt-1">{item.notes}</p>}
                      </div>
                    )}

                    {(item.next_due_date || item.next_due_km) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.next_due_date && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[8px] font-bold text-amber-500">
                            Prossima data: {formatDate(item.next_due_date)}
                          </span>
                        )}
                        {item.next_due_km && (
                          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[8px] font-bold text-amber-500">
                            Prossimi km: {item.next_due_km.toFixed(0)}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex justify-end gap-2">
                      <ActionButton icon={Pencil} label="Modifica" onClick={() => editMaintenance(item)} />
                      <ActionButton icon={Trash2} label="Elimina" danger onClick={() => deleteMaintenance(item.id)} />
                    </div>
                  </article>
                ))}

                {maintenance.length === 0 && <EmptyState text="Nessun intervento registrato." />}
              </div>
            </>
          ) : (
            <>
              <DocumentForm
                editing={!!editingDocumentId}
                saving={saving}
                documentType={documentType}
                setDocumentType={setDocumentType}
                title={documentTitle}
                setTitle={setDocumentTitle}
                issueDate={issueDate}
                setIssueDate={setIssueDate}
                expiryDate={expiryDate}
                setExpiryDate={setExpiryDate}
                cost={documentCost}
                setCost={setDocumentCost}
                provider={provider}
                setProvider={setProvider}
                notes={documentNotes}
                setNotes={setDocumentNotes}
                completed={documentCompleted}
                setCompleted={setDocumentCompleted}
                onSave={saveDocument}
                onCancel={resetDocumentForm}
              />

              <div className="space-y-3">
                {documents.map((item) => {
                  const remaining = daysUntil(item.expiry_date)
                  const expired = remaining !== null && remaining < 0

                  return (
                    <article key={item.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-2 py-1 text-[8px] font-black uppercase text-primary">
                              {item.document_type}
                            </span>
                            {item.completed && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[8px] font-bold text-emerald-500">
                                Completato
                              </span>
                            )}
                          </div>
                          <h3 className="mt-2 text-sm font-black">{item.title}</h3>
                          <p className="mt-1 text-[9px] text-muted-foreground sm:text-xs">
                            Scadenza: {formatDate(item.expiry_date)}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black">{formatMoney(item.cost)}</p>
                      </div>

                      {remaining !== null && !item.completed && (
                        <div className={`mt-3 rounded-lg p-3 text-[9px] font-bold sm:text-xs ${
                          expired
                            ? 'bg-destructive/10 text-destructive'
                            : remaining <= 30
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-secondary/20 text-muted-foreground'
                        }`}>
                          {expired
                            ? `Scaduto da ${Math.abs(remaining)} giorni`
                            : `Mancano ${remaining} giorni`}
                        </div>
                      )}

                      {(item.provider || item.notes) && (
                        <div className="mt-3 text-[9px] text-muted-foreground sm:text-xs">
                          {item.provider && <p>Fornitore: {item.provider}</p>}
                          {item.notes && <p className="mt-1">{item.notes}</p>}
                        </div>
                      )}

                      <div className="mt-3 flex justify-end gap-2">
                        <ActionButton icon={Pencil} label="Modifica" onClick={() => editDocument(item)} />
                        <ActionButton icon={Trash2} label="Elimina" danger onClick={() => deleteDocument(item.id)} />
                      </div>
                    </article>
                  )
                })}

                {documents.length === 0 && <EmptyState text="Nessuna scadenza registrata." />}
              </div>
            </>
          )}
        </div>

        <aside className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-primary" />
            <h3 className="text-sm font-black">Prossime scadenze</h3>
          </div>

          <div className="mt-4 space-y-3">
            {summary.upcoming.map((item) => {
              const remaining = daysUntil(item.date)
              const urgent = remaining !== null && remaining <= 30

              return (
                <div key={item.id} className="rounded-lg border border-border/60 bg-background p-3">
                  <div className="flex items-start gap-2">
                    {urgent ? (
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-black sm:text-xs">{item.title}</p>
                      <p className="mt-1 text-[8px] text-muted-foreground sm:text-[10px]">
                        {item.type} · {formatDate(item.date)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {summary.upcoming.length === 0 && (
              <p className="text-[9px] text-muted-foreground sm:text-xs">
                Nessuna scadenza futura.
              </p>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof Gauge
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-5">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <p className="text-[8px] font-bold uppercase text-muted-foreground sm:text-[10px]">{label}</p>
      </div>
      <p className="mt-3 break-words text-lg font-black sm:text-2xl">{value}</p>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  danger = false,
}: {
  icon: typeof Pencil
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-bold ${
        danger
          ? 'border-destructive/30 text-destructive hover:bg-destructive/10'
          : 'border-border hover:bg-secondary'
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-[10px] text-muted-foreground sm:text-xs">
      {text}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="min-w-0">
      <span className="text-[8px] font-bold uppercase text-muted-foreground sm:text-[10px]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputClass =
  'h-10 w-full min-w-0 rounded-xl border border-border bg-background px-3 text-[10px] text-foreground outline-none focus:border-primary sm:text-xs'

function MaintenanceForm(props: any) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black">
          {props.editing ? 'Modifica intervento' : 'Nuovo intervento'}
        </h3>
        {props.editing && (
          <button type="button" onClick={props.onCancel}>
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Data"><input type="date" value={props.maintenanceDate} onChange={(e) => props.setMaintenanceDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Chilometraggio"><input type="number" value={props.odometerKm} onChange={(e) => props.setOdometerKm(e.target.value)} className={inputClass} placeholder="Es. 48250" /></Field>
        <Field label="Categoria"><select value={props.category} onChange={(e) => props.setCategory(e.target.value)} className={inputClass}>{MAINTENANCE_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Descrizione"><input value={props.description} onChange={(e) => props.setDescription(e.target.value)} className={inputClass} placeholder="Es. Cambio olio e filtro" /></Field>
        <Field label="Costo"><input type="number" step="0.01" value={props.cost} onChange={(e) => props.setCost(e.target.value)} className={inputClass} /></Field>
        <Field label="Officina"><input value={props.workshop} onChange={(e) => props.setWorkshop(e.target.value)} className={inputClass} /></Field>
        <Field label="Prossima data"><input type="date" value={props.nextDueDate} onChange={(e) => props.setNextDueDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Prossimi km"><input type="number" value={props.nextDueKm} onChange={(e) => props.setNextDueKm(e.target.value)} className={inputClass} /></Field>
        <Field label="Note"><input value={props.notes} onChange={(e) => props.setNotes(e.target.value)} className={inputClass} /></Field>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {props.editing && <button type="button" onClick={props.onCancel} className="h-9 rounded-lg border border-border px-3 text-[9px] font-bold">Annulla</button>}
        <button type="button" onClick={props.onSave} disabled={props.saving} className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[9px] font-black text-primary-foreground disabled:opacity-50">
          {props.editing ? <Save className="size-3.5" /> : <Plus className="size-3.5" />}
          {props.editing ? 'Salva modifiche' : 'Aggiungi intervento'}
        </button>
      </div>
    </section>
  )
}

function DocumentForm(props: any) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black">
          {props.editing ? 'Modifica scadenza' : 'Nuovo documento o scadenza'}
        </h3>
        {props.editing && (
          <button type="button" onClick={props.onCancel}>
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label="Tipo"><select value={props.documentType} onChange={(e) => props.setDocumentType(e.target.value)} className={inputClass}>{DOCUMENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Titolo"><input value={props.title} onChange={(e) => props.setTitle(e.target.value)} className={inputClass} /></Field>
        <Field label="Fornitore"><input value={props.provider} onChange={(e) => props.setProvider(e.target.value)} className={inputClass} /></Field>
        <Field label="Data emissione"><input type="date" value={props.issueDate} onChange={(e) => props.setIssueDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Scadenza"><input type="date" value={props.expiryDate} onChange={(e) => props.setExpiryDate(e.target.value)} className={inputClass} /></Field>
        <Field label="Costo"><input type="number" step="0.01" value={props.cost} onChange={(e) => props.setCost(e.target.value)} className={inputClass} /></Field>
        <Field label="Note"><input value={props.notes} onChange={(e) => props.setNotes(e.target.value)} className={inputClass} /></Field>
        <label className="flex items-center gap-2 self-end pb-2 text-[9px] font-bold sm:text-xs">
          <input type="checkbox" checked={props.completed} onChange={(e) => props.setCompleted(e.target.checked)} />
          Scadenza completata
        </label>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        {props.editing && <button type="button" onClick={props.onCancel} className="h-9 rounded-lg border border-border px-3 text-[9px] font-bold">Annulla</button>}
        <button type="button" onClick={props.onSave} disabled={props.saving} className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-[9px] font-black text-primary-foreground disabled:opacity-50">
          {props.editing ? <Save className="size-3.5" /> : <Plus className="size-3.5" />}
          {props.editing ? 'Salva modifiche' : 'Aggiungi scadenza'}
        </button>
      </div>
    </section>
  )
}
