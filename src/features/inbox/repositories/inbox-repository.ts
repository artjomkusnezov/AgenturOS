import { createClient } from '@/lib/supabase/server'
import { INBOX_RELATION_TYPE_TASK } from '@/features/inbox/lib/inbox-relation'
import { INBOX_SOURCE_MANUAL_TEXT, INBOX_SOURCE_UNIVERSAL_CAPTURE } from '@/features/inbox/lib/inbox-source'
import { partitionAndSortInboxItems } from '@/features/inbox/lib/sort-inbox-items'
import type { InboxItem } from '@/features/inbox/types/inbox-item'

type RepositoryError = {
  success: false
  error: string
}

type ListInboxItemsResult =
  | {
      success: true
      unprocessedItems: InboxItem[]
      processedItems: InboxItem[]
      taskRelationsByItemId: Record<string, string>
    }
  | RepositoryError

type InboxItemResult =
  | { success: true; item: InboxItem }
  | RepositoryError

type DeleteInboxItemResult =
  | { success: true }
  | RepositoryError

type CreateTaskFromInboxItemResult =
  | { success: true; inboxItemId: string; taskId: string; relationId: string }
  | RepositoryError

type CreateTaskFromInboxRpcRow = {
  inbox_item_id: string
  task_id: string
  relation_id: string
  already_existed: boolean
}

function mapCreateTaskFromInboxRpcError(message: string): string {
  if (message.includes('not authenticated')) {
    return 'Sie sind nicht angemeldet.'
  }

  if (message.includes('inbox item not found')) {
    return 'Das Eingangselement wurde nicht gefunden.'
  }

  if (message.includes('access denied')) {
    return 'Das Eingangselement wurde nicht gefunden.'
  }

  if (message.includes('inbox content empty')) {
    return 'Das Eingangselement enthält keinen gültigen Inhalt.'
  }

  return 'Das Eingangselement konnte nicht in eine Aufgabe übernommen werden.'
}

type InboxItemWriteInput = {
  content: string
  source?: typeof INBOX_SOURCE_MANUAL_TEXT | typeof INBOX_SOURCE_UNIVERSAL_CAPTURE
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

  const { data: relations, error: relationsError } = await supabase
    .from('inbox_relations')
    .select('inbox_item_id, relation_id')
    .eq('relation_type', INBOX_RELATION_TYPE_TASK)

  if (relationsError) {
    return {
      success: false,
      error: 'Die Eingangsverknüpfungen konnten nicht geladen werden.',
    }
  }

  const taskRelationsByItemId = Object.fromEntries(
    (relations ?? []).map((relation) => [relation.inbox_item_id, relation.relation_id])
  )

  return {
    success: true,
    unprocessedItems,
    processedItems,
    taskRelationsByItemId,
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
      source: input.source ?? INBOX_SOURCE_MANUAL_TEXT,
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

export async function createTaskFromInboxItem(
  itemId: string
): Promise<CreateTaskFromInboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_task_from_inbox_item', {
    p_inbox_item_id: itemId,
  })

  if (error) {
    return {
      success: false,
      error: mapCreateTaskFromInboxRpcError(error.message),
    }
  }

  const row = (Array.isArray(data) ? data[0] : data) as CreateTaskFromInboxRpcRow | null

  if (!row) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht in eine Aufgabe übernommen werden.',
    }
  }

  return {
    success: true,
    inboxItemId: row.inbox_item_id,
    taskId: row.task_id,
    relationId: row.relation_id,
  }
}
