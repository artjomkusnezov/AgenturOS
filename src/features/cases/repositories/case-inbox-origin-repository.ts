import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { enrichInboxAttachmentsWithMediaUrls } from '@/features/inbox/lib/enrich-inbox-attachments'
import type { InboxItem, InboxLinkedFile } from '@/features/inbox/types/inbox-item'
import type { CaseRecord } from '@/features/cases/types/case'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

export type CaseInboxOrigin = {
  case: CaseRecord
  inboxItem: InboxItem
  attachments: InboxLinkedFile[]
}

type CaseInboxOriginResult =
  | { success: true; origin: CaseInboxOrigin }
  | { success: true; origin: null }
  | RepositoryError

/**
 * Lädt den Originaleingang und dessen Anhänge für Nicht-Task-Cases (31A Foundation).
 * Sichtbarkeit über source_inbox_item_id — keine case_file_relations.
 * Dateizugriff über RLS (Eigentümer oder Case-Ursprung).
 */
export async function getCaseInboxOriginForCurrentAgency(
  caseId: string,
): Promise<CaseInboxOriginResult> {
  const agencyResult = await getCurrentUserAgency()

  if (!agencyResult.success) {
    return agencyResult
  }

  const supabase = await createClient()
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('*')
    .eq('id', caseId)
    .eq('agency_id', agencyResult.agency.id)
    .maybeSingle()

  if (caseError) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht geladen werden.',
    }
  }

  if (!caseRow || !caseRow.source_inbox_item_id) {
    return {
      success: true,
      origin: null,
    }
  }

  if (!isValidInboxItemId(caseRow.source_inbox_item_id)) {
    return {
      success: true,
      origin: null,
    }
  }

  const { data: inboxItem, error: inboxError } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('id', caseRow.source_inbox_item_id)
    .maybeSingle()

  if (inboxError) {
    return {
      success: false,
      error: 'Der Originaleingang konnte nicht geladen werden.',
    }
  }

  if (!inboxItem) {
    return {
      success: true,
      origin: null,
    }
  }

  const { data: fileRows, error: filesError } = await supabase
    .from('inbox_item_files')
    .select('id, created_at, files(*)')
    .eq('inbox_item_id', inboxItem.id)
    .order('created_at', { ascending: true })

  if (filesError) {
    return {
      success: false,
      error: 'Die Anhänge des Originaleingangs konnten nicht geladen werden.',
    }
  }

  const linkedFiles: InboxLinkedFile[] = []

  for (const row of fileRows ?? []) {
    const file = row.files
    linkedFiles.push({
      relationId: row.id,
      linkedAt: row.created_at,
      file: !file || Array.isArray(file) ? null : file,
    })
  }

  const attachments = await enrichInboxAttachmentsWithMediaUrls(linkedFiles)

  return {
    success: true,
    origin: {
      case: caseRow,
      inboxItem,
      attachments,
    },
  }
}
