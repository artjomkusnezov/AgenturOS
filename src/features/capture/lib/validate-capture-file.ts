import {
  getUploadFileValidationMessage,
  normalizeUploadFilename,
  resolveUploadMimeType,
} from '@/features/files/lib/validate-file'

const ALLOWED_CAPTURE_EXTENSIONS = new Set([
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'heic',
  'heif',
  // Voice recording (33B.1) — concrete container types only
  'webm',
  'm4a',
  'mp4',
  'mp3',
  'ogg',
  'wav',
  'aac',
])

const ALLOWED_CAPTURE_AUDIO_MIME_TYPES = new Set([
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

const CAPTURE_MIME_ERROR =
  'Dateityp nicht erlaubt. Nur PDF, Bilder und Audioaufnahmen sind zulässig.'

export function isAllowedCaptureMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase()
  const baseType = normalized.split(';')[0]?.trim() ?? normalized

  if (baseType === 'application/pdf') {
    return true
  }

  if (baseType.startsWith('image/')) {
    return true
  }

  return ALLOWED_CAPTURE_AUDIO_MIME_TYPES.has(baseType)
}

function getCaptureFileExtension(filename: string): string | null {
  const parts = normalizeUploadFilename(filename).split('.')

  if (parts.length < 2) {
    return null
  }

  return parts.at(-1)?.toLowerCase() ?? null
}

export function getCaptureMimeValidationMessage(file: File): string | null {
  const mimeType = resolveUploadMimeType(file)

  if (mimeType === 'application/octet-stream') {
    const extension = getCaptureFileExtension(file.name)

    if (extension && ALLOWED_CAPTURE_EXTENSIONS.has(extension)) {
      return null
    }

    return CAPTURE_MIME_ERROR
  }

  if (!isAllowedCaptureMimeType(mimeType)) {
    return CAPTURE_MIME_ERROR
  }

  return null
}

export function getCaptureFileValidationMessage(file: File): string | null {
  const baseValidationMessage = getUploadFileValidationMessage(file)

  if (baseValidationMessage) {
    return baseValidationMessage
  }

  return getCaptureMimeValidationMessage(file)
}
