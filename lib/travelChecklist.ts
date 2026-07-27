export type TravelChecklistItem = {
  id: string
  section_id: string
  text: string
  notes: string | null
  is_completed: boolean
  is_essential: boolean
  position: number
  created_at: string
  completed_at: string | null
}

export type TravelChecklistSection = {
  id: string
  title: string
  position: number
  created_at: string
  items: TravelChecklistItem[]
}