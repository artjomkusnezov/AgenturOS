import { NextResponse } from 'next/server'
import { notFound } from 'next/navigation'

import {
  authorizeKfzDocumentReview,
  kfzDocumentContentDisposition,
  readObjectKeysFromUploadMeta,
} from '@/features/inbound/kfz/lib/kfz-document-storage'
import { getKfzLandingPreviewDocumentStore, getKfzLandingPreviewStore } from '@/features/inbound/kfz/lib/kfz-landing-preview-store'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'

export const dynamic = 'force-dynamic'

/**
 * Local-only document review for /dev/kfz-landing memory store.
 * Production returns 404. Cross-item access fails.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  const url = new URL(request.url)
  const itemId = url.searchParams.get('item')?.trim() ?? ''
  const objectKey = url.searchParams.get('object')?.trim() ?? ''

  if (!isValidInboxItemId(itemId)) {
    return NextResponse.json({ error: 'Das Dokument wurde nicht gefunden.' }, { status: 404 })
  }

  const item = getKfzLandingPreviewStore().items.find((entry) => entry.id === itemId) ?? null
  const keys = readObjectKeysFromUploadMeta(
    item && typeof item.inbound_metadata === 'object' && item.inbound_metadata
      ? (item.inbound_metadata as { uploadMeta?: unknown }).uploadMeta
      : null,
  )

  const authorized = authorizeKfzDocumentReview({
    actor: {
      authenticated: true,
      agencyId: item?.agency_id ?? '11111111-1111-4111-8111-111111111111',
    },
    item: item
      ? {
          id: item.id,
          agencyId: item.agency_id,
          objectKeys: keys.objectKeys,
          filenameByObjectKey: keys.filenameByObjectKey,
          mimeTypeByObjectKey: keys.mimeTypeByObjectKey,
        }
      : null,
    requestedItemId: itemId,
    requestedObjectKey: objectKey,
  })

  if (!authorized.ok) {
    return NextResponse.json({ error: authorized.error }, { status: authorized.status })
  }

  const stored = await getKfzLandingPreviewDocumentStore().getObject(authorized.objectKey)
  if (!stored.ok) {
    return NextResponse.json({ error: 'Das Dokument wurde nicht gefunden.' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(stored.bytes), {
    status: 200,
    headers: {
      'Content-Type': authorized.mimeType || stored.mimeType,
      'Content-Disposition': kfzDocumentContentDisposition(authorized.filename),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
