import type { KfzUploadGroup } from '@/features/inbound/kfz/types/public-kfz-inquiry'

export const KFZ_INBOUND_DOCUMENTS_BUCKET = 'kfz-inbound-documents' as const

export const KFZ_DOCUMENT_OBJECT_KEY_PREFIX = 'kfz' as const

/** Non-secret storage reference. Never a URL. */
export type KfzDocumentObjectKey = string

export type KfzInboundDocumentBytes = {
  filename: string
  mimeType: string
  sizeBytes: number
  group: KfzUploadGroup
  bytes: ArrayBuffer
}

export type KfzStoredDocumentRef = {
  filename: string
  mimeType: string
  sizeBytes: number
  group: KfzUploadGroup
  objectKey: KfzDocumentObjectKey
}

export type KfzDocumentPutResult =
  | { ok: true }
  | { ok: false; error: string }

export type KfzDocumentGetResult =
  | {
      ok: true
      bytes: ArrayBuffer
      mimeType: string
    }
  | { ok: false }

/**
 * Persistenz-Port für private Kfz-Dokumentbytes.
 * Tests injizieren Memory; Production nutzt den Service-Role-Store.
 */
export type KfzDocumentStore = {
  putObject: (input: {
    objectKey: KfzDocumentObjectKey
    bytes: ArrayBuffer
    mimeType: string
  }) => Promise<KfzDocumentPutResult>
  removeObjects: (objectKeys: readonly KfzDocumentObjectKey[]) => Promise<void>
  getObject: (objectKey: KfzDocumentObjectKey) => Promise<KfzDocumentGetResult>
}

export const KFZ_DOCUMENT_REVIEW_PATH = '/app/inbox/kfz-document' as const
export const KFZ_DOCUMENT_PREVIEW_REVIEW_PATH = '/dev/kfz-document' as const
