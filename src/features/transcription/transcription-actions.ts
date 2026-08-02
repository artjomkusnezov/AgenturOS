'use server'

import { revalidatePath } from 'next/cache'

import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import {
  startTranscriptionAfterVoiceCapture,
  transcribeInboxItemAudio,
} from '@/features/transcription/transcription-service'
import type { TranscriptionMutationState } from '@/features/transcription/transcription-types'

/**
 * Startet oder wiederholt die Transkription für einen bestehenden Voice-Eingang.
 * Kein neuer Upload; completed wird nicht erneut gestartet.
 */
export async function transcribeInboxItemAction(
  _prevState: TranscriptionMutationState,
  formData: FormData,
): Promise<TranscriptionMutationState> {
  const itemId = String(formData.get('itemId') ?? '')

  if (!isValidInboxItemId(itemId)) {
    return {
      error: 'Bitte geben Sie ein gültiges Eingangselement an.',
    }
  }

  const result = await transcribeInboxItemAudio(itemId)

  revalidatePath('/app/inbox')

  if (!result.success) {
    return {
      error: result.error,
      status: result.status,
    }
  }

  return {
    success: true,
    status: result.status,
  }
}

/**
 * Nach Voice-Capture aufrufen: pending → processing → completed|failed.
 * Speichern des Eingangs darf bereits erfolgreich sein; Fehler hier löschen nichts.
 */
export async function startTranscriptionAfterVoiceCaptureAction(
  inboxItemId: string,
): Promise<TranscriptionMutationState> {
  if (!isValidInboxItemId(inboxItemId)) {
    return {
      error: 'Bitte geben Sie ein gültiges Eingangselement an.',
    }
  }

  const result = await startTranscriptionAfterVoiceCapture(inboxItemId)

  revalidatePath('/app/inbox')

  if (!result.success) {
    return {
      error: result.error,
      status: result.status,
    }
  }

  return {
    success: true,
    status: result.status,
  }
}
