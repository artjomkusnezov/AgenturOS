import { MAX_FILE_UPLOAD_BYTES } from '@/features/files/lib/file-storage'
import type { FileFieldErrors } from '@/features/files/types/file'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const MAX_FILENAME_LENGTH = 255

export function isValidFileId(id: string): boolean {
  return UUID_PATTERN.test(id)
}

export function normalizeUploadFilename(filename: string): string {
  const trimmed = filename.trim()
  const basename = trimmed.split(/[/\\]/).pop() ?? trimmed
  return basename.trim()
}

export function validateUploadFile(file: File | null): FileFieldErrors {
  const errors: FileFieldErrors = {}

  if (!file || !(file instanceof File)) {
    errors.file = 'Bitte wählen Sie eine Datei aus.'
    return errors
  }

  const filename = normalizeUploadFilename(file.name)

  if (!filename) {
    errors.file = 'Der Dateiname darf nicht leer sein.'
    return errors
  }

  if (filename.length > MAX_FILENAME_LENGTH) {
    errors.file = `Der Dateiname darf höchstens ${MAX_FILENAME_LENGTH} Zeichen lang sein.`
    return errors
  }

  if (file.size <= 0) {
    errors.file = 'Die Datei ist leer.'
    return errors
  }

  if (file.size > MAX_FILE_UPLOAD_BYTES) {
    errors.file = 'Die Datei ist zu groß. Maximal 50 MB sind erlaubt.'
    return errors
  }

  return errors
}

export function resolveUploadMimeType(file: File): string {
  const mimeType = file.type.trim()
  return mimeType.length > 0 ? mimeType : 'application/octet-stream'
}

export function hasFileFieldErrors(errors: FileFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function parseUploadFormData(formData: FormData): File | null {
  const value = formData.get('file')

  if (!value || !(value instanceof File)) {
    return null
  }

  return value
}
