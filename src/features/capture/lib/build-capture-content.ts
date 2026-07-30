import { normalizeUploadFilename } from '@/features/files/lib/validate-file'

export function buildCaptureContent(text: string, filenames: string[]): string {
  const trimmedText = text.trim()

  if (trimmedText.length > 0) {
    return trimmedText
  }

  const safeFilenames = filenames
    .map((filename) => normalizeUploadFilename(filename))
    .filter((filename) => filename.length > 0)

  if (safeFilenames.length === 1) {
    return safeFilenames[0]
  }

  if (safeFilenames.length > 1) {
    return `Anhänge: ${safeFilenames.join(', ')}`
  }

  return ''
}
