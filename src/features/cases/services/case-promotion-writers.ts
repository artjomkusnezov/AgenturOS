/**
 * Writer-Fassade für Inbox→Ziel (Punkt 31A).
 * Task bleibt über tasks+Mirror; Non-Task-Cases und Information über RPCs.
 */

import type { SystemCaseTypeKey } from '@/features/cases/types/case'
import { isSystemCaseTypeKey } from '@/features/cases/types/case'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type CreateTaskCaseFromInboxResult =
  | {
      success: true
      inboxItemId: string
      taskId: string
      caseId: string | null
      relationId: string
      alreadyExisted: boolean
    }
  | RepositoryError

type CreateCaseFromInboxResult =
  | {
      success: true
      inboxItemId: string
      caseId: string
      caseTypeKey: SystemCaseTypeKey
      relationId: string
      alreadyExisted: boolean
    }
  | RepositoryError

type CreateInformationFromInboxResult =
  | {
      success: true
      inboxItemId: string
      informationItemId: string
      relationId: string
      alreadyExisted: boolean
    }
  | RepositoryError

export type CreateTaskCaseFromInboxInput = {
  inboxItemId: string
  title?: string | null
  description?: string | null
  assigneeUserId?: string | null
  priority?: string | null
  dueAt?: string | null
  businessAreaKey?: string | null
}

export type CreateCaseFromInboxInput = {
  inboxItemId: string
  caseTypeKey: SystemCaseTypeKey
  businessAreaKey?: string | null
  assigneeUserId?: string | null
  title?: string | null
  description?: string | null
  dueAt?: string | null
  priority?: string | null
}

export type CreateInformationFromInboxInput = {
  inboxItemId: string
  title?: string | null
  content?: string | null
  collectionKey?: string | null
}

function mapPromotionRpcError(message: string, fallback: string): string {
  if (message.includes('not authenticated')) {
    return 'Sie sind nicht angemeldet.'
  }
  if (message.includes('inbox item not found') || message.includes('access denied')) {
    return 'Das Eingangselement wurde nicht gefunden.'
  }
  if (message.includes('inbox content empty')) {
    return 'Das Eingangselement enthält keinen gültigen Inhalt.'
  }
  if (message.includes('inbox item already promoted')) {
    return 'Dieses Eingangselement wurde bereits übernommen.'
  }
  if (message.includes('due_at required for follow_up')) {
    return 'Für Wiedervorlagen ist ein Datum erforderlich.'
  }
  if (message.includes('assignee not active agency member')) {
    return 'Der gewählte Verantwortliche gehört nicht zur Agentur.'
  }
  if (message.includes('business area not found')) {
    return 'Der gewählte Fachbereich wurde nicht gefunden.'
  }
  if (message.includes('knowledge collection not found')) {
    return 'Der Wissensbereich wurde nicht gefunden.'
  }
  if (message.includes('invalid case type') || message.includes('case type required')) {
    return 'Der Vorgangstyp ist ungültig.'
  }
  if (message.includes('invalid priority')) {
    return 'Die Priorität ist ungültig.'
  }
  if (message.includes('title empty')) {
    return 'Bitte geben Sie einen Titel an.'
  }
  if (
    message.includes('no active agency membership')
    || message.includes('ambiguous active agency membership')
  ) {
    return 'Die Agenturmitgliedschaft konnte nicht ermittelt werden.'
  }

  return fallback
}

export async function createTaskCaseFromInboxItem(
  input: CreateTaskCaseFromInboxInput,
): Promise<CreateTaskCaseFromInboxResult> {
  if (!isValidInboxItemId(input.inboxItemId)) {
    return { success: false, error: 'Das Eingangselement ist ungültig.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_task_from_inbox_item', {
    p_inbox_item_id: input.inboxItemId,
    p_title: input.title ?? undefined,
    p_description: input.description ?? undefined,
    p_assignee_user_id: input.assigneeUserId ?? undefined,
    p_priority: input.priority ?? undefined,
    p_due_date: input.dueAt ?? undefined,
    p_business_area_key: input.businessAreaKey ?? undefined,
  })

  if (error || !data || data.length === 0) {
    return {
      success: false,
      error: mapPromotionRpcError(
        error?.message ?? '',
        'Das Eingangselement konnte nicht in eine Aufgabe übernommen werden.',
      ),
    }
  }

  const row = data[0]

  return {
    success: true,
    inboxItemId: row.inbox_item_id,
    taskId: row.task_id,
    caseId: row.case_id,
    relationId: row.relation_id,
    alreadyExisted: row.already_existed,
  }
}

export async function createCaseFromInboxItem(
  input: CreateCaseFromInboxInput,
): Promise<CreateCaseFromInboxResult> {
  if (!isValidInboxItemId(input.inboxItemId)) {
    return { success: false, error: 'Das Eingangselement ist ungültig.' }
  }

  if (input.caseTypeKey === 'task') {
    return {
      success: false,
      error: 'Aufgaben werden über den Task-Writer erzeugt.',
    }
  }

  if (input.caseTypeKey === 'follow_up' && !input.dueAt) {
    return {
      success: false,
      error: 'Für Wiedervorlagen ist ein Datum erforderlich.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_case_from_inbox_item', {
    p_inbox_item_id: input.inboxItemId,
    p_case_type_key: input.caseTypeKey,
    p_business_area_key: input.businessAreaKey ?? 'general',
    p_assignee_user_id: input.assigneeUserId ?? undefined,
    p_title: input.title ?? undefined,
    p_description: input.description ?? undefined,
    p_due_at: input.dueAt ?? undefined,
    p_priority: input.priority ?? 'normal',
  })

  if (error || !data || data.length === 0) {
    return {
      success: false,
      error: mapPromotionRpcError(
        error?.message ?? '',
        'Das Eingangselement konnte nicht als Vorgang übernommen werden.',
      ),
    }
  }

  const row = data[0]
  const caseTypeKey = isSystemCaseTypeKey(row.case_type_key)
    ? row.case_type_key
    : input.caseTypeKey

  return {
    success: true,
    inboxItemId: row.inbox_item_id,
    caseId: row.case_id,
    caseTypeKey,
    relationId: row.relation_id,
    alreadyExisted: row.already_existed,
  }
}

export async function createInformationFromInboxItem(
  input: CreateInformationFromInboxInput,
): Promise<CreateInformationFromInboxResult> {
  if (!isValidInboxItemId(input.inboxItemId)) {
    return { success: false, error: 'Das Eingangselement ist ungültig.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_information_from_inbox_item', {
    p_inbox_item_id: input.inboxItemId,
    p_title: input.title ?? undefined,
    p_content: input.content ?? undefined,
    p_collection_key: input.collectionKey ?? 'general',
  })

  if (error || !data || data.length === 0) {
    return {
      success: false,
      error: mapPromotionRpcError(
        error?.message ?? '',
        'Das Eingangselement konnte nicht als Information übernommen werden.',
      ),
    }
  }

  const row = data[0]

  return {
    success: true,
    inboxItemId: row.inbox_item_id,
    informationItemId: row.information_id,
    relationId: row.relation_id,
    alreadyExisted: row.already_existed,
  }
}
