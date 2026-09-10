import {
  KFZ_PUBLIC_LIMITS,
  KFZ_UPLOAD_GROUPS,
  type KfzUploadGroup,
  type PublicKfzUploadMeta,
} from '@/features/inbound/kfz/types/public-kfz-inquiry'

export const KFZ_LANDING_DOCUMENT_GROUPS = [
  {
    id: 'fahrzeugschein',
    label: 'Fahrzeugschein',
    hint: 'Foto oder PDF — optional, hilft bei der persönlichen Prüfung.',
  },
  {
    id: 'vorversicherung',
    label: 'Vorversicherung / letzte Beitragsrechnung',
    hint: 'Falls vorhanden. Keine Pflicht, keine Online-Bewertung.',
  },
] as const

export const KFZ_LANDING_ALLOWED_DOCUMENT_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
] as const

export const KFZ_LANDING_ALLOWED_DOCUMENT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.heic',
  '.heif',
  '.pdf',
] as const

export const KFZ_LANDING_MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
export const KFZ_LANDING_MAX_DOCUMENTS_PER_GROUP = 3
export const KFZ_LANDING_MAX_DOCUMENTS_TOTAL = KFZ_PUBLIC_LIMITS.maxUploads

export const KFZ_LANDING_DOCUMENT_ACCEPT = 'image/*,application/pdf' as const
export const KFZ_LANDING_CAMERA_ACCEPT = 'image/*' as const

export const KFZ_LANDING_STORAGE_NOTICE =
  'Unterlagen speichern wir privat nur für die persönliche Prüfung. Es gibt keinen öffentlichen Link.' as const

/** @deprecated Use KFZ_LANDING_STORAGE_NOTICE. Kept so older local copy still compiles. */
export const KFZ_LANDING_STORAGE_BLOCKER = KFZ_LANDING_STORAGE_NOTICE

export type KfzLandingDocumentCandidate = {
  id: string
  group: KfzUploadGroup
  filename: string
  mimeType: string
  sizeBytes: number
}

export type KfzLandingDocumentRejection = {
  filename: string
  reason: string
  code:
    | 'invalid_type'
    | 'oversized'
    | 'group_limit'
    | 'total_limit'
    | 'invalid_group'
}

export type AddKfzLandingDocumentsResult = {
  documents: KfzLandingDocumentCandidate[]
  rejected: KfzLandingDocumentRejection[]
}

function normalizeFilename(filename: string): string {
  const trimmed = filename.trim()
  return trimmed.length > 0 ? trimmed : 'dokument'
}

function extensionOf(filename: string): string {
  const match = filename.toLowerCase().match(/(\.[a-z0-9]+)$/)
  return match?.[1] ?? ''
}

export function isKfzUploadGroup(value: string): value is KfzUploadGroup {
  return (KFZ_UPLOAD_GROUPS as readonly string[]).includes(value)
}

export function labelKfzUploadGroup(group: KfzUploadGroup | null | undefined): string {
  if (group === 'fahrzeugschein') {
    return 'Fahrzeugschein'
  }
  if (group === 'vorversicherung') {
    return 'Vorversicherung / letzte Beitragsrechnung'
  }
  return 'Dokument'
}

export function isAllowedKfzLandingDocumentType(
  filename: string,
  mimeType: string,
): boolean {
  const mime = mimeType.trim().toLowerCase()
  if (
    mime &&
    (KFZ_LANDING_ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mime)
  ) {
    return true
  }
  return (KFZ_LANDING_ALLOWED_DOCUMENT_EXTENSIONS as readonly string[]).includes(
    extensionOf(filename),
  )
}

export function validateKfzLandingDocumentCandidate(input: {
  group: string
  filename: string
  mimeType: string
  sizeBytes: number
}): { ok: true } | { ok: false; reason: string; code: KfzLandingDocumentRejection['code'] } {
  if (!isKfzUploadGroup(input.group)) {
    return { ok: false, reason: 'Unbekannte Dokumentgruppe.', code: 'invalid_group' }
  }
  if (!isAllowedKfzLandingDocumentType(input.filename, input.mimeType)) {
    return {
      ok: false,
      reason: 'Nur Fotos (JPG, PNG, WEBP, HEIC) oder PDF sind möglich.',
      code: 'invalid_type',
    }
  }
  if (
    !Number.isFinite(input.sizeBytes) ||
    input.sizeBytes < 0 ||
    input.sizeBytes > KFZ_LANDING_MAX_DOCUMENT_BYTES
  ) {
    return {
      ok: false,
      reason: 'Datei ist zu groß (maximal 8 MB).',
      code: 'oversized',
    }
  }
  return { ok: true }
}

export function createKfzLandingDocumentId(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  try {
    return randomUuid()
  } catch {
    return `kfz-doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  }
}

export function addKfzLandingDocuments(
  current: readonly KfzLandingDocumentCandidate[],
  incoming: ReadonlyArray<Omit<KfzLandingDocumentCandidate, 'id'> & { id?: string }>,
  createId: () => string = createKfzLandingDocumentId,
): AddKfzLandingDocumentsResult {
  const documents = [...current]
  const rejected: KfzLandingDocumentRejection[] = []

  for (const entry of incoming) {
    const filename = normalizeFilename(entry.filename)
    const checked = validateKfzLandingDocumentCandidate({
      group: entry.group,
      filename,
      mimeType: entry.mimeType,
      sizeBytes: entry.sizeBytes,
    })
    if (!checked.ok) {
      rejected.push({ filename, reason: checked.reason, code: checked.code })
      continue
    }

    if (documents.length >= KFZ_LANDING_MAX_DOCUMENTS_TOTAL) {
      rejected.push({
        filename,
        reason: `Maximal ${KFZ_LANDING_MAX_DOCUMENTS_TOTAL} Dateien insgesamt.`,
        code: 'total_limit',
      })
      continue
    }

    const groupCount = documents.filter((doc) => doc.group === entry.group).length
    if (groupCount >= KFZ_LANDING_MAX_DOCUMENTS_PER_GROUP) {
      rejected.push({
        filename,
        reason: `Maximal ${KFZ_LANDING_MAX_DOCUMENTS_PER_GROUP} Dateien in dieser Gruppe.`,
        code: 'group_limit',
      })
      continue
    }

    documents.push({
      id: entry.id?.trim() || createId(),
      group: entry.group,
      filename,
      mimeType: entry.mimeType.trim() || 'application/octet-stream',
      sizeBytes: entry.sizeBytes,
    })
  }

  return { documents, rejected }
}

export function removeKfzLandingDocument(
  current: readonly KfzLandingDocumentCandidate[],
  id: string,
): KfzLandingDocumentCandidate[] {
  return current.filter((doc) => doc.id !== id)
}

export function toPublicKfzUploadMeta(
  documents: readonly KfzLandingDocumentCandidate[],
): PublicKfzUploadMeta[] {
  return documents.map((doc) => ({
    filename: doc.filename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    group: doc.group,
  }))
}

export function formatKfzLandingDocumentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}
