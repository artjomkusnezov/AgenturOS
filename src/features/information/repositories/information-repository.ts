import { createClient } from '@/lib/supabase/server'
import { sortInformationItems } from '@/features/information/lib/sort-information-items'
import type { InformationItem } from '@/features/information/types/information-item'

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
