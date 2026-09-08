'use server'

import { revalidatePath } from 'next/cache'

import { getCurrentUserAgency } from '@/features/agency/repositories/agency-repository'
import { createSupabaseInboundIntakeStore } from '@/features/inbound/repositories/inbound-intake-store'
import type { InboundAddressKind } from '@/features/inbound/types/inbound-item'
import { confirmManualCapture } from '@/features/inbound/manual/services/confirm-manual-capture'
import { originFromReviewFields } from '@/features/inbound/manual/lib/present-manual-capture'
import { MANUAL_CAPTURE_EMPTY_ERROR, MANUAL_CAPTURE_ORIGIN_KIND_ERROR } from '@/features/inbound/manual/lib/manual-capture-copy'
import { parseManualCaptureOriginKind } from '@/features/inbound/manual/lib/manual-capture-origin'
import { createClient } from '@/lib/supabase/server'
import { getDisplayName } from '@/lib/user/get-display-name'

export type ManualCaptureMutationState = {
  fieldErrors?: { sourceText?: string; originKind?: string }
  error?: string
  success?: boolean
  itemId?: string
}

function parseAddressKind(value: string): InboundAddressKind | null {
  if (value === 'email' || value === 'phone' || value === 'other') {
    return value
  }

  return null
}

export async function confirmManualCaptureAction(
  _prevState: ManualCaptureMutationState,
  formData: FormData,
): Promise<ManualCaptureMutationState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sie sind nicht angemeldet.' }
  }

  const agencyResult = await getCurrentUserAgency()
  if (!agencyResult.success) {
    return { error: agencyResult.error }
  }

  const sourceText = String(formData.get('sourceText') ?? '')
  const originKind = parseManualCaptureOriginKind(formData.get('originKind'))
  const title = String(formData.get('title') ?? '')
  const originDisplayName = String(formData.get('originDisplayName') ?? '')
  const originAddress = String(formData.get('originAddress') ?? '')
  const originAddressKind = parseAddressKind(String(formData.get('originAddressKind') ?? ''))

  if (!originKind) {
    return { fieldErrors: { originKind: MANUAL_CAPTURE_ORIGIN_KIND_ERROR } }
  }

  const result = await confirmManualCapture({
    store: createSupabaseInboundIntakeStore(),
    agencyId: agencyResult.agency.id,
    actorUserId: user.id,
    capture: {
      sourceText,
      originKind,
      title,
      origin: originFromReviewFields({
        displayName: originDisplayName,
        address: originAddress,
        addressKind: originAddressKind,
      }),
      capturer: {
        displayName: getDisplayName(user) ?? 'Mitarbeiter',
        address: null,
        addressKind: 'other',
      },
    },
  })

  if (!result.success) {
    if (result.error === MANUAL_CAPTURE_EMPTY_ERROR) {
      return { fieldErrors: { sourceText: result.error } }
    }

    if (result.error === MANUAL_CAPTURE_ORIGIN_KIND_ERROR) {
      return { fieldErrors: { originKind: result.error } }
    }

    return { error: result.error }
  }

  revalidatePath('/app/inbox')
  revalidatePath('/app')

  return {
    success: true,
    itemId: result.item.id,
  }
}
