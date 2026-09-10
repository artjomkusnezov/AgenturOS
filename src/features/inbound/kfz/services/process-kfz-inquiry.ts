import { getInboundKfzRuntimeConfig } from '@/features/inbound/kfz/config/inbound-kfz-config'
import { toInboundItemFromKfzInquiry } from '@/features/inbound/kfz/lib/kfz-adapter'
import {
  cleanupKfzDocumentObjects,
  documentsMatchUploadMeta,
  persistKfzInquiryDocuments,
} from '@/features/inbound/kfz/lib/kfz-document-storage'
import { logKfzInbound } from '@/features/inbound/kfz/lib/kfz-inbound-log'
import { normalizeKfzInquiry } from '@/features/inbound/kfz/lib/normalize-kfz-inquiry'
import { consumeRateLimit } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { validatePublicKfzInquiry } from '@/features/inbound/kfz/lib/validate-public-kfz-inquiry'
import { verifyKfzIntakeBearer } from '@/features/inbound/kfz/lib/verify-kfz-intake-auth'
import type {
  KfzDocumentStore,
  KfzInboundDocumentBytes,
} from '@/features/inbound/kfz/types/kfz-document-storage'
import { ingestInboundItem } from '@/features/inbound/services/inbound-intake-service'
import type { InboundIntakeStore } from '@/features/inbound/types/inbound-intake-store'

export type ProcessKfzInquiryResult =
  | {
      success: true
      deduplicated: boolean
      inboxItemId: string
    }
  | {
      success: false
      error: string
      status: number
      code?: string
    }

/**
 * Website/Kfz-Transport → Validate → Normalize → Adapter → Intake.
 * Adapter enthält keine Businesslogik; AI bleibt außerhalb.
 * Dokumentbytes gehen in den privaten Bucket; Inbox speichert nur objectKey.
 */
export async function processKfzWebsiteInquiry(input: {
  rawBody: string
  authorizationHeader: string | null
  /** Undurchsichtiger Rate-Limit-Bucket (z. B. gehashte IP), nie Payload. */
  rateLimitKey: string
  store: InboundIntakeStore
  receivedAt?: string
  documents?: readonly KfzInboundDocumentBytes[]
  documentStore?: KfzDocumentStore
}): Promise<ProcessKfzInquiryResult> {
  const config = getInboundKfzRuntimeConfig()
  if (!config) {
    return {
      success: false,
      error: 'Kfz-Inbound ist nicht konfiguriert.',
      status: 503,
      code: 'config_missing',
    }
  }

  if (
    !verifyKfzIntakeBearer({
      authorizationHeader: input.authorizationHeader,
      expectedSecret: config.intakeSecret,
    })
  ) {
    return {
      success: false,
      error: 'Nicht autorisiert.',
      status: 401,
      code: 'unauthorized',
    }
  }

  const limit = consumeRateLimit({
    key: `kfz:${input.rateLimitKey}`,
    max: config.rateLimitMax,
    windowMs: config.rateLimitWindowMs,
  })

  if (!limit.allowed) {
    return {
      success: false,
      error: 'Zu viele Anfragen. Bitte später erneut versuchen.',
      status: 429,
      code: 'rate_limited',
    }
  }

  const validated = validatePublicKfzInquiry(input.rawBody)
  if (!validated.ok) {
    const status =
      validated.code === 'payload_too_large'
        ? 413
        : validated.code === 'invalid_json'
          ? 400
          : 422
    return {
      success: false,
      error: validated.error,
      status,
      code: validated.code,
    }
  }

  const receivedAt = input.receivedAt ?? new Date().toISOString()
  const documents = input.documents ?? []

  if (documents.length > 0) {
    if (!documentsMatchUploadMeta(documents, validated.payload.uploads)) {
      return {
        success: false,
        error: 'Upload-Dateien passen nicht zu den Angaben.',
        status: 422,
        code: 'invalid_field',
      }
    }
    if (!input.documentStore) {
      return {
        success: false,
        error: 'Kfz-Inbound ist nicht konfiguriert (Dokumentablage).',
        status: 503,
        code: 'store_unavailable',
      }
    }
  }

  const normalized = normalizeKfzInquiry(validated.payload, receivedAt)
  if (!normalized.ok) {
    return {
      success: false,
      error: normalized.error,
      status: 422,
      code: normalized.code,
    }
  }

  const existing = await input.store.findByExternalIdentity({
    agencyId: config.agencyId,
    channel: 'website',
    externalId: normalized.inquiry.externalId,
  })

  if (existing) {
    return {
      success: true,
      deduplicated: true,
      inboxItemId: existing.id,
    }
  }

  let storedKeys: string[] = []
  if (documents.length > 0 && input.documentStore) {
    const persisted = await persistKfzInquiryDocuments({
      agencyId: config.agencyId,
      documents,
      documentStore: input.documentStore,
    })
    if (!persisted.ok) {
      const status =
        persisted.code === 'oversized_field'
          ? 413
          : persisted.code === 'invalid_field'
            ? 422
            : 503
      return {
        success: false,
        error: persisted.error,
        status,
        code: persisted.code,
      }
    }
    storedKeys = persisted.stored.map((entry) => entry.objectKey)
    normalized.inquiry.uploadMeta = persisted.stored.map((entry) => ({
      filename: entry.filename,
      mimeType: entry.mimeType,
      sizeBytes: entry.sizeBytes,
      group: entry.group,
      objectKey: entry.objectKey,
    }))
    logKfzInbound('documents_stored', { count: storedKeys.length })
  }

  const item = toInboundItemFromKfzInquiry(normalized.inquiry)
  const result = await ingestInboundItem(input.store, {
    agencyId: config.agencyId,
    actorUserId: config.actorUserId,
    item,
  })

  if (!result.success) {
    if (storedKeys.length > 0 && input.documentStore) {
      await cleanupKfzDocumentObjects(input.documentStore, storedKeys)
    }
    return {
      success: false,
      error: result.error,
      status: 500,
      code: 'intake_failed',
    }
  }

  if (result.deduplicated && storedKeys.length > 0 && input.documentStore) {
    await cleanupKfzDocumentObjects(input.documentStore, storedKeys)
  }

  return {
    success: true,
    deduplicated: result.deduplicated,
    inboxItemId: result.item.id,
  }
}
