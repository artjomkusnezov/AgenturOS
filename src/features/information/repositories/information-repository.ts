import { isValidFileId } from '@/features/files/lib/validate-file'
import { isValidInformationItemId } from '@/features/information/lib/validate-information-item'
import { sortInformationItems } from '@/features/information/lib/sort-information-items'
import type {
  InformationItem,
  InformationLinkedFile,
} from '@/features/information/types/information-item'
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

export async function listInformationItemsForCurrentUser(): Promise<ListInformationItemsResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .select('*')
    .eq('user_id', authResult.userId)

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
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .select('*')
    .eq('id', itemId)
    .eq('user_id', authResult.userId)
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

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .insert({
      user_id: authResult.userId,
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
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .update({
      title: input.title,
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', authResult.userId)
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
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('information_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', authResult.userId)
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

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
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

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
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

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
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
