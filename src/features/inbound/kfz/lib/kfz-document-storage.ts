/**
 * Private Kfz document object keys, validation and persist/cleanup.
 * Object keys are non-secret references, never public URLs or filenames.
 */

import {
  isAllowedKfzLandingDocumentType,
  isKfzUploadGroup,
  KFZ_LANDING_MAX_DOCUMENT_BYTES,
  KFZ_LANDING_MAX_DOCUMENTS_TOTAL,
  validateKfzLandingDocumentCandidate,
} from '@/features/inbound/kfz/lib/kfz-landing-documents'
import {
  KFZ_DOCUMENT_OBJECT_KEY_PREFIX,
  KFZ_DOCUMENT_PREVIEW_REVIEW_PATH,
  KFZ_DOCUMENT_REVIEW_PATH,
  type KfzDocumentObjectKey,
  type KfzDocumentStore,
  type KfzInboundDocumentBytes,
  type KfzStoredDocumentRef,
} from '@/features/inbound/kfz/types/kfz-document-storage'

const UUID_BODY =
  '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}'

const UUID_PATTERN = new RegExp(`^${UUID_BODY}$`, 'i')

const OBJECT_KEY_PATTERN = new RegExp(
  `^${KFZ_DOCUMENT_OBJECT_KEY_PREFIX}\\/${UUID_BODY}\\/${UUID_BODY}$`,
  'i',
)

export function isKfzDocumentObjectKey(value: string): value is KfzDocumentObjectKey {
  if (!value || value.length > 120) {
    return false
  }
  if (value.includes('..') || value.includes('//') || /https?:/i.test(value)) {
    return false
  }
  return OBJECT_KEY_PATTERN.test(value)
}

export function buildKfzDocumentObjectKey(input: {
  agencyId: string
  objectId: string
}): KfzDocumentObjectKey {
  return `${KFZ_DOCUMENT_OBJECT_KEY_PREFIX}/${input.agencyId}/${input.objectId}`
}

export function createKfzDocumentObjectId(
  randomUuid: () => string = () => crypto.randomUUID(),
): string {
  try {
    return randomUuid()
  } catch {
    return '00000000-0000-4000-8000-000000000000'
  }
}

export function buildKfzDocumentReviewHref(
  inboxItemId: string,
  objectKey: string,
  basePath: string = KFZ_DOCUMENT_REVIEW_PATH,
): string {
  const params = new URLSearchParams({
    item: inboxItemId,
    object: objectKey,
  })
  return `${basePath}?${params.toString()}`
}

export function buildKfzDocumentPreviewReviewHref(
  inboxItemId: string,
  objectKey: string,
): string {
  return buildKfzDocumentReviewHref(
    inboxItemId,
    objectKey,
    KFZ_DOCUMENT_PREVIEW_REVIEW_PATH,
  )
}

export function looksLikePublicDocumentUrl(value: string): boolean {
  return /https?:\/\//i.test(value) || value.startsWith('//') || value.includes('storage/v1/object/public')
}

export async function readKfzInboundDocumentsFromFiles(
  files: readonly File[],
  uploads: ReadonlyArray<{
    filename: string
    mimeType?: string | null
    sizeBytes?: number | null
    group?: string | null
  }>,
): Promise<ValidateKfzInboundDocumentsResult> {
  if (files.length !== uploads.length) {
    return {
      ok: false,
      error: 'Upload-Dateien passen nicht zu den Angaben.',
      code: 'invalid_field',
    }
  }

  const documents: KfzInboundDocumentBytes[] = []
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const meta = uploads[index]
    const group = meta?.group
    if (!file || !meta || !group || !isKfzUploadGroup(group)) {
      return {
        ok: false,
        error: 'Upload-Dateien passen nicht zu den Angaben.',
        code: 'invalid_field',
      }
    }
    documents.push({
      filename: meta.filename.trim() || file.name,
      mimeType: (meta.mimeType ?? file.type ?? '').trim(),
      sizeBytes: file.size,
      group,
      bytes: await file.arrayBuffer(),
    })
  }

  return validateKfzInboundDocumentBytes(documents)
}

export type ValidateKfzInboundDocumentsResult =
  | { ok: true; documents: KfzInboundDocumentBytes[] }
  | { ok: false; error: string; code: 'invalid_field' | 'oversized_field' }

export function validateKfzInboundDocumentBytes(
  documents: readonly KfzInboundDocumentBytes[],
): ValidateKfzInboundDocumentsResult {
  if (documents.length > KFZ_LANDING_MAX_DOCUMENTS_TOTAL) {
    return {
      ok: false,
      error: `Maximal ${KFZ_LANDING_MAX_DOCUMENTS_TOTAL} Dateien insgesamt.`,
      code: 'oversized_field',
    }
  }

  const accepted: KfzInboundDocumentBytes[] = []
  for (const entry of documents) {
    const filename = entry.filename.trim()
    const mimeType = entry.mimeType.trim()
    const sizeBytes = entry.bytes.byteLength
    if (!isKfzUploadGroup(entry.group)) {
      return { ok: false, error: 'Unbekannte Dokumentgruppe.', code: 'invalid_field' }
    }
    const checked = validateKfzLandingDocumentCandidate({
      group: entry.group,
      filename,
      mimeType,
      sizeBytes,
    })
    if (!checked.ok) {
      return {
        ok: false,
        error: checked.reason,
        code: checked.code === 'oversized' ? 'oversized_field' : 'invalid_field',
      }
    }
    if (sizeBytes <= 0) {
      return { ok: false, error: 'Datei ist leer.', code: 'invalid_field' }
    }
    if (sizeBytes > KFZ_LANDING_MAX_DOCUMENT_BYTES) {
      return {
        ok: false,
        error: 'Datei ist zu groß (maximal 8 MB).',
        code: 'oversized_field',
      }
    }
    if (!isAllowedKfzLandingDocumentType(filename, mimeType)) {
      return {
        ok: false,
        error: 'Nur Fotos (JPG, PNG, WEBP, HEIC) oder PDF sind möglich.',
        code: 'invalid_field',
      }
    }
    accepted.push({
      filename,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes,
      group: entry.group,
      bytes: entry.bytes,
    })
  }

  return { ok: true, documents: accepted }
}

export function documentsMatchUploadMeta(
  documents: readonly KfzInboundDocumentBytes[],
  uploads: ReadonlyArray<{ filename?: string | null; group?: string | null }> | null | undefined,
): boolean {
  if (!uploads || uploads.length !== documents.length) {
    return false
  }
  return documents.every((doc, index) => {
    const meta = uploads[index]
    return (
      meta?.filename?.trim() === doc.filename.trim() &&
      (meta.group == null || meta.group === doc.group)
    )
  })
}

export type PersistKfzInquiryDocumentsResult =
  | { ok: true; stored: KfzStoredDocumentRef[] }
  | { ok: false; error: string; code: string }

export async function persistKfzInquiryDocuments(input: {
  agencyId: string
  documents: readonly KfzInboundDocumentBytes[]
  documentStore: KfzDocumentStore
  createObjectId?: () => string
}): Promise<PersistKfzInquiryDocumentsResult> {
  const checked = validateKfzInboundDocumentBytes(input.documents)
  if (!checked.ok) {
    return checked
  }

  if (checked.documents.length === 0) {
    return { ok: true, stored: [] }
  }

  if (!UUID_PATTERN.test(input.agencyId)) {
    return { ok: false, error: 'Speicherpfad ist ungültig.', code: 'invalid_field' }
  }

  const stored: KfzStoredDocumentRef[] = []
  const uploadedKeys: string[] = []

  try {
    for (const document of checked.documents) {
      const objectId = (input.createObjectId ?? createKfzDocumentObjectId)()
      if (!UUID_PATTERN.test(objectId)) {
        await input.documentStore.removeObjects(uploadedKeys)
        return { ok: false, error: 'Speicherpfad ist ungültig.', code: 'intake_failed' }
      }
      const objectKey = buildKfzDocumentObjectKey({
        agencyId: input.agencyId,
        objectId,
      })
      const put = await input.documentStore.putObject({
        objectKey,
        bytes: document.bytes,
        mimeType: document.mimeType,
      })
      if (!put.ok) {
        await input.documentStore.removeObjects(uploadedKeys)
        return {
          ok: false,
          error: put.error || 'Die Datei konnte nicht gespeichert werden.',
          code: 'store_unavailable',
        }
      }
      uploadedKeys.push(objectKey)
      stored.push({
        filename: document.filename,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
        group: document.group,
        objectKey,
      })
    }
  } catch {
    await input.documentStore.removeObjects(uploadedKeys)
    return {
      ok: false,
      error: 'Die Datei konnte nicht gespeichert werden.',
      code: 'store_unavailable',
    }
  }

  return { ok: true, stored }
}

export async function cleanupKfzDocumentObjects(
  documentStore: KfzDocumentStore,
  objectKeys: readonly string[],
): Promise<void> {
  const keys = objectKeys.filter((key) => isKfzDocumentObjectKey(key))
  if (keys.length === 0) {
    return
  }
  await documentStore.removeObjects(keys)
}

export type KfzDocumentReviewActor = {
  authenticated: boolean
  agencyId: string | null
}

export type KfzDocumentReviewItem = {
  id: string
  agencyId: string
  objectKeys: readonly string[]
  filenameByObjectKey: Readonly<Record<string, string>>
  mimeTypeByObjectKey: Readonly<Record<string, string>>
}

export type AuthorizeKfzDocumentReviewResult =
  | {
      ok: true
      objectKey: KfzDocumentObjectKey
      filename: string
      mimeType: string
    }
  | { ok: false; status: 401 | 404; error: string }

export const KFZ_DOCUMENT_UNAUTHENTICATED_ERROR = 'Sie sind nicht angemeldet.' as const

export type KfzDocumentReviewSession =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: typeof KFZ_DOCUMENT_UNAUTHENTICATED_ERROR }

/**
 * Session for the authorized review route. Missing env, thrown auth clients,
 * and anonymous cookies all fail closed as 401 — never 500.
 */
export async function readKfzDocumentReviewSession(
  loadUser: () => Promise<{ id: string } | null>,
): Promise<KfzDocumentReviewSession> {
  try {
    const user = await loadUser()
    if (!user?.id) {
      return { ok: false, status: 401, error: KFZ_DOCUMENT_UNAUTHENTICATED_ERROR }
    }
    return { ok: true, userId: user.id }
  } catch {
    return { ok: false, status: 401, error: KFZ_DOCUMENT_UNAUTHENTICATED_ERROR }
  }
}

/**
 * Authorized internal review: same agency + object belongs to this inbox item.
 * Unauthenticated and cross-item access fail without leaking existence.
 */
export function authorizeKfzDocumentReview(input: {
  actor: KfzDocumentReviewActor
  item: KfzDocumentReviewItem | null
  requestedItemId: string
  requestedObjectKey: string
}): AuthorizeKfzDocumentReviewResult {
  if (!input.actor.authenticated || !input.actor.agencyId) {
    return { ok: false, status: 401, error: 'Sie sind nicht angemeldet.' }
  }

  if (!isKfzDocumentObjectKey(input.requestedObjectKey) || looksLikePublicDocumentUrl(input.requestedObjectKey)) {
    return { ok: false, status: 404, error: 'Das Dokument wurde nicht gefunden.' }
  }

  if (!input.item || input.item.id !== input.requestedItemId) {
    return { ok: false, status: 404, error: 'Das Dokument wurde nicht gefunden.' }
  }

  if (input.item.agencyId !== input.actor.agencyId) {
    return { ok: false, status: 404, error: 'Das Dokument wurde nicht gefunden.' }
  }

  if (!input.item.objectKeys.includes(input.requestedObjectKey)) {
    return { ok: false, status: 404, error: 'Das Dokument wurde nicht gefunden.' }
  }

  return {
    ok: true,
    objectKey: input.requestedObjectKey,
    filename: input.item.filenameByObjectKey[input.requestedObjectKey] ?? 'dokument',
    mimeType: input.item.mimeTypeByObjectKey[input.requestedObjectKey] || 'application/octet-stream',
  }
}

export function readObjectKeysFromUploadMeta(
  uploadMeta: unknown,
): {
  objectKeys: string[]
  filenameByObjectKey: Record<string, string>
  mimeTypeByObjectKey: Record<string, string>
} {
  const objectKeys: string[] = []
  const filenameByObjectKey: Record<string, string> = {}
  const mimeTypeByObjectKey: Record<string, string> = {}
  if (!Array.isArray(uploadMeta)) {
    return { objectKeys, filenameByObjectKey, mimeTypeByObjectKey }
  }
  for (const entry of uploadMeta) {
    if (typeof entry !== 'object' || entry === null) {
      continue
    }
    const record = entry as Record<string, unknown>
    const objectKey = typeof record.objectKey === 'string' ? record.objectKey : ''
    if (!isKfzDocumentObjectKey(objectKey)) {
      continue
    }
    objectKeys.push(objectKey)
    const filename = typeof record.filename === 'string' ? record.filename.trim() : ''
    filenameByObjectKey[objectKey] = filename || 'dokument'
    const mimeType = typeof record.mimeType === 'string' ? record.mimeType.trim() : ''
    mimeTypeByObjectKey[objectKey] = mimeType || 'application/octet-stream'
  }
  return { objectKeys, filenameByObjectKey, mimeTypeByObjectKey }
}

export function kfzDocumentContentDisposition(filename: string): string {
  const safe = filename.replace(/[\r\n"]/g, '_').trim() || 'dokument'
  const ascii = safe.replace(/[^\x20-\x7E]/g, '_')
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe)}`
}
