import { downloadFileBytesForCurrentUser } from '@/features/files/repositories/files-repository'
import { listFilesForInboxItem } from '@/features/inbox/repositories/inbox-repository'
import {
  findPrimaryAudioAttachment,
  getTranscriptionAudioValidationError,
} from '@/features/transcription/lib/transcription-audio'
import { createDeepgramTranscriptionProvider } from '@/features/transcription/providers/deepgram-transcription-provider'
import type { TranscriptionProvider } from '@/features/transcription/transcription-provider'
import {
  claimInboxTranscriptionProcessing,
  getInboxItemForTranscription,
  markInboxTranscriptionFailed,
  markInboxTranscriptionCompleted,
  markInboxTranscriptionPending,
} from '@/features/transcription/transcription-repository'
import {
  TranscriptionProviderError,
  type TranscriptionJobResult,
} from '@/features/transcription/transcription-types'

function resolveProvider(): TranscriptionProvider {
  return createDeepgramTranscriptionProvider()
}

function toUserFacingError(error: unknown): string {
  if (error instanceof TranscriptionProviderError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Die Spracherkennung ist fehlgeschlagen.'
}

async function failJob(
  inboxItemId: string,
  message: string,
  meta?: { provider?: string | null; model?: string | null },
): Promise<TranscriptionJobResult> {
  const failed = await markInboxTranscriptionFailed(inboxItemId, message, meta)

  return {
    success: false,
    error: message,
    status: failed.success ? 'failed' : 'failed',
  }
}

/**
 * Transkribiert das gespeicherte Audio eines bestehenden Voice-Eingangs.
 * Kein neuer Upload; content wird nicht überschrieben.
 */
export async function transcribeInboxItemAudio(
  inboxItemId: string,
): Promise<TranscriptionJobResult> {
  const itemResult = await getInboxItemForTranscription(inboxItemId)

  if (!itemResult.success) {
    return {
      success: false,
      error: itemResult.error,
      status: 'none',
    }
  }

  const claim = await claimInboxTranscriptionProcessing(inboxItemId)

  if (!claim.success) {
    if (claim.reason === 'already_processing') {
      return {
        success: false,
        error: claim.error,
        status: 'processing',
      }
    }

    if (claim.reason === 'completed') {
      return {
        success: true,
        status: 'completed',
        transcriptText: itemResult.item.transcript_text,
      }
    }

    return {
      success: false,
      error: claim.error,
      status: itemResult.item.transcription_status as TranscriptionJobResult['status'],
    }
  }

  const provider = resolveProvider()

  try {
    // Früher Config-Check, bevor Storage geladen wird — Status landet in failed, Audio bleibt.
    if (!process.env.DEEPGRAM_API_KEY?.trim()) {
      return failJob(
        inboxItemId,
        'Spracherkennung ist nicht konfiguriert (DEEPGRAM_API_KEY fehlt).',
        { provider: provider.id, model: provider.model },
      )
    }

    const filesResult = await listFilesForInboxItem(inboxItemId)

    if (!filesResult.success) {
      return failJob(inboxItemId, filesResult.error, {
        provider: provider.id,
        model: provider.model,
      })
    }

    const audioFile = findPrimaryAudioAttachment(filesResult.files)

    if (!audioFile) {
      return failJob(
        inboxItemId,
        filesResult.files.length > 0
          ? 'Kein Audio-Anhang für die Spracherkennung gefunden.'
          : 'Dieser Eingang hat keinen Audio-Anhang.',
        { provider: provider.id, model: provider.model },
      )
    }

    const validationError = getTranscriptionAudioValidationError(audioFile)

    if (validationError) {
      return failJob(inboxItemId, validationError, {
        provider: provider.id,
        model: provider.model,
      })
    }

    const download = await downloadFileBytesForCurrentUser(audioFile.id)

    if (!download.success) {
      return failJob(inboxItemId, download.error, {
        provider: provider.id,
        model: provider.model,
      })
    }

    if (download.bytes.byteLength === 0) {
      return failJob(inboxItemId, 'Die Audiodatei ist leer.', {
        provider: provider.id,
        model: provider.model,
      })
    }

    const result = await provider.transcribe({
      bytes: download.bytes,
      mimeType: download.mimeType,
      filename: download.filename,
      candidateLanguages: ['de', 'ru'],
    })

    const saved = await markInboxTranscriptionCompleted(inboxItemId, {
      transcriptText: result.text,
      detectedLanguage: result.detectedLanguage,
      provider: result.provider,
      model: result.model,
    })

    if (!saved.success) {
      return failJob(inboxItemId, saved.error, {
        provider: result.provider,
        model: result.model,
      })
    }

    return {
      success: true,
      status: 'completed',
      transcriptText: result.text,
    }
  } catch (error) {
    return failJob(inboxItemId, toUserFacingError(error), {
      provider: provider.id,
      model: provider.model,
    })
  }
}

/**
 * Nach erfolgreichem Voice-Capture: Status pending setzen, dann Transkription anstoßen.
 * Fehler belassen den gespeicherten Eingang und das Audio.
 */
export async function startTranscriptionAfterVoiceCapture(
  inboxItemId: string,
): Promise<TranscriptionJobResult> {
  const pending = await markInboxTranscriptionPending(inboxItemId)

  if (!pending.success) {
    return {
      success: false,
      error: pending.error,
      status: 'none',
    }
  }

  return transcribeInboxItemAudio(inboxItemId)
}
