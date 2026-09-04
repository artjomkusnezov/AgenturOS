export type WhatsAppMediaMetadata = {
  mediaId: string
  mimeType: string
  url: string
  fileSize?: number | null
  sha256?: string | null
}

export type WhatsAppMediaDownloadResult = {
  mediaId: string
  mimeType: string
  filename: string
  bytes: ArrayBuffer
  sizeBytes: number
}

export type WhatsAppMediaServiceDeps = {
  fetchMediaMetadata: (input: {
    mediaId: string
    accessToken: string
    graphApiVersion: string
  }) => Promise<WhatsAppMediaMetadata>
  downloadMediaBytes: (input: {
    url: string
    accessToken: string
  }) => Promise<ArrayBuffer>
}

async function defaultFetchMediaMetadata(input: {
  mediaId: string
  accessToken: string
  graphApiVersion: string
}): Promise<WhatsAppMediaMetadata> {
  const version = input.graphApiVersion.replace(/^\/+|\/+$/g, '')
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(input.mediaId)}`
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('WhatsApp-Medienmetadaten konnten nicht geladen werden.')
  }

  const data = (await response.json()) as {
    id?: string
    url?: string
    mime_type?: string
    file_size?: number
    sha256?: string
  }

  if (!data.url || !data.mime_type) {
    throw new Error('WhatsApp-Medienmetadaten unvollständig.')
  }

  return {
    mediaId: data.id ?? input.mediaId,
    mimeType: data.mime_type,
    url: data.url,
    fileSize: data.file_size ?? null,
    sha256: data.sha256 ?? null,
  }
}

async function defaultDownloadMediaBytes(input: {
  url: string
  accessToken: string
}): Promise<ArrayBuffer> {
  const response = await fetch(input.url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('WhatsApp-Mediendatei konnte nicht heruntergeladen werden.')
  }

  return response.arrayBuffer()
}

function extensionForMime(mimeType: string): string {
  const mime = mimeType.toLowerCase()
  if (mime.includes('ogg') || mime.includes('opus')) return 'ogg'
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3'
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
  if (mime.includes('png')) return 'png'
  if (mime.includes('webp')) return 'webp'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('word')) return 'docx'
  return 'bin'
}

export function buildWhatsAppMediaFilename(input: {
  type: 'audio' | 'image' | 'document'
  mimeType: string
  filename?: string | null
  mediaId: string
  voice?: boolean
}): string {
  const provided = input.filename?.trim()
  if (provided) {
    return provided
  }

  const ext = extensionForMime(input.mimeType)
  if (input.type === 'audio') {
    return input.voice ? `sprachnachricht-${input.mediaId}.${ext}` : `audio-${input.mediaId}.${ext}`
  }
  if (input.type === 'image') {
    return `bild-${input.mediaId}.${ext}`
  }
  return `dokument-${input.mediaId}.${ext}`
}

/**
 * Meta media_id → Metadaten → Bytes.
 * Temporäre Meta-URL wird nicht persistiert — nur die heruntergeladene Datei.
 */
export async function downloadWhatsAppMedia(input: {
  mediaId: string
  accessToken: string
  graphApiVersion: string
  type: 'audio' | 'image' | 'document'
  mimeTypeHint?: string | null
  filenameHint?: string | null
  voice?: boolean
  deps?: Partial<WhatsAppMediaServiceDeps>
}): Promise<WhatsAppMediaDownloadResult> {
  const fetchMediaMetadata =
    input.deps?.fetchMediaMetadata ?? defaultFetchMediaMetadata
  const downloadMediaBytes =
    input.deps?.downloadMediaBytes ?? defaultDownloadMediaBytes

  const metadata = await fetchMediaMetadata({
    mediaId: input.mediaId,
    accessToken: input.accessToken,
    graphApiVersion: input.graphApiVersion,
  })

  const bytes = await downloadMediaBytes({
    url: metadata.url,
    accessToken: input.accessToken,
  })

  const mimeType =
    metadata.mimeType.trim() ||
    input.mimeTypeHint?.trim() ||
    'application/octet-stream'

  const filename = buildWhatsAppMediaFilename({
    type: input.type,
    mimeType,
    filename: input.filenameHint,
    mediaId: input.mediaId,
    voice: input.voice,
  })

  return {
    mediaId: metadata.mediaId,
    mimeType,
    filename,
    bytes,
    sizeBytes:
      typeof metadata.fileSize === 'number' && metadata.fileSize > 0
        ? metadata.fileSize
        : bytes.byteLength,
  }
}
