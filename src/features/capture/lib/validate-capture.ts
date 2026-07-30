import { getUploadFileValidationMessage } from '@/features/files/lib/validate-file'
import { buildCaptureContent } from '@/features/capture/lib/build-capture-content'
import type { CaptureFieldErrors } from '@/features/capture/types/capture'

export function validateCaptureInput(content: string, files: File[]): CaptureFieldErrors {
  const errors: CaptureFieldErrors = {}
  const trimmedContent = content.trim()
  const fileErrors: string[] = []
  const validFiles: File[] = []

  for (const file of files) {
    const validationMessage = getUploadFileValidationMessage(file)

    if (validationMessage) {
      fileErrors.push(`${file.name}: ${validationMessage}`)
      continue
    }

    validFiles.push(file)
  }

  const resolvedContent = buildCaptureContent(
    trimmedContent,
    validFiles.map((file) => file.name)
  )

  if (!resolvedContent) {
    errors.content = 'Bitte Text eingeben oder mindestens eine gültige Datei hinzufügen.'
  }

  if (fileErrors.length > 0) {
    errors.files = fileErrors.join(' · ')
  }

  return errors
}

export function hasCaptureFieldErrors(errors: CaptureFieldErrors): boolean {
  return Boolean(errors.content)
}

export function getValidCaptureFiles(files: File[]): File[] {
  return files.filter((file) => getUploadFileValidationMessage(file) === null)
}
