export type MediaKind =
  | 'image'
  | 'pdf'
  | 'audio'
  | 'video'
  | 'document'
  | 'archive'
  | 'other'

const EXTENSION_KIND: Record<string, MediaKind> = {
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  webp: 'image',
  avif: 'image',
  svg: 'image',
  heic: 'image',
  heif: 'image',
  pdf: 'pdf',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  aac: 'audio',
  ogg: 'audio',
  flac: 'audio',
  mp4: 'video',
  mov: 'video',
  webm: 'video',
  mkv: 'video',
  avi: 'video',
  doc: 'document',
  docx: 'document',
  odt: 'document',
  rtf: 'document',
  txt: 'document',
  md: 'document',
  csv: 'document',
  xls: 'document',
  xlsx: 'document',
  ppt: 'document',
  pptx: 'document',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',
}

function extensionFromFilename(filename: string | null | undefined): string | null {
  if (!filename) {
    return null
  }

  const basename = filename.trim().split(/[/\\]/).pop() ?? ''
  const dotIndex = basename.lastIndexOf('.')

  if (dotIndex <= 0 || dotIndex === basename.length - 1) {
    return null
  }

  return basename.slice(dotIndex + 1).toLowerCase()
}

function kindFromMimeType(mimeType: string): MediaKind | null {
  const mime = mimeType.trim().toLowerCase()

  if (!mime) {
    return null
  }

  if (mime === 'application/pdf') {
    return 'pdf'
  }

  if (mime.startsWith('image/')) {
    return 'image'
  }

  if (mime.startsWith('audio/')) {
    return 'audio'
  }

  if (mime.startsWith('video/')) {
    return 'video'
  }

  if (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    mime === 'application/x-7z-compressed' ||
    mime === 'application/x-rar-compressed' ||
    mime === 'application/gzip' ||
    mime === 'application/x-tar'
  ) {
    return 'archive'
  }

  if (
    mime.startsWith('text/') ||
    mime === 'application/msword' ||
    mime === 'application/rtf' ||
    mime === 'application/vnd.oasis.opendocument.text' ||
    mime.includes('officedocument') ||
    mime.includes('ms-excel') ||
    mime.includes('ms-powerpoint')
  ) {
    return 'document'
  }

  return null
}

/**
 * Klassifiziert eine Datei für Icons und spätere Darstellungsformen.
 * Primär MIME-Type, Fallback Dateiendung. Keine Vorschau-Logik.
 */
export function classifyMediaKind(
  mimeType: string | null | undefined,
  filename?: string | null,
): MediaKind {
  const fromMime = kindFromMimeType(mimeType ?? '')

  if (fromMime) {
    return fromMime
  }

  const extension = extensionFromFilename(filename)
  if (extension && EXTENSION_KIND[extension]) {
    return EXTENSION_KIND[extension]
  }

  return 'other'
}

const INLINE_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

const INLINE_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif'])

function isInlineImage(mimeType: string | null | undefined, filename?: string | null): boolean {
  const mime = (mimeType ?? '').trim().toLowerCase()

  if (mime === 'image/jpg' || INLINE_IMAGE_MIME_TYPES.has(mime)) {
    return true
  }

  if (!mime || mime === 'application/octet-stream') {
    const extension = extensionFromFilename(filename)
    return extension !== null && INLINE_IMAGE_EXTENSIONS.has(extension)
  }

  return false
}

/**
 * Ob eine Datei im Informationsdokument inline dargestellt werden soll.
 * Nutzt classifyMediaKind; Bilder nur JPEG/PNG/WebP/GIF.
 */
export function isInlineDocumentMedia(
  mimeType: string | null | undefined,
  filename?: string | null,
): boolean {
  const kind = classifyMediaKind(mimeType, filename)

  if (kind === 'pdf' || kind === 'audio' || kind === 'video') {
    return true
  }

  if (kind === 'image') {
    return isInlineImage(mimeType, filename)
  }

  return false
}
