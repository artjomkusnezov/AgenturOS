const PREVIEWABLE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

export function isPdfMimeType(mimeType: string): boolean {
  return mimeType.trim().toLowerCase() === 'application/pdf'
}

export function isPreviewableImageMimeType(mimeType: string): boolean {
  return PREVIEWABLE_IMAGE_MIME_TYPES.has(mimeType.trim().toLowerCase())
}

export type TaskFilePreviewMode = 'pdf' | 'image' | 'unsupported'

export function getTaskFilePreviewMode(mimeType: string): TaskFilePreviewMode {
  if (isPdfMimeType(mimeType)) {
    return 'pdf'
  }

  if (isPreviewableImageMimeType(mimeType)) {
    return 'image'
  }

  return 'unsupported'
}
