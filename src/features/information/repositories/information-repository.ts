import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { isValidFileId } from '@/features/files/lib/validate-file'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'
import { sortInformationItems } from '@/features/information/lib/sort-information-items'
import type {
  InformationItem,
  InformationLinkedFile,
} from '@/features/information/types/information-item'
import { resolveDefaultKnowledgeCollectionForCurrentAgency } from '@/features/knowledge/repositories/knowledge-collections-repository'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListInformationItemsResult =
  | { success: true; items: InformationItem[] }
  | RepositoryError

type InformationItemResult =
  | { success: true; item: InformationItem }
  | RepositoryError

type DeleteInformationItemResult =
  | { success: true }
  | RepositoryError

type ListInformationFilesResult =
  | { success: true; files: InformationLinkedFile[] }
  | RepositoryError

type RelationMutationResult = { success: true } | RepositoryError

type InformationWriteInput = {
  title: string
  content: string | null
  /** Optional; Standard ist die Collection „Allgemein“. */
  knowledgeCollectionId?: string
}

async function getAuthenticatedUserId(): Promise<
  { success: true; userId: string } | RepositoryError
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      success: false,
      error: 'Sie sind nicht angemeldet.',
    }
  }

  return {
    success: true,
    userId: user.id,
  }
}

/**
 * Listet Knowledge der aktuellen Agentur.
 * Funktionsname bleibt für UI-Kompatibilität; Scope ist agency-weit (30G).
 */
export async function listInformationItemsForCurrentUser(): Promise<ListInformationItemsResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .select('*')
    .eq('agency_id', agencyResult.agency.id)

  if (error) {
    return {
      success: false,
      error: 'Die Informationen konnten nicht geladen werden.',
    }
  }

  return {
    success: true,
    items: sortInformationItems(data),
  }
}

export async function getInformationItemForCurrentUser(
  itemId: string
): Promise<InformationItemResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .select('*')
    .eq('id', itemId)
    .eq('agency_id', agencyResult.agency.id)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Information konnte nicht geladen werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Information wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function createInformationItemForCurrentUser(
  input: InformationWriteInput
): Promise<InformationItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  let collectionId = input.knowledgeCollectionId ?? null

  if (!collectionId) {
    const defaultCollection = await resolveDefaultKnowledgeCollectionForCurrentAgency()
    if (!defaultCollection.success) {
      return defaultCollection
    }
    collectionId = defaultCollection.collection.id
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .insert({
      user_id: authResult.userId,
      created_by: authResult.userId,
      agency_id: agencyResult.agency.id,
      knowledge_collection_id: collectionId,
      title: input.title,
      content: input.content,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Information konnte nicht erstellt werden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function updateInformationItemForCurrentUser(
  itemId: string,
  input: InformationWriteInput
): Promise<InformationItemResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const updatePayload: {
    title: string
    content: string | null
    updated_at: string
    knowledge_collection_id?: string
  } = {
    title: input.title,
    content: input.content,
    updated_at: new Date().toISOString(),
  }

  if (input.knowledgeCollectionId) {
    updatePayload.knowledge_collection_id = input.knowledgeCollectionId
  }

  const { data, error } = await supabase
    .from('information_items')
    .update(updatePayload)
    .eq('id', itemId)
    .eq('agency_id', agencyResult.agency.id)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Information konnte nicht gespeichert werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Information wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function deleteInformationItemForCurrentUser(
  itemId: string
): Promise<DeleteInformationItemResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .delete()
    .eq('id', itemId)
    .eq('agency_id', agencyResult.agency.id)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Information konnte nicht gelöscht werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Information wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}

export async function listFilesForInformationItem(
  informationId: string,
): Promise<ListInformationFilesResult> {
  if (!isValidInformationItemId(informationId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Information an.',
    }
  }

  const ownership = await getInformationItemForCurrentUser(informationId)

  if (!ownership.success) {
    return ownership
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_item_files')
    .select('id, created_at, display_order, files(*)')
    .eq('information_id', informationId)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Die Anhänge konnten nicht geladen werden.',
    }
  }

  const files: InformationLinkedFile[] = []

  for (const row of data) {
    const file = row.files

    files.push({
      relationId: row.id,
      linkedAt: row.created_at,
      displayOrder: row.display_order,
      file: !file || Array.isArray(file) ? null : file,
    })
  }

  return {
    success: true,
    files,
  }
}

export async function attachFileToInformationItem(
  informationId: string,
  fileId: string,
): Promise<RelationMutationResult> {
  if (!isValidInformationItemId(informationId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Information an.',
    }
  }

  if (!isValidFileId(fileId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Datei an.',
    }
  }

  const ownership = await getInformationItemForCurrentUser(informationId)

  if (!ownership.success) {
    return ownership
  }

  const supabase = await createClient()

  const { data: existingOrders, error: orderError } = await supabase
    .from('information_item_files')
    .select('display_order')
    .eq('information_id', informationId)
    .order('display_order', { ascending: false })
    .limit(1)

  if (orderError) {
    return {
      success: false,
      error: 'Die Datei konnte nicht angehängt werden.',
    }
  }

  const nextOrder =
    existingOrders && existingOrders.length > 0
      ? existingOrders[0].display_order + 1
      : 0

  const { error } = await supabase.from('information_item_files').insert({
    information_id: informationId,
    file_id: fileId,
    display_order: nextOrder,
  })

  if (error) {
    if (error.code === '23505') {
      return {
        success: false,
        error: 'Diese Datei ist bereits angehängt.',
      }
    }

    return {
      success: false,
      error: 'Die Datei konnte nicht angehängt werden.',
    }
  }

  return {
    success: true,
  }
}

export async function detachFileFromInformationItem(
  informationId: string,
  fileId: string,
): Promise<RelationMutationResult> {
  if (!isValidInformationItemId(informationId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Information an.',
    }
  }

  if (!isValidFileId(fileId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Datei an.',
    }
  }

  const ownership = await getInformationItemForCurrentUser(informationId)

  if (!ownership.success) {
    return ownership
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_item_files')
    .delete()
    .eq('information_id', informationId)
    .eq('file_id', fileId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Die Verknüpfung konnte nicht entfernt werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Verknüpfung wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}
