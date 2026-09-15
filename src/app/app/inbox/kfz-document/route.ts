import { NextResponse } from 'next/server'

import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import {
  authorizeKfzDocumentReview,
  KFZ_DOCUMENT_UNAUTHENTICATED_ERROR,
  kfzDocumentContentDisposition,
  readKfzDocumentReviewSession,
  readObjectKeysFromUploadMeta,
} from '@/features/inbound/kfz/lib/kfz-document-storage'
import { createServiceRoleKfzDocumentStore } from '@/features/inbound/kfz/repositories/kfz-document-store'
import { isValidInboxItemId } from '@/features/inbox/lib/validate-inbox-item'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Authorized internal Kfz document review.
 * Unauthenticated and cross-item access fail. No public storage URL.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const itemId = url.searchParams.get('item')?.trim() ?? ''
  const objectKey = url.searchParams.get('object')?.trim() ?? ''

  let supabase: Awaited<ReturnType<typeof createClient>>
  try {
    supabase = await createClient()
  } catch {
    return NextResponse.json({ error: KFZ_DOCUMENT_UNAUTHENTICATED_ERROR }, { status: 401 })
  }

  const session = await readKfzDocumentReviewSession(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user
  })

  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status })
  }

  if (!isValidInboxItemId(itemId)) {
    return NextResponse.json({ error: 'Das Dokument wurde nicht gefunden.' }, { status: 404 })
  }

  const agencyResult = await getCurrentUserAgency()
  if (!agencyResult.success) {
    const status = agencyResult.error.includes('nicht angemeldet') ? 401 : 404
    return NextResponse.json(
      { error: status === 401 ? 'Sie sind nicht angemeldet.' : 'Das Dokument wurde nicht gefunden.' },
      { status },
    )
  }

  const { data: item } = await supabase
    .from('inbox_items')
    .select('id, agency_id, inbound_metadata')
    .eq('id', itemId)
    .eq('agency_id', agencyResult.agency.id)
    .maybeSingle()

  const keys = readObjectKeysFromUploadMeta(
    item && typeof item.inbound_metadata === 'object' && item.inbound_metadata
      ? (item.inbound_metadata as { uploadMeta?: unknown }).uploadMeta
      : null,
  )

  const authorized = authorizeKfzDocumentReview({
    actor: { authenticated: true, agencyId: agencyResult.agency.id },
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

  let documentStore
  try {
    documentStore = createServiceRoleKfzDocumentStore()
  } catch {
    return NextResponse.json({ error: 'Das Dokument wurde nicht gefunden.' }, { status: 404 })
  }

  const stored = await documentStore.getObject(authorized.objectKey)
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
