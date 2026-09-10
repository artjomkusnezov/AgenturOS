/**
 * Private durable Kfz document storage: upload, retry, duplicate, authz, cleanup,
 * declined analytics and one normalized inbox item.
 */
import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import {
  authorizeKfzDocumentReview,
  buildKfzDocumentObjectKey,
  isKfzDocumentObjectKey,
  looksLikePublicDocumentUrl,
  persistKfzInquiryDocuments,
  readKfzDocumentReviewSession,
  validateKfzInboundDocumentBytes,
} from '@/features/inbound/kfz/lib/kfz-document-storage'
import { ingestKfzAnalyticsEvents } from '@/features/inbound/kfz/lib/kfz-analytics-ingest'
import { assertNoKfzAnalyticsPii } from '@/features/inbound/kfz/lib/kfz-analytics-redact'
import { resetRateLimitBucketsForTests } from '@/features/inbound/kfz/lib/rate-limit-seam'
import { createMemoryKfzAnalyticsStore } from '@/features/inbound/kfz/repositories/kfz-analytics-store'
import { createMemoryKfzDocumentStore } from '@/features/inbound/kfz/repositories/kfz-document-store'
import { processKfzWebsiteInquiry } from '@/features/inbound/kfz/services/process-kfz-inquiry'
import { validatePublicKfzInquiry } from '@/features/inbound/kfz/lib/validate-public-kfz-inquiry'
import type { KfzInboundDocumentBytes } from '@/features/inbound/kfz/types/kfz-document-storage'
import { KFZ_INBOUND_DOCUMENTS_BUCKET } from '@/features/inbound/kfz/types/kfz-document-storage'
import { createMemoryInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { PublicKfzInquiryPayload } from '@/features/inbound/kfz/types/public-kfz-inquiry'

const AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const SECRET = 'test-kfz-document-storage-secret'
const OTHER_AGENCY = '33333333-3333-4333-8333-333333333333'

function jpegBytes(): ArrayBuffer {
  return new Uint8Array([0xff, 0xd8, 0xff, 0xd9, 0x01, 0x02, 0x03, 0x04]).buffer
}

function pdfBytes(): ArrayBuffer {
  return new TextEncoder().encode('%PDF-1.4 test').buffer
}

function basePayload(overrides: Partial<PublicKfzInquiryPayload> = {}): PublicKfzInquiryPayload {
  return {
    fullName: 'Max Mustermann',
    postalCode: '49525',
    city: 'Lengerich',
    phone: '+491701234567',
    email: null,
    preferredChannel: 'whatsapp',
    inquiryReason: 'Unterlagen hochladen',
    inquiryProcessingConsent: true,
    consentVersion: 'kfz-lp-2026-09-01',
    consentTimestamp: '2026-09-10T08:00:00.000Z',
    language: 'de',
    source: 'kfz.artkus.de',
    submissionId: 'kfz-doc-storage-001',
    uploads: [
      {
        filename: 'schein.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: jpegBytes().byteLength,
        group: 'fahrzeugschein',
      },
    ],
    ...overrides,
  }
}

function jpegDocument(overrides: Partial<KfzInboundDocumentBytes> = {}): KfzInboundDocumentBytes {
  const bytes = jpegBytes()
  return {
    filename: 'schein.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: bytes.byteLength,
    group: 'fahrzeugschein',
    bytes,
    ...overrides,
  }
}

function withKfzEnv(run: () => Promise<void>): Promise<void> {
  const prev = {
    agency: process.env.INBOUND_KFZ_AGENCY_ID,
    actor: process.env.INBOUND_KFZ_ACTOR_USER_ID,
    secret: process.env.INBOUND_KFZ_INTAKE_SECRET,
  }
  process.env.INBOUND_KFZ_AGENCY_ID = AGENCY_ID
  process.env.INBOUND_KFZ_ACTOR_USER_ID = ACTOR_ID
  process.env.INBOUND_KFZ_INTAKE_SECRET = SECRET
  return run().finally(() => {
    if (prev.agency === undefined) delete process.env.INBOUND_KFZ_AGENCY_ID
    else process.env.INBOUND_KFZ_AGENCY_ID = prev.agency
    if (prev.actor === undefined) delete process.env.INBOUND_KFZ_ACTOR_USER_ID
    else process.env.INBOUND_KFZ_ACTOR_USER_ID = prev.actor
    if (prev.secret === undefined) delete process.env.INBOUND_KFZ_INTAKE_SECRET
    else process.env.INBOUND_KFZ_INTAKE_SECRET = prev.secret
  })
}

describe('kfz private document storage', () => {
  beforeEach(() => {
    resetRateLimitBucketsForTests()
  })

  it('rejects client-supplied objectKey on the public payload', () => {
    const validated = validatePublicKfzInquiry(
      JSON.stringify(
        basePayload({
          uploads: [
            {
              filename: 'schein.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 8,
              group: 'fahrzeugschein',
              objectKey: 'kfz/11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            },
          ],
        }),
      ),
    )
    assert.equal(validated.ok, false)
  })

  it('uploads bytes privately, stores only objectKey, and presents one inbox item', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const documents = createMemoryKfzDocumentStore()
      const payload = basePayload()
      const result = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'doc-upload',
        store,
        documentStore: documents,
        documents: [jpegDocument()],
      })

      assert.equal(result.success, true)
      if (!result.success) return
      assert.equal(result.deduplicated, false)
      assert.equal(store.items.length, 1)
      assert.equal(documents.objects.size, 1)

      const meta = store.items[0]!.inbound_metadata as {
        uploadMeta?: Array<Record<string, unknown>>
      }
      const objectKey = String(meta.uploadMeta?.[0]?.objectKey ?? '')
      assert.equal(isKfzDocumentObjectKey(objectKey), true)
      assert.equal(looksLikePublicDocumentUrl(objectKey), false)
      assert.equal(objectKey.includes('schein.jpg'), false)
      assert.equal(JSON.stringify(meta).includes('http'), false)
      assert.equal(meta.uploadMeta?.[0]?.filename, 'schein.jpg')
      assert.doesNotMatch(JSON.stringify(store.items[0]), /storage\/v1\/object\/public/)

      const review = presentKfzWebsiteInboxItem(store.items[0]!)
      assert.ok(review)
      assert.equal(review.documents.length, 1)
      assert.equal(review.documents[0]?.filename, 'schein.jpg')
      assert.equal(review.documents[0]?.objectKey, objectKey)
      assert.match(review.documents[0]?.reviewHref ?? '', /\/app\/inbox\/kfz-document/)
      assert.doesNotMatch(review.documents[0]?.reviewHref ?? '', /https?:\/\//)
    })
  })

  it('retries after a designed failure then keeps exact-once on duplicate submit', async () => {
    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const documents = createMemoryKfzDocumentStore()
      const payload = basePayload({ submissionId: 'kfz-doc-retry-001' })
      const files = [jpegDocument()]

      const failedStore = {
        ...store,
        async createInboxItem() {
          throw new Error('designed failure')
        },
        async findByExternalIdentity() {
          return null
        },
        async uploadAndLinkAttachment() {
          return { success: false as const, error: 'unused' }
        },
      }

      const failed = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'doc-retry',
        store: failedStore,
        documentStore: documents,
        documents: files,
      })
      assert.equal(failed.success, false)
      assert.equal(documents.objects.size, 0)
      assert.ok(documents.removed.length >= 1)

      const first = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'doc-retry-2',
        store,
        documentStore: documents,
        documents: files,
      })
      assert.equal(first.success, true)
      if (!first.success) return
      assert.equal(first.deduplicated, false)
      assert.equal(store.items.length, 1)
      const objectCount = documents.objects.size
      assert.equal(objectCount, 1)

      const duplicate = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(payload),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'doc-retry-3',
        store,
        documentStore: documents,
        documents: files,
      })
      assert.equal(duplicate.success, true)
      if (!duplicate.success) return
      assert.equal(duplicate.deduplicated, true)
      assert.equal(store.items.length, 1)
      assert.equal(documents.objects.size, objectCount)
    })
  })

  it('rejects unsupported type and oversized files without storing bytes', async () => {
    const exe = validateKfzInboundDocumentBytes([
      jpegDocument({ filename: 'virus.exe', mimeType: 'application/x-msdownload' }),
    ])
    assert.equal(exe.ok, false)

    const oversized = validateKfzInboundDocumentBytes([
      jpegDocument({
        bytes: new Uint8Array(8 * 1024 * 1024 + 1).buffer,
        sizeBytes: 8 * 1024 * 1024 + 1,
      }),
    ])
    assert.equal(oversized.ok, false)

    await withKfzEnv(async () => {
      const store = createMemoryInboundIntakeStore()
      const documents = createMemoryKfzDocumentStore()
      const result = await processKfzWebsiteInquiry({
        rawBody: JSON.stringify(
          basePayload({
            uploads: [
              {
                filename: 'notes.txt',
                mimeType: 'text/plain',
                sizeBytes: 12,
                group: 'fahrzeugschein',
              },
            ],
          }),
        ),
        authorizationHeader: `Bearer ${SECRET}`,
        rateLimitKey: 'doc-reject',
        store,
        documentStore: documents,
        documents: [
          jpegDocument({
            filename: 'notes.txt',
            mimeType: 'text/plain',
            bytes: new TextEncoder().encode('not a photo').buffer,
          }),
        ],
      })
      assert.equal(result.success, false)
      assert.equal(store.items.length, 0)
      assert.equal(documents.objects.size, 0)
    })
  })

  it('cleans up orphaned bytes after a deterministic persist failure', async () => {
    const documents = createMemoryKfzDocumentStore()
    const failing: typeof documents = {
      ...documents,
      async putObject(input) {
        if (documents.objects.size >= 1) {
          return { ok: false, error: 'designed put failure' }
        }
        return documents.putObject(input)
      },
    }

    const result = await persistKfzInquiryDocuments({
      agencyId: AGENCY_ID,
      documentStore: failing,
      documents: [
        jpegDocument(),
        {
          filename: 'beitrag.pdf',
          mimeType: 'application/pdf',
          sizeBytes: pdfBytes().byteLength,
          group: 'vorversicherung',
          bytes: pdfBytes(),
        },
      ],
    })
    assert.equal(result.ok, false)
    assert.equal(documents.objects.size, 0)
    assert.ok(documents.removed.length >= 1)
  })

  it('treats a thrown or empty auth client as unauthenticated review', async () => {
    const thrown = await readKfzDocumentReviewSession(async () => {
      throw new Error('supabase url missing')
    })
    assert.equal(thrown.ok, false)
    if (!thrown.ok) {
      assert.equal(thrown.status, 401)
      assert.equal(thrown.error, 'Sie sind nicht angemeldet.')
    }

    const anonymous = await readKfzDocumentReviewSession(async () => null)
    assert.equal(anonymous.ok, false)
    if (!anonymous.ok) {
      assert.equal(anonymous.status, 401)
    }

    const signedIn = await readKfzDocumentReviewSession(async () => ({ id: ACTOR_ID }))
    assert.equal(signedIn.ok, true)
    if (signedIn.ok) {
      assert.equal(signedIn.userId, ACTOR_ID)
    }
  })

  it('denies unauthenticated and cross-item document review', () => {
    const objectKey = buildKfzDocumentObjectKey({
      agencyId: AGENCY_ID,
      objectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    })
    const item = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      agencyId: AGENCY_ID,
      objectKeys: [objectKey],
      filenameByObjectKey: { [objectKey]: 'schein.jpg' },
      mimeTypeByObjectKey: { [objectKey]: 'image/jpeg' },
    }

    const anonymous = authorizeKfzDocumentReview({
      actor: { authenticated: false, agencyId: null },
      item,
      requestedItemId: item.id,
      requestedObjectKey: objectKey,
    })
    assert.equal(anonymous.ok, false)
    if (!anonymous.ok) {
      assert.equal(anonymous.status, 401)
    }

    const crossItem = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: AGENCY_ID },
      item,
      requestedItemId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      requestedObjectKey: objectKey,
    })
    assert.equal(crossItem.ok, false)
    if (!crossItem.ok) {
      assert.equal(crossItem.status, 404)
    }

    const otherAgency = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: OTHER_AGENCY },
      item,
      requestedItemId: item.id,
      requestedObjectKey: objectKey,
    })
    assert.equal(otherAgency.ok, false)

    const publicUrl = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: AGENCY_ID },
      item,
      requestedItemId: item.id,
      requestedObjectKey: `https://example.supabase.co/storage/v1/object/public/${KFZ_INBOUND_DOCUMENTS_BUCKET}/leak`,
    })
    assert.equal(publicUrl.ok, false)

    const allowed = authorizeKfzDocumentReview({
      actor: { authenticated: true, agencyId: AGENCY_ID },
      item,
      requestedItemId: item.id,
      requestedObjectKey: objectKey,
    })
    assert.equal(allowed.ok, true)
    if (allowed.ok) {
      assert.equal(allowed.filename, 'schein.jpg')
    }
  })

  it('does not persist filenames, object keys or answers when analytics is declined', async () => {
    const analytics = createMemoryKfzAnalyticsStore()
    const ingested = await ingestKfzAnalyticsEvents({
      consent: 'declined',
      events: [
        {
          eventName: 'submit_succeeded',
          sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          properties: {
            filename: 'schein.jpg',
            objectKey: 'kfz/secret/key',
            answer: 'VW Golf',
            fullName: 'Max Mustermann',
          },
        },
      ],
      store: analytics,
    })
    assert.equal(ingested.accepted, 0)
    assert.equal(analytics.events.length, 0)

    const granted = await ingestKfzAnalyticsEvents({
      consent: 'granted',
      events: [
        {
          eventName: 'submit_succeeded',
          sessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          properties: {
            filename: 'schein.jpg',
            objectKey: buildKfzDocumentObjectKey({
              agencyId: AGENCY_ID,
              objectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            }),
            errorCategory: 'timeout',
          },
        },
      ],
      store: analytics,
    })
    assert.equal(granted.accepted, 1)
    assert.equal(
      granted.records[0] && 'filename' in granted.records[0].properties,
      false,
    )
    assert.equal(JSON.stringify(granted.records).includes('schein.jpg'), false)
    assert.equal(assertNoKfzAnalyticsPii(granted.records[0]!).length, 0)
  })
})
