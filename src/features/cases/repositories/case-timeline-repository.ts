import {
  hasCaseTimelineNoteFieldErrors,
  isValidCaseId,
  normalizeCaseTimelineNoteContent,
  validateCaseTimelineNoteInput,
} from '@/features/cases/lib/validate-case-timeline-note'
import {
  hasCaseTimelineAttachmentFieldErrors,
  validateAttachCaseFileInput,
} from '@/features/cases/lib/validate-case-timeline-attachment'
import type {
  AttachCaseFileInput,
  CaseTimelineEntry,
  CaseTimelineEntryView,
  CreateCaseTimelineNoteInput,
} from '@/features/cases/types/case-timeline'
import { enrichAttachmentsWithMediaUrls } from '@/features/files/lib/enrich-attachments-with-media-urls'
import {
  createSignedDownloadUrlForCurrentUser,
  deleteFileForCurrentUser,
  uploadFileForCurrentUser,
} from '@/features/files/repositories/files-repository'
import type { FileRecord } from '@/features/files/types/file'
import { createClient } from '@/lib/supabase/server'

type RepositoryError = {
  success: false
  error: string
}

type ListTimelineResult =
  | { success: true; entries: CaseTimelineEntryView[] }
  | RepositoryError

type TimelineEntryResult =
  | { success: true; entry: CaseTimelineEntry }
  | RepositoryError

type TimelineRowWithFile = CaseTimelineEntry & {
  files: FileRecord | FileRecord[] | null
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

function resolveJoinedFile(
  files: FileRecord | FileRecord[] | null | undefined,
): FileRecord | null {
  if (!files) {
    return null
  }

  return Array.isArray(files) ? (files[0] ?? null) : files
}

export async function listTimelineForCase(
  caseId: string,
): Promise<ListTimelineResult> {
  if (!isValidCaseId(caseId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Vorgangs-ID an.',
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('case_timeline_entries')
    .select('*, files(*)')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  if (error) {
    return {
      success: false,
      error: 'Der Vorgangsverlauf konnte nicht geladen werden.',
    }
  }

  const rows = (data ?? []) as TimelineRowWithFile[]
  const baseEntries = rows.map((row) => {
    const { files, ...entry } = row
    return {
      ...entry,
      file: resolveJoinedFile(files),
    }
  })

  const enriched = await enrichAttachmentsWithMediaUrls(
    baseEntries,
    (fileId) => createSignedDownloadUrlForCurrentUser(fileId),
  )

  return {
    success: true,
    entries: enriched.map((entry) => ({
      ...entry,
      mediaUrl: entry.mediaUrl ?? null,
    })),
  }
}

export async function createCaseTimelineNote(
  input: CreateCaseTimelineNoteInput,
): Promise<TimelineEntryResult> {
  const validationErrors = validateCaseTimelineNoteInput(input)

  if (hasCaseTimelineNoteFieldErrors(validationErrors)) {
    return {
      success: false,
      error:
        validationErrors.content ??
        validationErrors.caseId ??
        'Die Verlaufsnotiz ist ungültig.',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, agency_id')
    .eq('id', input.caseId)
    .maybeSingle()

  if (caseError) {
    return {
      success: false,
      error: 'Der Vorgang konnte nicht geladen werden.',
    }
  }

  if (!caseRow) {
    return {
      success: false,
      error: 'Der Vorgang wurde nicht gefunden.',
    }
  }

  const { data, error } = await supabase
    .from('case_timeline_entries')
    .insert({
      case_id: input.caseId,
      agency_id: caseRow.agency_id,
      created_by: authResult.userId,
      event_type: 'note',
      content: normalizeCaseTimelineNoteContent(input.content),
    })
    .select('*')
    .single()

  if (error || !data) {
    return {
      success: false,
      error: 'Die Verlaufsnotiz konnte nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    entry: data,
  }
}

export async function attachFileToCase(
  input: AttachCaseFileInput,
): Promise<TimelineEntryResult> {
  const validationErrors = validateAttachCaseFileInput(input)

  if (hasCaseTimelineAttachmentFieldErrors(validationErrors)) {
    return {
      success: false,
      error:
        validationErrors.fileId ??
        validationErrors.caseId ??
        'Die Datei konnte nicht verknüpft werden.',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('attach_file_to_case', {
    p_case_id: input.caseId,
    p_file_id: input.fileId,
  })

  if (error || !data) {
    return {
      success: false,
      error: 'Die Datei konnte nicht zum Vorgang hinzugefügt werden.',
    }
  }

  return {
    success: true,
    entry: data as CaseTimelineEntry,
  }
}

export async function uploadAndAttachFileToCase(
  caseId: string,
  file: File,
): Promise<TimelineEntryResult> {
  if (!isValidCaseId(caseId)) {
    return {
      success: false,
      error: 'Bitte geben Sie eine gültige Vorgangs-ID an.',
    }
  }

  const uploadResult = await uploadFileForCurrentUser(file)

  if (!uploadResult.success) {
    return uploadResult
  }

  const attachResult = await attachFileToCase({
    caseId,
    fileId: uploadResult.file.id,
  })

  if (!attachResult.success) {
    await deleteFileForCurrentUser(uploadResult.file.id)
    return attachResult
  }

  return attachResult
}
