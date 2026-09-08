'use server'

import { presentKfzWebsiteInboxItem } from '@/features/inbox/lib/present-kfz-website-inbox'
import { getKfzLandingPreviewStore } from '@/features/inbound/kfz/lib/kfz-landing-preview-store'
import { handleKfzInboundHttpRequest } from '@/features/inbound/kfz/services/handle-kfz-inbound-http'
import type { KfzLandingSubmitState } from '@/features/inbound/kfz/types/kfz-landing-submit'
import type { PublicKfzInquiryPayload } from '@/features/inbound/kfz/types/public-kfz-inquiry'

const PREVIEW_AGENCY_ID = '11111111-1111-4111-8111-111111111111'
const PREVIEW_ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const PREVIEW_SECRET = 'local-kfz-landing-preview-secret'

function ensurePreviewEnv() {
  if (!process.env.INBOUND_KFZ_AGENCY_ID?.trim()) {
    process.env.INBOUND_KFZ_AGENCY_ID = PREVIEW_AGENCY_ID
  }
  if (!process.env.INBOUND_KFZ_ACTOR_USER_ID?.trim()) {
    process.env.INBOUND_KFZ_ACTOR_USER_ID = PREVIEW_ACTOR_ID
  }
  if (!process.env.INBOUND_KFZ_INTAKE_SECRET?.trim()) {
    process.env.INBOUND_KFZ_INTAKE_SECRET = PREVIEW_SECRET
  }
}

/**
 * Local-only submit seam: same handler as production, memory store, no customer message.
 */
export async function submitKfzLandingPreviewInquiryAction(
  payload: PublicKfzInquiryPayload,
): Promise<KfzLandingSubmitState> {
  if (process.env.NODE_ENV === 'production') {
    return {
      ok: false,
      error: 'Die lokale Vorschau ist in Production nicht verfügbar.',
      code: 'preview_disabled',
      retryable: false,
    }
  }

  ensurePreviewEnv()
  const store = getKfzLandingPreviewStore()
  const secret = process.env.INBOUND_KFZ_INTAKE_SECRET?.trim() || PREVIEW_SECRET

  const result = await handleKfzInboundHttpRequest(
    new Request('http://localhost/api/inbound/kfz', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }),
    { store },
  )

  if (!result.ok) {
    return {
      ok: false,
      error: result.body.error,
      code: result.body.code,
      retryable: result.status >= 500 || result.status === 429,
    }
  }

  return {
    ok: true,
    deduplicated: result.body.deduplicated,
  }
}

export async function readKfzLandingPreviewInboxAction() {
  if (process.env.NODE_ENV === 'production') {
    return { items: [] as const }
  }

  return {
    items: getKfzLandingPreviewStore().items.map((item) => {
      const review = presentKfzWebsiteInboxItem(item)
      return {
        id: item.id,
        externalId: item.external_id,
        preferredChannel: review?.preferredChannel ?? null,
        request: review?.request ?? null,
        documents: review?.documents ?? [],
      }
    }),
  }
}
