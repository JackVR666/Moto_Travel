'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react'

import { supabase } from '@/lib/supabaseClient'

import type {
  TravelChecklistItem,
  TravelChecklistSection,
} from '@/types/travelChecklist'

type SectionFormState = {
  id: string | null
  title: string
}

type ItemFormState = {
  id: string | null
  sectionId: string | null
  text: string
  notes: string
  isEssential: boolean
}

const EMPTY_SECTION_FORM: SectionFormState = {
  id: null,
  title: '',
}

const EMPTY_ITEM_FORM: ItemFormState = {
  id: null,
  sectionId: null,
  text: '',
  notes: '',
  isEssential: false,
}

function sortChecklist(
  sections: TravelChecklistSection[],
): TravelChecklistSection[] {
  return [...sections]
    .sort((a, b) => a.position - b.position)
    .map((section) => ({
      ...section,
      items: [...(section.items ?? [])].sort(
        (a, b) => a.position - b.position,
      ),
    }))
}

export default function TravelChecklist() {
  const [sections, setSections] = useState<
    TravelChecklistSection[]
  >([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<
    string | null
  >(null)

  const [errorMessage, setErrorMessage] = useState<
    string | null
  >(null)

  const [successMessage, setSuccessMessage] = useState<
    string | null
  >(null)

  const [sectionForm, setSectionForm] =
    useState<SectionFormState | null>(null)

  const [itemForm, setItemForm] =
    useState<ItemFormState | null>(null)

  const loadChecklist = useCallback(async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .from('travel_checklist_sections')
        .select(`
          id,
          title,
          position,
          created_at,
          items:travel_checklist_items (
            id,
            section_id,
            text,
            notes,
            is_completed,
            is_essential,
            position,
            created_at,
            completed_at
          )
        `)
        .order('position', { ascending: true })

      if (error) {
        throw error
      }

      const normalizedSections = (
        data ?? []
      ) as TravelChecklistSection[]

      setSections(sortChecklist(normalizedSections))
    } catch (error) {
      console.error(
        'Errore durante il caricamento della checklist:',
        error,
      )

      setErrorMessage(
        'Non è stato possibile caricare la checklist.',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChecklist()
  }, [loadChecklist])

  const totals = useMemo(() => {
    const items = sections.flatMap(
      (section) => section.items,
    )

    const completed = items.filter(
      (item) => item.is_completed,
    ).length

    const essentialItems = items.filter(
      (item) => item.is_essential,
    )

    const missingEssential = essentialItems.filter(
      (item) => !item.is_completed,
    ).length

    const percentage =
      items.length > 0
        ? Math.round((completed / items.length) * 100)
        : 0

    return {
      total: items.length,
      completed,
      percentage,
      essential: essentialItems.length,
      missingEssential,
    }
  }, [sections])

  function showSuccess(message: string) {
    setSuccessMessage(message)

    window.setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)
  }

  function openNewSectionForm() {
    setSectionForm({
      ...EMPTY_SECTION_FORM,
    })
  }

  function openEditSectionForm(
    section: TravelChecklistSection,
  ) {
    setSectionForm({
      id: section.id,
      title: section.title,
    })
  }

  function openNewItemForm(sectionId: string) {
    setItemForm({
      ...EMPTY_ITEM_FORM,
      sectionId,
    })
  }

  function openEditItemForm(
    item: TravelChecklistItem,
  ) {
    setItemForm({
      id: item.id,
      sectionId: item.section_id,
      text: item.text,
      notes: item.notes ?? '',
      isEssential: item.is_essential,
    })
  }

  async function saveSection() {
    if (!sectionForm) {
      return
    }

    const title = sectionForm.title.trim()

    if (!title) {
      setErrorMessage(
        'Inserisci il nome del capitolo.',
      )
      return
    }

    try {
      setSaving(true)
      setErrorMessage(null)

      if (sectionForm.id) {
        const { error } = await supabase
          .from('travel_checklist_sections')
          .update({
            title,
          })
          .eq('id', sectionForm.id)

        if (error) {
          throw error
        }

        setSections((current) =>
          current.map((section) =>
            section.id === sectionForm.id
              ? {
                  ...section,
                  title,
                }
              : section,
          ),
        )

        showSuccess('Capitolo aggiornato.')
      } else {
        const nextPosition =
          sections.length > 0
            ? Math.max(
                ...sections.map(
                  (section) => section.position,
                ),
              ) + 10
            : 10

        const { data, error } = await supabase
          .from('travel_checklist_sections')
          .insert({
            title,
            position: nextPosition,
          })
          .select(`
            id,
            title,
            position,
            created_at
          `)
          .single()

        if (error) {
          throw error
        }

        const newSection: TravelChecklistSection = {
          ...data,
          items: [],
        }

        setSections((current) =>
          sortChecklist([...current, newSection]),
        )

        showSuccess('Nuovo capitolo creato.')
      }

      setSectionForm(null)
    } catch (error) {
      console.error(
        'Errore durante il salvataggio del capitolo:',
        error,
      )

      setErrorMessage(
        'Non è stato possibile salvare il capitolo.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteSection(
    section: TravelChecklistSection,
  ) {
    const confirmed = window.confirm(
      `Vuoi eliminare il capitolo "${section.title}"?\n\nVerranno eliminate anche tutte le voci contenute nel capitolo.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setErrorMessage(null)

      const { error } = await supabase
        .from('travel_checklist_sections')
        .delete()
        .eq('id', section.id)

      if (error) {
        throw error
      }

      setSections((current) =>
        current.filter(
          (currentSection) =>
            currentSection.id !== section.id,
        ),
      )

      showSuccess('Capitolo eliminato.')
    } catch (error) {
      console.error(
        'Errore durante l’eliminazione del capitolo:',
        error,
      )

      setErrorMessage(
        'Non è stato possibile eliminare il capitolo.',
      )
    }
  }

  async function saveItem() {
    if (!itemForm || !itemForm.sectionId) {
      return
    }

    const text = itemForm.text.trim()
    const notes = itemForm.notes.trim()

    if (!text) {
      setErrorMessage(
        'Inserisci il testo della voce.',
      )
      return
    }

    try {
      setSaving(true)
      setErrorMessage(null)

      if (itemForm.id) {
        const { data, error } = await supabase
          .from('travel_checklist_items')
          .update({
            text,
            notes: notes || null,
            is_essential: itemForm.isEssential,
          })
          .eq('id', itemForm.id)
          .select(`
            id,
            section_id,
            text,
            notes,
            is_completed,
            is_essential,
            position,
            created_at,
            completed_at
          `)
          .single()

        if (error) {
          throw error
        }

        const updatedItem =
          data as TravelChecklistItem

        setSections((current) =>
          current.map((section) => ({
            ...section,
            items: section.items.map((item) =>
              item.id === updatedItem.id
                ? updatedItem
                : item,
            ),
          })),
        )

        showSuccess('Voce aggiornata.')
      } else {
        const targetSection = sections.find(
          (section) =>
            section.id === itemForm.sectionId,
        )

        const nextPosition =
          targetSection &&
          targetSection.items.length > 0
            ? Math.max(
                ...targetSection.items.map(
                  (item) => item.position,
                ),
              ) + 10
            : 10

        const { data, error } = await supabase
          .from('travel_checklist_items')
          .insert({
            section_id: itemForm.sectionId,
            text,
            notes: notes || null,
            is_essential: itemForm.isEssential,
            is_completed: false,
            position: nextPosition,
          })
          .select(`
            id,
            section_id,
            text,
            notes,
            is_completed,
            is_essential,
            position,
            created_at,
            completed_at
          `)
          .single()

        if (error) {
          throw error
        }

        const newItem = data as TravelChecklistItem

        setSections((current) =>
          current.map((section) =>
            section.id === newItem.section_id
              ? {
                  ...section,
                  items: [...section.items, newItem].sort(
                    (a, b) =>
                      a.position - b.position,
                  ),
                }
              : section,
          ),
        )

        showSuccess('Nuova voce aggiunta.')
      }

      setItemForm(null)
    } catch (error) {
      console.error(
        'Errore durante il salvataggio della voce:',
        error,
      )

      setErrorMessage(
        'Non è stato possibile salvare la voce.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(
    item: TravelChecklistItem,
  ) {
    const confirmed = window.confirm(
      `Vuoi eliminare la voce "${item.text}"?`,
    )

    if (!confirmed) {
      return
    }

    try {
      setErrorMessage(null)

      const { error } = await supabase
        .from('travel_checklist_items')
        .delete()
        .eq('id', item.id)

      if (error) {
        throw error
      }

      setSections((current) =>
        current.map((section) => ({
          ...section,
          items: section.items.filter(
            (currentItem) =>
              currentItem.id !== item.id,
          ),
        })),
      )

      showSuccess('Voce eliminata.')
    } catch (error) {
      console.error(
        'Errore durante l’eliminazione della voce:',
        error,
      )

      setErrorMessage(
        'Non è stato possibile eliminare la voce.',
      )
    }
  }

  async function toggleItem(
    item: TravelChecklistItem,
  ) {
    const nextCompletedValue =
      !item.is_completed

    try {
      setUpdatingItemId(item.id)
      setErrorMessage(null)

      const completedAt = nextCompletedValue
        ? new Date().toISOString()
        : null

      setSections((current) =>
        current.map((section) => ({
          ...section,
          items: section.items.map(
            (currentItem) =>
              currentItem.id === item.id
                ? {
                    ...currentItem,
                    is_completed:
                      nextCompletedValue,
                    completed_at: completedAt,
                  }
                : currentItem,
          ),
        })),
      )

      const { error } = await supabase
        .from('travel_checklist_items')
        .update({
          is_completed: nextCompletedValue,
          completed_at: completedAt,
        })
        .eq('id', item.id)

      if (error) {
        throw error
      }
    } catch (error) {
      console.error(
        'Errore durante l’aggiornamento della voce:',
        error,
      )

      setSections((current) =>
        current.map((section) => ({
          ...section,
          items: section.items.map(
            (currentItem) =>
              currentItem.id === item.id
                ? item
                : currentItem,
          ),
        })),
      )

      setErrorMessage(
        'Non è stato possibile aggiornare la voce.',
      )
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function resetChecklist() {
    if (totals.completed === 0) {
      setErrorMessage(
        'La checklist è già completamente da preparare.',
      )
      return
    }

    const confirmed = window.confirm(
      `Vuoi preparare un nuovo viaggio?\n\nVerranno eliminate tutte le spunte, ma capitoli e voci resteranno invariati.`,
    )

    if (!confirmed) {
      return
    }

    try {
      setResetting(true)
      setErrorMessage(null)

      const { error } = await supabase
        .from('travel_checklist_items')
        .update({
          is_completed: false,
          completed_at: null,
        })
        .eq('is_completed', true)

      if (error) {
        throw error
      }

      setSections((current) =>
        current.map((section) => ({
          ...section,
          items: section.items.map((item) => ({
            ...item,
            is_completed: false,
            completed_at: null,
          })),
        })),
      )

      showSuccess(
        'Checklist azzerata. Puoi iniziare a preparare il nuovo viaggio.',
      )
    } catch (error) {
      console.error(
        'Errore durante l’azzeramento della checklist:',
        error,
      )

      setErrorMessage(
        'Non è stato possibile azzerare la checklist.',
      )
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Caricamento checklist...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>

          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="rounded-lg p-1 hover:bg-red-100"
            aria-label="Chiudi messaggio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-5 py-6 text-white sm:px-7 sm:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
                Preparazione viaggio
              </div>

              <h1 className="text-2xl font-bold sm:text-3xl">
                Checklist partenza
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Una checklist permanente che puoi migliorare
                viaggio dopo viaggio.
              </p>
            </div>

            <button
              type="button"
              onClick={resetChecklist}
              disabled={resetting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resetting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}

              Prepara un nuovo viaggio
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-2xl font-bold">
                {totals.percentage}%
              </div>

              <div className="mt-1 text-xs text-slate-300">
                completato
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div className="text-2xl font-bold">
                {totals.completed}/{totals.total}
              </div>

              <div className="mt-1 text-xs text-slate-300">
                attività preparate
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
              <div
                className={
                  totals.missingEssential > 0
                    ? 'text-2xl font-bold text-amber-400'
                    : 'text-2xl font-bold text-emerald-400'
                }
              >
                {totals.missingEssential}
              </div>

              <div className="mt-1 text-xs text-slate-300">
                essenziali mancanti
              </div>
            </div>
          </div>

          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-500"
              style={{
                width: `${totals.percentage}%`,
              }}
            />
          </div>
        </div>
      </section>

      {totals.missingEssential > 0 && (
        <section className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div>
            <div className="font-semibold">
              Mancano elementi essenziali
            </div>

            <p className="mt-1 text-sm text-amber-800">
              Devi ancora preparare{' '}
              {totals.missingEssential}{' '}
              {totals.missingEssential === 1
                ? 'elemento essenziale'
                : 'elementi essenziali'}.
            </p>
          </div>
        </section>
      )}

      {sections.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <CheckCircle2 className="h-7 w-7 text-slate-400" />
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            La checklist è vuota
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Crea il primo capitolo, per esempio
            Documenti, Moto, Abbigliamento oppure
            Elettronica.
          </p>

          <button
            type="button"
            onClick={openNewSectionForm}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Crea il primo capitolo
          </button>
        </section>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {sections.map((section) => {
            const completedItems =
              section.items.filter(
                (item) => item.is_completed,
              ).length

            return (
              <section
                key={section.id}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5">
                  <div>
                    <h2 className="text-base font-bold uppercase tracking-wide text-slate-900">
                      {section.title}
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      {completedItems} di{' '}
                      {section.items.length} completate
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        openEditSectionForm(section)
                      }
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Modifica capitolo"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void deleteSection(section)
                      }
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Elimina capitolo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </header>

                {section.items.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-slate-500">
                    Nessuna voce presente in questo
                    capitolo.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {section.items.map((item) => {
                      const isUpdating =
                        updatingItemId === item.id

                      return (
                        <article
                          key={item.id}
                          className="group flex items-start gap-3 px-5 py-4 transition hover:bg-slate-50"
                        >
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() =>
                              void toggleItem(item)
                            }
                            className="mt-0.5 shrink-0 disabled:opacity-50"
                            aria-label={
                              item.is_completed
                                ? 'Segna come da preparare'
                                : 'Segna come preparata'
                            }
                          >
                            {isUpdating ? (
                              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            ) : item.is_completed ? (
                              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            ) : (
                              <Circle className="h-6 w-6 text-slate-300" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={
                                  item.is_completed
                                    ? 'text-sm text-slate-400 line-through'
                                    : 'text-sm font-medium text-slate-800'
                                }
                              >
                                {item.text}
                              </p>

                              {item.is_essential && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                  <Star className="h-3 w-3 fill-current" />
                                  Essenziale
                                </span>
                              )}
                            </div>

                            {item.notes && (
                              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                                {item.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() =>
                                openEditItemForm(item)
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                              aria-label="Modifica voce"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void deleteItem(item)
                              }
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Elimina voce"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}

                <footer className="border-t border-slate-100 px-5 py-4">
                  <button
                    type="button"
                    onClick={() =>
                      openNewItemForm(section.id)
                    }
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
                  >
                    <Plus className="h-4 w-4" />
                    Aggiungi voce
                  </button>
                </footer>
              </section>
            )
          })}
        </div>
      )}

      {sections.length > 0 && (
        <button
          type="button"
          onClick={openNewSectionForm}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Nuovo capitolo
        </button>
      )}

      {sectionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {sectionForm.id
                  ? 'Modifica capitolo'
                  : 'Nuovo capitolo'}
              </h2>

              <button
                type="button"
                onClick={() => setSectionForm(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-2 px-5 py-5">
              <label
                htmlFor="section-title"
                className="text-sm font-semibold text-slate-700"
              >
                Nome del capitolo
              </label>

              <input
                id="section-title"
                type="text"
                autoFocus
                value={sectionForm.title}
                onChange={(event) =>
                  setSectionForm((current) =>
                    current
                      ? {
                          ...current,
                          title:
                            event.target.value,
                        }
                      : null,
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void saveSection()
                  }
                }}
                placeholder="Esempio: Documenti"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
              />
            </div>

            <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setSectionForm(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Annulla
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveSection()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Salva
              </button>
            </footer>
          </div>
        </div>
      )}

      {itemForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-900">
                {itemForm.id
                  ? 'Modifica voce'
                  : 'Nuova voce'}
              </h2>

              <button
                type="button"
                onClick={() => setItemForm(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Chiudi"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2">
                <label
                  htmlFor="item-text"
                  className="text-sm font-semibold text-slate-700"
                >
                  Cosa devi preparare?
                </label>

                <input
                  id="item-text"
                  type="text"
                  autoFocus
                  value={itemForm.text}
                  onChange={(event) =>
                    setItemForm((current) =>
                      current
                        ? {
                            ...current,
                            text:
                              event.target.value,
                          }
                        : null,
                    )
                  }
                  placeholder="Esempio: Caricabatterie del telefono"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="item-notes"
                  className="text-sm font-semibold text-slate-700"
                >
                  Note facoltative
                </label>

                <textarea
                  id="item-notes"
                  rows={3}
                  value={itemForm.notes}
                  onChange={(event) =>
                    setItemForm((current) =>
                      current
                        ? {
                            ...current,
                            notes:
                              event.target.value,
                          }
                        : null,
                    )
                  }
                  placeholder="Marca, quantità, posizione nel bagaglio..."
                  className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-950 focus:ring-2 focus:ring-slate-950/10"
                />
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                <input
                  type="checkbox"
                  checked={itemForm.isEssential}
                  onChange={(event) =>
                    setItemForm((current) =>
                      current
                        ? {
                            ...current,
                            isEssential:
                              event.target.checked,
                          }
                        : null,
                    )
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300"
                />

                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Star className="h-4 w-4 text-amber-500" />
                    Elemento essenziale
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Usa questa opzione per documenti,
                    chiavi, medicinali o elementi che
                    non puoi dimenticare.
                  </p>
                </div>
              </label>
            </div>

            <footer className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setItemForm(null)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Annulla
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => void saveItem()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}

                Salva
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}