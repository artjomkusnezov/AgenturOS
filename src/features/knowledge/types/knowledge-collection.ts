import type { Tables } from '@/lib/supabase/types'

export type KnowledgeCollectionRecord = Tables<'knowledge_collections'>

export type KnowledgeCollection = {
  id: string
  agency_id: string
  key: string
  label: string
  icon: string | null
  sort_order: number
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
}

/** Standard-Collection-Key für neue Informationen (V1). */
export const DEFAULT_KNOWLEDGE_COLLECTION_KEY = 'general'
