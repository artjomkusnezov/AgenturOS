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
])

const CAPTURE_MIME_ERROR = 'Dateityp nicht erlaubt. Nur PDF und Bilder sind zulässig.'

export function isAllowedCaptureMimeType(mimeType: string): boolean {
  const normalized = mimeType.trim().toLowerCase()

  if (normalized === 'application/pdf') {
    return true
  }

  return normalized.startsWith('image/')
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
