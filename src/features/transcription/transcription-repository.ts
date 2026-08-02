import { createClient } from '@/lib/supabase/server'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import type { InboxItem } from '@/features/inbox/types/inbox-item'
import {
  TRANSCRIPTION_STATUSES,
  type TranscriptionStatus,
} from '@/features/transcription/transcription-types'

type RepositoryError = {
  success: false
  error: string
}

type InboxItemResult =
  | { success: true; item: InboxItem }
  | RepositoryError

type ClaimResult =
  | { success: true; item: InboxItem }
  | { success: false; error: string; reason: 'already_processing' | 'completed' | 'not_found' | 'auth' | 'update' }

const CLAIMABLE_STATUSES: TranscriptionStatus[] = ['none', 'pending', 'failed']

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

function isTranscriptionStatus(value: string): value is TranscriptionStatus {
  return (TRANSCRIPTION_STATUSES as readonly string[]).includes(value)
}

export async function getInboxItemForTranscription(
  inboxItemId: string,
): Promise<InboxItemResult> {
  if (!isValidInboxItemId(inboxItemId)) {
    return {
      success: false,
      error: 'Bitte geben Sie ein gültiges Eingangselement an.',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .select('*')
    .eq('id', inboxItemId)
    .eq('user_id', authResult.userId)
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Das Eingangselement konnte nicht geladen werden.',
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

export async function markInboxTranscriptionPending(
  inboxItemId: string,
): Promise<InboxItemResult> {
  if (!isValidInboxItemId(inboxItemId)) {
    return {
      success: false,
      error: 'Bitte geben Sie ein gültiges Eingangselement an.',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
      transcription_status: 'pending',
      transcription_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inboxItemId)
    .eq('user_id', authResult.userId)
    .in('transcription_status', ['none', 'failed', 'pending'])
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Transkriptionsstatus konnte nicht gesetzt werden.',
    }
  }

  if (!data) {
    // Bereits processing/completed oder nicht gefunden — Item erneut laden für klare Meldung.
    const current = await getInboxItemForTranscription(inboxItemId)
    if (!current.success) {
      return current
    }

    return {
      success: true,
      item: current.item,
    }
  }

  return {
    success: true,
    item: data,
  }
}

/**
 * Atomarer Claim: nur none/pending/failed → processing.
 * Verhindert parallele doppelte Provider-Aufrufe.
 */
export async function claimInboxTranscriptionProcessing(
  inboxItemId: string,
): Promise<ClaimResult> {
  if (!isValidInboxItemId(inboxItemId)) {
    return {
      success: false,
      error: 'Bitte geben Sie ein gültiges Eingangselement an.',
      reason: 'not_found',
    }
  }

  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error,
      reason: 'auth',
    }
  }

  const current = await getInboxItemForTranscription(inboxItemId)

  if (!current.success) {
    return {
      success: false,
      error: current.error,
      reason: 'not_found',
    }
  }

  const status = isTranscriptionStatus(current.item.transcription_status)
    ? current.item.transcription_status
    : 'none'

  if (status === 'processing') {
    return {
      success: false,
      error: 'Die Transkription läuft bereits.',
      reason: 'already_processing',
    }
  }

  if (status === 'completed') {
    return {
      success: false,
      error: 'Die Transkription ist bereits abgeschlossen.',
      reason: 'completed',
    }
  }

  if (!CLAIMABLE_STATUSES.includes(status)) {
    return {
      success: false,
      error: 'Die Transkription kann in diesem Status nicht gestartet werden.',
      reason: 'update',
    }
  }

  const startedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
      transcription_status: 'processing',
      transcription_error: null,
      transcription_started_at: startedAt,
      transcription_completed_at: null,
      updated_at: startedAt,
    })
    .eq('id', inboxItemId)
    .eq('user_id', authResult.userId)
    .in('transcription_status', CLAIMABLE_STATUSES)
    .select('*')
    .maybeSingle()

  if (error) {
    return {
      success: false,
      error: 'Der Transkriptionsstatus konnte nicht gesetzt werden.',
      reason: 'update',
    }
  }

  if (!data) {
    return {
      success: false,
      error: 'Die Transkription läuft bereits oder ist abgeschlossen.',
      reason: 'already_processing',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function markInboxTranscriptionCompleted(
  inboxItemId: string,
  input: {
    transcriptText: string
    detectedLanguage: string | null
    provider: string
    model: string
  },
): Promise<InboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const completedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
      transcription_status: 'completed',
      transcript_text: input.transcriptText,
      transcription_error: null,
      detected_language: input.detectedLanguage,
      transcription_provider: input.provider,
      transcription_model: input.model,
      transcription_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', inboxItemId)
    .eq('user_id', authResult.userId)
    .eq('transcription_status', 'processing')
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return {
      success: false,
      error: 'Das Transkript konnte nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}

export async function markInboxTranscriptionFailed(
  inboxItemId: string,
  errorMessage: string,
  meta?: {
    provider?: string | null
    model?: string | null
  },
): Promise<InboxItemResult> {
  const authResult = await getAuthenticatedUserId()

  if (!authResult.success) {
    return authResult
  }

  const completedAt = new Date().toISOString()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_items')
    .update({
      transcription_status: 'failed',
      transcription_error: errorMessage,
      transcription_provider: meta?.provider ?? null,
      transcription_model: meta?.model ?? null,
      transcription_completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', inboxItemId)
    .eq('user_id', authResult.userId)
    .in('transcription_status', ['processing', 'pending', 'none', 'failed'])
    .select('*')
    .maybeSingle()

  if (error || !data) {
    return {
      success: false,
      error: 'Der Fehlerstatus konnte nicht gespeichert werden.',
    }
  }

  return {
    success: true,
    item: data,
  }
}
