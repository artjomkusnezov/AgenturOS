import { classifyMediaKind } from '@/features/files/lib/classify-media-kind'
import { MAX_FILE_UPLOAD_BYTES } from '@/features/files/lib/file-storage'
import type { FileRecord } from '@/features/files/types/file'
import type { InboxLinkedFile } from '@/features/inbox/types/inbox-item'

/** Gleiche Obergrenze wie Upload — bereits gespeicherte Dateien. */
export const TRANSCRIPTION_MAX_AUDIO_BYTES = MAX_FILE_UPLOAD_BYTES

const TRANSCRIPTION_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/x-m4a',
  'audio/mp4a-latm',
])

export function normalizeAudioMimeType(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(';')[0]?.trim() ?? ''
}

export function isTranscriptionSupportedMimeType(mimeType: string, filename?: string): boolean {
  const normalized = normalizeAudioMimeType(mimeType)

  if (TRANSCRIPTION_AUDIO_MIME_TYPES.has(normalized)) {
    return true
  }

  // Fallback für ungenaue Client-MIME, wenn Dateiname klar Audio ist.
  if (normalized === 'application/octet-stream' || normalized === '') {
    return classifyMediaKind(mimeType, filename ?? '') === 'audio'
  }

  return false
}

export function findPrimaryAudioAttachment(
  attachments: InboxLinkedFile[],
): FileRecord | null {
  for (const attachment of attachments) {
    const file = attachment.file
    if (!file) {
      continue
    }

    if (isTranscriptionSupportedMimeType(file.mime_type, file.filename)) {
      return file
    }

    // audio/* allgemein (falls neue Untertypen)
    if (normalizeAudioMimeType(file.mime_type).startsWith('audio/')) {
      return file
    }
  }

  return null
}

export function hasVoiceAudioAttachment(attachments: InboxLinkedFile[]): boolean {
  return findPrimaryAudioAttachment(attachments) !== null
}

export function getTranscriptionAudioValidationError(
  file: FileRecord,
): string | null {
  if (!isTranscriptionSupportedMimeType(file.mime_type, file.filename)) {
    return 'Dieser Audiodateityp wird für die Spracherkennung nicht unterstützt.'
  }

  if (file.size_bytes <= 0) {
    return 'Die Audiodatei ist leer.'
  }

  if (file.size_bytes > TRANSCRIPTION_MAX_AUDIO_BYTES) {
    return 'Die Audiodatei ist für die Spracherkennung zu groß.'
  }

  return null
}
