import { createClient } from '@/lib/supabase/server'
import { INBOX_SOURCE_MANUAL_TEXT } from '@/features/inbox/lib/inbox-source'
import { partitionAndSortInboxItems } from '@/features/inbox/lib/sort-inbox-items'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type RepositoryError = {
  success: false
  error: string
}

type ListInboxItemsResult =
  | { success: true; unprocessedItems: InboxItem[]; processedItems: InboxItem[] }
  | RepositoryError

type InboxItemResult =
  | { success: true; item: InboxItem }
  | RepositoryError

type DeleteInboxItemResult =
  | { success: true }
  | RepositoryError

type InboxItemWriteInput = {
  content: string
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

export async function listInboxItemsForCurrentUser(): Promise<ListInboxItemsResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('user_id', authResult.userId)

  if (error) {
    return {
      success: false,
      error: 'Die Eingangselemente konnten nicht geladen werden.',
    }
  }

  const { unprocessedItems, processedItems } = partitionAndSortInboxItems(data)

  return {
    success: true,
    unprocessedItems,
    processedItems,
  }
}

export async function createInboxItemForCurrentUser(
  input: InboxItemWriteInput
): Promise<InboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .insert({
      user_id: authResult.userId,
      content: input.content,
      source: INBOX_SOURCE_MANUAL_TEXT,
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht erstellt werden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function updateInboxItemContentForCurrentUser(
  itemId: string,
  input: InboxItemWriteInput
): Promise<InboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
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
      error: 'Das Eingangselement konnte nicht gespeichert werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Das Eingangselement wurde nicht gefunden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function processInboxItemForCurrentUser(itemId: string): Promise<InboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', authResult.userId)
    .is('processed_at', null)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht als bearbeitet markiert werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Das Eingangselement wurde nicht gefunden oder ist bereits bearbeitet.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function reopenInboxItemForCurrentUser(itemId: string): Promise<InboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
      processed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', authResult.userId)
    .not('processed_at', 'is', null)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht wieder geöffnet werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Das Eingangselement wurde nicht gefunden oder ist bereits unbearbeitet.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function deleteInboxItemForCurrentUser(
  itemId: string
): Promise<DeleteInboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', authResult.userId)
    .select('id')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht gelöscht werden.',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Das Eingangselement wurde nicht gefunden.',
    }
  }

  return {
    success: true,
  }
}
