import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import {
  DEFAULT_KNOWLEDGE_COLLECTION_KEY,
  type KnowledgeCollection,
} from '@/features/knowledge/types/knowledge-collection'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListKnowledgeCollectionsResult =
  | { success: true; collections: KnowledgeCollection[] }
  | RepositoryError

type KnowledgeCollectionResult =
  | { success: true; collection: KnowledgeCollection }
  | RepositoryError

function mapCollection(row: {
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
}): KnowledgeCollection {
  return {
    id: row.id,
    agency_id: row.agency_id,
    key: row.key,
    label: row.label,
    icon: row.icon,
    sort_order: row.sort_order,
    is_active: row.is_active,
    is_system: row.is_system,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export async function listActiveKnowledgeCollectionsForCurrentAgency(): Promise<ListKnowledgeCollectionsResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('knowledge_collections')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die Wissensbereiche konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    collections: data.map(mapCollection),
  }
}

export async function getKnowledgeCollectionByKeyForCurrentAgency(
  key: string,
): Promise<KnowledgeCollectionResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('knowledge_collections')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)
    .eq('key', key)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Wissensbereich konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Der Wissensbereich wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    collection: mapCollection(data),
  }
}

/** Löst die Standard-Collection „Allgemein“ für die aktuelle Agentur auf. */
export async function resolveDefaultKnowledgeCollectionForCurrentAgency(): Promise<KnowledgeCollectionResult> {
  return getKnowledgeCollectionByKeyForCurrentAgency(DEFAULT_KNOWLEDGE_COLLECTION_KEY)
}
